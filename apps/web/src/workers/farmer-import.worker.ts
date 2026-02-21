/**
 * farmer-import.worker.ts
 *
 * Two-phase import worker:
 *
 * Phase 1 (mode = 'stage'):
 *   Parses the XLSX, validates rows, and writes them to the `importStaging`
 *   Dexie table in 500-row chunks. Posts progress events then a final
 *   'staged' event. The preview page then reads staging with pagination.
 *
 * Phase 2 (mode = 'commit'):
 *   Reads all rows from `importStaging`, generates UUIDs, and commits them
 *   to the `farmers` table. Clears staging when done.
 *
 * The main thread never holds the full dataset, preventing renderer crashes.
 */

import * as XLSX from 'xlsx';
import { db } from '../lib/db/schema';
import type { StagingFarmer, StagingError } from '../lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import type { Farmer } from '../lib/types';
import { GHANA_REGIONS_AND_DISTRICTS } from '../lib/data/ghana-regions-districts';

// ── Constants ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 500;

const GHANA_REGION_NAMES = Object.keys(GHANA_REGIONS_AND_DISTRICTS);

/**
 * Flat reverse-lookup: district_lower → region_name.
 * Built once at module load — used to infer region from the sheet name
 * when the region column in the Excel file is empty or invalid.
 */
const DISTRICT_TO_REGION = new Map<string, string>();
for (const [region, districts] of Object.entries(GHANA_REGIONS_AND_DISTRICTS)) {
    for (const d of districts) {
        DISTRICT_TO_REGION.set(d.toLowerCase(), region);
    }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type WorkerMessage =
    | { type: 'progress'; savedSoFar: number; sheet: string }
    | { type: 'staged'; total: number; errorCount: number }
    | { type: 'committed'; saved: number }
    | { type: 'error'; message: string };

export interface SkipError {
    rowIndex: number;
    sheet: string;
    reason: string;
}

// ── Worker error record helpers ───────────────────────────────────────────

/** Generates a readable placeholder name for rows with no name cell. */
function generatePlaceholderName(): string {
    const adj = ['bright', 'calm', 'green', 'swift', 'bold', 'true'];
    const noun = ['field', 'farm', 'seed', 'leaf', 'grove', 'crop'];
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `farmer_${rand(adj)}_${rand(noun)}_${num}`;
}

function normalizeRegion(raw: string): string {
    const lower = raw.toLowerCase().replace(/\s*region\s*$/i, '').trim();
    return GHANA_REGION_NAMES.find(r => r.toLowerCase() === lower) ?? '';
}

/**
 * Strips common noise words from an Excel sheet name to extract the
 * district name candidate.
 *
 * Examples:
 *   "BOGOSO DISTRICT "    → "bogoso"
 *   "SAMREBO DISTRICT-WS" → "samrebo"
 *   "ASSIN FOSU-CR"       → "assin fosu"
 *   "TAMALE METRO"        → "tamale"
 */
function extractDistrictFromSheetName(sheetName: string): string {
    return sheetName
        .toLowerCase()
        // Remove trailing 1-3 letter abbreviations after a dash: -cr, -ws, -ba, -ue …
        .replace(/-[a-z]{1,3}$/i, '')
        // Remove common noise words
        .replace(/\b(district|metro|metropolitan|municipal|assembly|area council|area|council)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Given a candidate district string, tries to find the matching region.
 * First does an exact lookup, then substring fallback.
 */
function findRegionByDistrict(candidate: string): string {
    const lower = candidate.toLowerCase().trim();
    if (!lower) return '';

    // 1. Exact match
    const exact = DISTRICT_TO_REGION.get(lower);
    if (exact) return exact;

    // 2. Substring — candidate is contained in a known district, or vice-versa
    for (const [districtLower, region] of DISTRICT_TO_REGION) {
        if (districtLower.includes(lower) || lower.includes(districtLower)) {
            return region;
        }
    }
    return '';
}

/**
 * Curated overrides for sheet names that are town/community names rather than
 * district names. These can never be resolved by the reverse-district lookup.
 *
 * Key:   cleaned sheet name (lower-case, after extractDistrictFromSheetName)
 * Value: { region, district } — the correct administrative assignment
 *
 * Add new entries here whenever a new edge-case sheet name is discovered.
 */
const SHEET_NAME_OVERRIDES: Record<string, { region: string; district: string }> = {
    // Towns in Central Region
    'assin fosu': { region: 'Central', district: 'Assin Central' },
    'assin fosu cr': { region: 'Central', district: 'Assin Central' },
    'assin north': { region: 'Central', district: 'Assin North' },
    'assin south': { region: 'Central', district: 'Assin South' },
    'saltpond': { region: 'Central', district: 'Mfantsiman' },
    'swedru': { region: 'Central', district: 'Agona West' },

    // Towns in Western Region
    'bogoso': { region: 'Western', district: 'Prestea Huni Valley' },
    'tarkwa': { region: 'Western', district: 'Tarkwa Nsuaem' },
    'samrebo': { region: 'Western', district: 'Nzema East' },
    'axim': { region: 'Western', district: 'Nzema East' },
    'half assini': { region: 'Western', district: 'Jomoro' },
    'elubo': { region: 'Western', district: 'Jomoro' },

    // Towns in Ashanti Region
    'obuasi': { region: 'Ashanti', district: 'Obuasi' },
    'konongo': { region: 'Ashanti', district: 'Asante Akim Central' },

    // Towns in Eastern Region
    'koforidua': { region: 'Eastern', district: 'New Juaben South' },
    'nkawkaw': { region: 'Eastern', district: 'Kwahu West' },
    'mpraeso': { region: 'Eastern', district: 'Kwahu East' },

    // Towns in Volta Region
    'keta': { region: 'Volta', district: 'Keta' },
    'denu': { region: 'Volta', district: 'Ketu South' },
    'aflao': { region: 'Volta', district: 'Ketu South' },

    // Towns in Northern Region
    'tamale': { region: 'Northern', district: 'Tamale Metropolitan' },
    'yendi': { region: 'Northern', district: 'Yendi' },
    'savelugu': { region: 'Northern', district: 'Savelugu' },

    // Towns in Upper East Region
    'bolgatanga': { region: 'Upper East', district: 'Bolgatanga' },
    'navrongo': { region: 'Upper East', district: 'Kassena Nankana' },
    'bawku': { region: 'Upper East', district: 'Bawku' },

    // Towns in Upper West Region
    'wa': { region: 'Upper West', district: 'Wa' },
    'lawra': { region: 'Upper West', district: 'Lawra' },
    'jirapa': { region: 'Upper West', district: 'Jirapa' },
};

/**
 * Full resolution chain for a sheet name → { region, district }.
 * Priority: override map → district reverse-lookup
 */
function resolveFromSheetName(sheetName: string): { region: string; district: string } | null {
    const candidate = extractDistrictFromSheetName(sheetName);
    if (!candidate) return null;

    // 1. Curated override (highest priority — covers town names that aren't district names)
    const override = SHEET_NAME_OVERRIDES[candidate];
    if (override) return override;

    // 2. Reverse district lookup (covers standard "DISTRICT NAME DISTRICT" sheet names)
    const region = findRegionByDistrict(candidate);
    if (region) return { region, district: candidate };

    return null;
}

function col(columnNames: string[], key: string): string {
    return columnNames.find(c => c.toLowerCase().includes(key)) ?? '';
}


// ── Worker ─────────────────────────────────────────────────────────────────

self.addEventListener('message', async (e: MessageEvent<{ mode: 'stage' | 'commit'; buffer?: ArrayBuffer }>) => {
    const { mode, buffer } = e.data;

    try {
        if (mode === 'stage') {
            await stagePhase(buffer!);
        } else {
            await commitPhase();
        }
    } catch (err: any) {
        self.postMessage({ type: 'error', message: err?.message ?? 'Unknown worker error' } satisfies WorkerMessage);
    }
});

// ── Phase 1: Parse → importStaging ────────────────────────────────────────

async function stagePhase(buffer: ArrayBuffer) {
    // Clear any previous staging + error data first
    await Promise.all([db.importStaging.clear(), db.importErrors.clear()]);

    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames.filter(s => s.toLowerCase() !== 'summary');

    let totalStaged = 0;
    let totalErrors = 0;
    let errorChunk: StagingError[] = [];

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        if (rows.length === 0) continue;

        const cols = Object.keys(rows[0]);
        const colMap = {
            name: col(cols, 'name'),
            gender: col(cols, 'gender'),
            age: col(cols, 'age'),
            farmSize: col(cols, 'farm size'),
            region: col(cols, 'region'),
            district: col(cols, 'district'),
            society: col(cols, 'society'),
            community: col(cols, 'community'),
        };

        let chunk: StagingFarmer[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            const name = String(row[colMap.name] ?? '').trim();
            const rawRegion = String(row[colMap.region] ?? '').trim();
            const rawAge = String(row[colMap.age] ?? '').trim();

            // Parse age — any digit sequence in the cell; default to 18 if missing/blank
            const parsedAge = parseInt(rawAge.match(/\d+/)?.[0] ?? '', 10);
            const ageNum = (isNaN(parsedAge) || parsedAge <= 0) ? 18 : parsedAge;

            // 1. Try the explicit region column
            let region = normalizeRegion(rawRegion);
            let district = String(row[colMap.district] ?? '').trim();

            // 2. Fallback: resolve from sheet name via override map OR district reverse-lookup
            if (!region) {
                const resolved = resolveFromSheetName(sheetName);
                if (resolved) {
                    region = resolved.region;
                    // Use the override's canonical district name if none in the row itself
                    if (!district) district = resolved.district;
                }
            }

            // If region OR name is still missing, park in importErrors for manual fix
            if (!region || !name) {
                const errs: string[] = [];
                if (!name) errs.push('Missing name');
                if (!region) errs.push(`Unknown region (sheet: ${sheetName})`);

                errorChunk.push({
                    rowIndex: i + 2,
                    sheet: sheetName,
                    reason: errs.join('; '),
                    rawName: name,
                    rawRegion: rawRegion,
                    rawAge: rawAge,
                    rawGender: String(row[colMap.gender] ?? '').trim(),
                    rawDistrict: district || String(row[colMap.district] ?? '').trim(),
                    rawSociety: String(row[colMap.society] ?? '').trim(),
                    rawCommunity: String(row[colMap.community] ?? '').trim(),
                    rawFarmSize: String(row[colMap.farmSize] ?? '').trim(),
                });
                totalErrors++;

                if (errorChunk.length >= CHUNK_SIZE) {
                    await db.importErrors.bulkAdd(errorChunk);
                    errorChunk = [];
                }
                continue;
            }

            const rawGender = String(row[colMap.gender] ?? '').trim().toLowerCase();
            const gender = rawGender === 'f' || rawGender === 'female' ? 'Female'
                : rawGender === 'm' || rawGender === 'male' ? 'Male' : 'Other';

            chunk.push({
                name: name.toLowerCase(),
                gender,
                age: ageNum,
                region,
                district: district || sheetName,
                society: String(row[colMap.society] ?? '').trim(),
                community: String(row[colMap.community] ?? '').trim(),
                farmSize: parseFloat(String(row[colMap.farmSize] ?? '0')) || 0,
                contact: '',
                educationLevel: 'None',
                cropsGrown: [],

                status: 'Active',
                joinDate: new Date().toISOString().split('T')[0],
            });

            if (chunk.length >= CHUNK_SIZE) {
                await db.importStaging.bulkAdd(chunk);
                totalStaged += chunk.length;
                chunk = [];
                self.postMessage({ type: 'progress', savedSoFar: totalStaged, sheet: sheetName } satisfies WorkerMessage);
            }
        }

        // Flush tail
        if (chunk.length > 0) {
            await db.importStaging.bulkAdd(chunk);
            totalStaged += chunk.length;
            self.postMessage({ type: 'progress', savedSoFar: totalStaged, sheet: sheetName } satisfies WorkerMessage);
        }
    }

    // Flush error tail
    if (errorChunk.length > 0) {
        await db.importErrors.bulkAdd(errorChunk);
    }

    self.postMessage({
        type: 'staged',
        total: totalStaged,
        errorCount: totalErrors,
    } satisfies WorkerMessage);
}

// ── Phase 2: importStaging → farmers ──────────────────────────────────────

async function commitPhase() {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const total = await db.importStaging.count();
    let committed = 0;

    // Process in chunks by offset so we don't load all 63k at once
    while (committed < total) {
        const stagingChunk = await db.importStaging.offset(committed).limit(CHUNK_SIZE).toArray();
        if (stagingChunk.length === 0) break;

        const farmers: Farmer[] = stagingChunk.map(s => ({
            id: uuidv4(),
            name: s.name,
            gender: s.gender as Farmer['gender'],
            age: s.age,
            region: s.region,
            district: s.district,
            society: s.society,
            community: s.community,
            farmSize: s.farmSize,
            contact: s.contact,
            educationLevel: s.educationLevel as Farmer['educationLevel'],
            cropsGrown: s.cropsGrown,
            status: s.status as Farmer['status'],
            joinDate: s.joinDate || today,
            createdAt: now,
            updatedAt: now,
        }));

        await db.farmers.bulkPut(farmers);
        committed += stagingChunk.length;
        self.postMessage({ type: 'progress', savedSoFar: committed, sheet: 'committing' } satisfies WorkerMessage);
    }

    // Clean up staging
    await db.importStaging.clear();

    self.postMessage({ type: 'committed', saved: committed } satisfies WorkerMessage);
}
