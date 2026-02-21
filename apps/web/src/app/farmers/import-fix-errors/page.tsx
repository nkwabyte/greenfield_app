'use client';

/**
 * /farmers/import-fix-errors
 *
 * Shows all rows that the import worker could not resolve (missing region or
 * missing name). Users can:
 *
 * - Select a region for all rows from a given sheet in one click ("Apply to all")
 * - Then pick the correct district from a cascading dropdown per row
 * - Edit or regenerate the auto-generated placeholder name for nameless rows
 * - Accept fixed rows (moves them → importStaging) or discard them permanently
 *
 * After fixing, navigate back to the preview page to see the updated counts.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    CheckCircle2,
    RefreshCw,
    Trash2,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    Layers,
    Loader2,
} from 'lucide-react';
import { GHANA_REGION_NAMES, GHANA_REGIONS_AND_DISTRICTS, getDistrictsForRegion } from '@/lib/data/ghana-regions-districts';
import { db, type StagingError, type StagingFarmer } from '@/lib/db/schema';

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ── Helpers ────────────────────────────────────────────────────────────────

function generatePlaceholderName(): string {
    const adj = ['bright', 'calm', 'green', 'swift', 'bold', 'true'];
    const noun = ['field', 'farm', 'seed', 'leaf', 'grove', 'crop'];
    const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `farmer_${rand(adj)}_${rand(noun)}_${num}`;
}

// ── Row editor state type ──────────────────────────────────────────────────

interface EditableErrorRow extends StagingError {
    editedName: string;
    editedRegion: string;
    editedDistrict: string;
}

function toEditable(row: StagingError): EditableErrorRow {
    const needsName = !row.rawName;
    return {
        ...row,
        editedName: needsName ? generatePlaceholderName() : row.rawName,
        editedRegion: row.rawRegion || '',
        editedDistrict: row.rawDistrict || '',
    };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ImportFixErrorsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [pageIndex, setPageIndex] = React.useState(0);
    const [rows, setRows] = React.useState<EditableErrorRow[]>([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [accepting, setAccepting] = React.useState<Set<number | string>>(new Set());

    // Per-sheet bulk region + district selection
    const [sheetRegions, setSheetRegions] = React.useState<Record<string, string>>({});
    const [sheetDistricts, setSheetDistricts] = React.useState<Record<string, string>>({});

    const pageCount = Math.ceil(totalCount / PAGE_SIZE);

    // ── Load page ────────────────────────────────────────────────────────────

    const loadPage = React.useCallback(async (page: number) => {
        const [chunk, count] = await Promise.all([
            db.importErrors.offset(page * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
            db.importErrors.count(),
        ]);
        setRows(chunk.map(toEditable));
        setTotalCount(count);
    }, []);

    React.useEffect(() => { loadPage(0); }, [loadPage]);
    React.useEffect(() => { loadPage(pageIndex); }, [pageIndex, loadPage]);

    // ── Field updates ────────────────────────────────────────────────────────

    const updateRow = (id: number, patch: Partial<EditableErrorRow>) => {
        setRows(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));
    };

    // Apply a region (and clear district) to ALL rows on the same sheet
    const applyRegionToSheet = (sheetName: string, region: string) => {
        setSheetRegions(prev => ({ ...prev, [sheetName]: region }));
        setSheetDistricts(prev => { const n = { ...prev }; delete n[sheetName]; return n; });
        setRows(prev => prev.map(r =>
            r.sheet === sheetName
                ? { ...r, editedRegion: region, editedDistrict: '' }
                : r
        ));
    };

    // Apply a district to ALL rows on the same sheet
    const applyDistrictToSheet = (sheetName: string, district: string) => {
        setSheetDistricts(prev => ({ ...prev, [sheetName]: district }));
        setRows(prev => prev.map(r =>
            r.sheet === sheetName
                ? { ...r, editedDistrict: district }
                : r
        ));
    };

    // ── Accept a row (move to staging) ───────────────────────────────────────

    const acceptRow = async (row: EditableErrorRow) => {
        if (!row.editedName.trim()) {
            toast({ title: 'Name required', description: 'Please enter or generate a name.', variant: 'destructive' });
            return;
        }
        if (!row.editedRegion) {
            toast({ title: 'Region required', description: 'Select a region first.', variant: 'destructive' });
            return;
        }

        setAccepting(prev => new Set(prev).add(row._id!));

        const parsedAge = parseInt((row.rawAge ?? '').match(/\d+/)?.[0] ?? '', 10);
        const ageNum = (isNaN(parsedAge) || parsedAge <= 0) ? 18 : parsedAge;
        const rawGender = (row.rawGender ?? '').toLowerCase();
        const gender = rawGender === 'f' || rawGender === 'female' ? 'Female'
            : rawGender === 'm' || rawGender === 'male' ? 'Male' : 'Other';

        const staged: StagingFarmer = {
            name: row.editedName.toLowerCase().trim(),
            gender,
            age: ageNum,
            region: row.editedRegion,
            district: row.editedDistrict || row.sheet,
            society: row.rawSociety || '',
            community: row.rawCommunity || '',
            farmSize: parseFloat(row.rawFarmSize || '0') || 0,
            contact: '',
            educationLevel: 'None',
            cropsGrown: [],
            status: 'Active',
            joinDate: new Date().toISOString().split('T')[0],
        };

        await db.importStaging.add(staged);
        await db.importErrors.delete(row._id!);

        setRows(prev => prev.filter(r => r._id !== row._id));
        setTotalCount(c => c - 1);
        setAccepting(prev => { const s = new Set(prev); s.delete(row._id!); return s; });
    };

    // ── Discard a row permanently ─────────────────────────────────────────────

    const discardRow = async (row: EditableErrorRow) => {
        await db.importErrors.delete(row._id!);
        setRows(prev => prev.filter(r => r._id !== row._id));
        setTotalCount(c => c - 1);
    };

    // Accept all rows on the current page that have region set
    const acceptAll = async () => {
        const ready = rows.filter(r => r.editedRegion && r.editedName.trim());
        for (const r of ready) await acceptRow(r);
        toast({ title: `${ready.length} rows accepted`, description: 'They are now in the staging table.' });
    };

    // ── Accept an entire sheet (all rows in DB, bypassing pagination) ───────

    const acceptAllForSheet = async (sheetName: string) => {
        const region = sheetRegions[sheetName];
        if (!region) return;
        const district = sheetDistricts[sheetName] || sheetName;

        setAccepting(prev => new Set(prev).add(`sheet-${sheetName}`));

        try {
            // Fetch all error rows for this sheet directly from Dexie
            const sheetRows = await db.importErrors.where('sheet').equals(sheetName).toArray();
            if (!sheetRows.length) return;

            const stagedRows: StagingFarmer[] = sheetRows.map(row => {
                const needsName = !row.rawName;
                const name = needsName ? generatePlaceholderName() : row.rawName;

                const parsedAge = parseInt((row.rawAge ?? '').match(/\d+/)?.[0] ?? '', 10);
                const ageNum = (isNaN(parsedAge) || parsedAge <= 0) ? 18 : parsedAge;
                const rawGender = (row.rawGender ?? '').toLowerCase();
                const gender = rawGender === 'f' || rawGender === 'female' ? 'Female'
                    : rawGender === 'm' || rawGender === 'male' ? 'Male' : 'Other';

                return {
                    name: name.toLowerCase().trim(),
                    gender,
                    age: ageNum,
                    region,
                    district,
                    society: row.rawSociety || '',
                    community: row.rawCommunity || '',
                    farmSize: parseFloat(row.rawFarmSize || '0') || 0,
                    contact: '',
                    educationLevel: 'None',
                    cropsGrown: [],
                    status: 'Active',
                    joinDate: new Date().toISOString().split('T')[0],
                };
            });

            await db.importStaging.bulkAdd(stagedRows);
            await db.importErrors.bulkDelete(sheetRows.map(r => r._id!));

            // Remove these from local state
            setRows(prev => prev.filter(r => r.sheet !== sheetName));
            setTotalCount(c => c - sheetRows.length);

            toast({ title: `${sheetRows.length} rows fixed!`, description: `All rows from ${sheetName} accepted.` });
        } finally {
            setAccepting(prev => { const s = new Set(prev); s.delete(`sheet-${sheetName}`); return s; });
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    // Unique sheets on the current page
    const sheetsOnPage = [...new Set(rows.map(r => r.sheet))];

    return (
        <AppShell>
            <PageHeader
                title="Fix Import Errors"
                description="Assign the correct region and district before accepting these rows into the import."
            >
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="destructive" className="gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {totalCount.toLocaleString()} rows need attention
                    </Badge>
                    <div className="ml-auto flex gap-2">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Preview
                        </Button>
                        <Button
                            onClick={acceptAll}
                            disabled={rows.every(r => !r.editedRegion)}
                            className="gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept All on Page
                        </Button>
                    </div>
                </div>
            </PageHeader>

            {/* ── Per-sheet bulk region + district picker ── */}
            {sheetsOnPage.length > 0 && (
                <div className="mb-4 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        Apply region &amp; district to all rows from a sheet at once
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sheetsOnPage.map(sheet => {
                            const selectedRegion = sheetRegions?.[sheet] ?? '';
                            const selectedDistrict = sheetDistricts?.[sheet] ?? '';
                            const districtOpts = selectedRegion
                                ? getDistrictsForRegion(selectedRegion)
                                : [];

                            return (
                                <div key={sheet} className="flex flex-col gap-1.5 bg-background rounded-md border px-3 py-2">
                                    <span
                                        className="text-xs font-mono text-muted-foreground truncate"
                                        title={sheet}
                                    >
                                        {sheet}
                                    </span>
                                    <div className="flex gap-1.5">
                                        {/* Region picker */}
                                        <Select
                                            value={selectedRegion}
                                            onValueChange={v => applyRegionToSheet(sheet, v)}
                                        >
                                            <SelectTrigger className="h-7 text-xs flex-1">
                                                <SelectValue placeholder="Region…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GHANA_REGION_NAMES.map(r => (
                                                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* District picker — only shown once a region is selected */}
                                        {selectedRegion && (
                                            <>
                                                <Select
                                                    value={selectedDistrict}
                                                    onValueChange={v => applyDistrictToSheet(sheet, v)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs flex-1">
                                                        <SelectValue placeholder="District…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {districtOpts.map(d => (
                                                            <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {/* Accept ALL rows in this sheet immediately */}
                                                <Button
                                                    size="sm"
                                                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                    disabled={accepting.has(`sheet-${sheet}`)}
                                                    onClick={() => acceptAllForSheet(sheet)}
                                                    title="Accept all rows in this sheet"
                                                >
                                                    {accepting.has(`sheet-${sheet}`) ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Error row table ── */}
            <div className="rounded-md border overflow-hidden overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-[1.8fr_1fr_0.6fr_1.3fr_1.3fr_2rem_2rem] bg-muted/60 text-xs font-semibold text-muted-foreground border-b min-w-[750px] px-1">
                    {['Name', 'Region', 'District', 'Sheet / Error', '', '', ''].map((h, i) => (
                        <div key={i} className="py-2.5 px-2">{h}</div>
                    ))}
                </div>

                {/* Rows */}
                <div className="min-w-[750px]">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <CheckCircle2 className="h-10 w-10 text-green-500 opacity-70" />
                            <p className="text-sm font-medium">All errors resolved!</p>
                            <Button variant="outline" size="sm" onClick={() => router.back()}>
                                Back to Preview
                            </Button>
                        </div>
                    ) : rows.map((row, idx) => {
                        const districtOpts = row.editedRegion
                            ? getDistrictsForRegion(row.editedRegion).map(d => ({ value: d, label: d }))
                            : [];
                        const isMissingName = !row.rawName;
                        const isMissingRegion = !row.rawRegion;
                        const isAccepting = accepting.has(row._id!);
                        const canAccept = !!row.editedRegion && !!row.editedName.trim();

                        return (
                            <div
                                key={row._id}
                                className={`grid grid-cols-[1.8fr_1fr_0.6fr_1.3fr_1.3fr_2rem_2rem] items-center border-b last:border-0 transition-colors px-1 ${idx % 2 !== 0 ? 'bg-muted/10' : ''} ${canAccept ? '' : 'opacity-80'}`}
                            >
                                {/* Name */}
                                <div className="py-1 px-2">
                                    <div className="flex items-center gap-1">
                                        <Input
                                            value={row.editedName}
                                            onChange={e => updateRow(row._id!, { editedName: e.target.value })}
                                            placeholder="Enter name…"
                                            className={`h-8 px-2 text-xs border bg-transparent rounded w-full ${isMissingName ? 'border-amber-400 focus:border-amber-500' : 'border-transparent hover:border-input focus:border-input'}`}
                                        />
                                        {isMissingName && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Generate new placeholder name"
                                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => updateRow(row._id!, { editedName: generatePlaceholderName() })}
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Region */}
                                <div className="py-1 px-2">
                                    <Select
                                        value={row.editedRegion}
                                        onValueChange={v => updateRow(row._id!, { editedRegion: v, editedDistrict: '' })}
                                    >
                                        <SelectTrigger className={`h-8 px-2 text-xs w-full ${isMissingRegion ? 'border-amber-400' : 'border-transparent hover:border-input'}`}>
                                            <SelectValue placeholder="Select region…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GHANA_REGION_NAMES.map(r => (
                                                <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* District */}
                                <div className="py-1 px-2">
                                    {districtOpts.length > 0 ? (
                                        <Select
                                            value={row.editedDistrict}
                                            onValueChange={v => updateRow(row._id!, { editedDistrict: v })}
                                        >
                                            <SelectTrigger className="h-8 px-2 text-xs border-transparent hover:border-input w-full">
                                                <SelectValue placeholder="District…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districtOpts.map(d => (
                                                    <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            value={row.editedDistrict}
                                            onChange={e => updateRow(row._id!, { editedDistrict: e.target.value })}
                                            placeholder="District…"
                                            className="h-8 px-2 text-xs border-transparent hover:border-input focus:border-input bg-transparent rounded w-full"
                                        />
                                    )}
                                </div>

                                {/* Sheet / Error info */}
                                <div className="py-1 px-2 col-span-2">
                                    <p className="text-xs font-mono text-muted-foreground truncate" title={row.sheet}>{row.sheet}</p>
                                    <p className="text-[10px] text-destructive/80 mt-0.5 leading-tight">{row.reason}</p>
                                </div>

                                {/* Accept */}
                                <div className="py-1 flex items-center justify-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title={canAccept ? 'Accept this row' : 'Fix name and region first'}
                                        disabled={!canAccept || isAccepting}
                                        className="h-7 w-7 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-30"
                                        onClick={() => acceptRow(row)}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {/* Discard */}
                                <div className="py-1 flex items-center justify-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Discard — exclude this row from import"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => discardRow(row)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Pagination ── */}
            {pageCount > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-muted-foreground">
                        Page {pageIndex + 1} of {pageCount} · {totalCount.toLocaleString()} rows remaining
                    </span>
                    <div className="flex gap-1">
                        <Button
                            variant="outline" size="icon"
                            onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                            disabled={pageIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline" size="icon"
                            onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))}
                            disabled={pageIndex >= pageCount - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
