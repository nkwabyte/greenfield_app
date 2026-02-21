import * as XLSX from 'xlsx';
import { db } from '../lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import type { Farmer, FarmerGroup } from '../lib/types';

export interface ParseStats {
    totalRows: number;
    newGroups: number;
    newFarmers: number;
    updatedFarmers: number;
    errors: string[];
}

self.addEventListener('message', async (e: MessageEvent) => {
    try {
        const { data } = e; // this should be the ArrayBuffer
        const stats: ParseStats = { totalRows: 0, newGroups: 0, newFarmers: 0, updatedFarmers: 0, errors: [] };

        self.postMessage({ type: 'progress', message: 'Reading file data...' });
        const workbook = XLSX.read(data, { type: 'array' });

        // Fetch existing records for matching
        self.postMessage({ type: 'progress', message: 'Fetching existing database records...' });

        // IndexedDB is fully available in Web Workers
        const existingGroups = await db.farmerGroups.toArray();
        const existingFarmers = await db.farmers.toArray();

        const farmersToPut: Farmer[] = [];
        const groupsToPut: FarmerGroup[] = [];

        for (let i = 0; i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json<any[][]>(worksheet, { header: 1 });

            if (rawData.length < 10) continue; // Skip empty/summary sheets

            self.postMessage({ type: 'progress', message: `Processing sheet: ${sheetName}` });

            // 1. Find Context (Region, District, Society)
            let region = '';
            let district = '';
            let society = '';

            for (let r = 0; r < 20; r++) {
                const row = rawData[r] || [];
                const textRow = row.join(' ').toLowerCase();

                if (textRow.includes('region:')) {
                    const idx = row.findIndex(c => String(c).toLowerCase().includes('region:'));
                    if (idx !== -1) {
                        region = (row[idx + 1] || row[idx].toString().split(':')[1] || '').toString().trim();
                    }
                }
                if (textRow.includes('district:')) {
                    const idx = row.findIndex(c => String(c).toLowerCase().includes('district:'));
                    if (idx !== -1) {
                        district = (row[idx + 1] || row[idx].toString().split(':')[1] || '').toString().trim();
                    }
                }
                if (textRow.includes('society:')) {
                    const idx = row.findIndex(c => String(c).toLowerCase().includes('society:'));
                    if (idx !== -1) {
                        society = (row[idx + 1] || row[idx].toString().split(':')[1] || '').toString().trim();
                    }
                }
            }

            if (!society) society = sheetName;
            if (!region) region = 'Unknown Region';
            if (!district) district = 'Unknown District';

            // 2. Resolve Group ID
            let groupId: string;
            const existingGroup = existingGroups.find(g =>
                g.name.toLowerCase() === society.toLowerCase() &&
                g.district.toLowerCase() === district.toLowerCase()
            );

            if (existingGroup) {
                groupId = existingGroup.id;
            } else {
                groupId = uuidv4();
                const newGroup: FarmerGroup = {
                    id: groupId,
                    name: society,
                    region: region,
                    district: district,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                groupsToPut.push(newGroup);
                existingGroups.push(newGroup);
                stats.newGroups++;
            }

            // 3. Find Table Header Row
            let headerRowIndex = -1;
            for (let r = 0; r < 30; r++) {
                const row = rawData[r] || [];
                const textRow = row.join(' ').toLowerCase();
                if (textRow.includes('farmer name') || textRow.includes('mobile no')) {
                    headerRowIndex = r;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                stats.errors.push(`Could not find table headers in sheet ${sheetName}`);
                continue;
            }

            // 4. Process Farmers
            const nameColIdx = rawData[headerRowIndex].findIndex(c => String(c).toLowerCase().includes('name'));
            const phoneColIdx = rawData[headerRowIndex].findIndex(c => String(c).toLowerCase().includes('mobile') || String(c).toLowerCase().includes('phone'));

            if (nameColIdx === -1) {
                stats.errors.push(`Could not find Name column in sheet ${sheetName}`);
                continue;
            }

            for (let r = headerRowIndex + 2; r < rawData.length; r++) {
                const row = rawData[r] || [];
                const name = (row[nameColIdx] || '').toString().trim();
                const phone = phoneColIdx !== -1 ? (row[phoneColIdx] || '').toString().trim() : '';

                if (!name || name.toLowerCase() === 'total payment') continue;

                stats.totalRows++;

                let matchedFarmer = existingFarmers.find(f => {
                    if (phone && f.contact === phone) return true;
                    if (f.name.toLowerCase() === name.toLowerCase() && f.district?.toLowerCase() === district.toLowerCase()) return true;
                    return false;
                });

                if (matchedFarmer) {
                    if (matchedFarmer.groupId !== groupId) {
                        matchedFarmer.groupId = groupId;
                        matchedFarmer.updatedAt = new Date().toISOString();
                        farmersToPut.push(matchedFarmer);
                        stats.updatedFarmers++;
                    }
                } else {
                    const newFarmer: Farmer = {
                        id: uuidv4(),
                        name: name,
                        contact: phone || undefined,
                        region: region,
                        district: district,
                        society: society,
                        groupId: groupId,
                        status: 'Active',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    farmersToPut.push(newFarmer);
                    existingFarmers.push(newFarmer);
                    stats.newFarmers++;
                }
            }
        }

        // 5. Batch Insert everything
        self.postMessage({ type: 'progress', message: `Saving ${groupsToPut.length} groups and ${farmersToPut.length} farmers to database...` });

        if (groupsToPut.length > 0) {
            await db.farmerGroups.bulkPut(groupsToPut);
        }
        if (farmersToPut.length > 0) {
            await db.farmers.bulkPut(farmersToPut);
        }

        self.postMessage({ type: 'complete', payload: stats });

    } catch (error: any) {
        self.postMessage({ type: 'error', message: error.message || 'Failed to process Excel file.' });
    }
});
