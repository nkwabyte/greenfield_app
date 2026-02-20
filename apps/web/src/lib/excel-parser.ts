import * as XLSX from 'xlsx';
import { db } from './db/schema';
import { v4 as uuidv4 } from 'uuid';
import { Farmer, FarmerGroup } from './types';

export interface ParseStats {
    totalRows: number;
    newGroups: number;
    newFarmers: number;
    updatedFarmers: number;
    errors: string[];
}

export async function parseFarmerGroupsExcel(file: File, onProgress: (msg: string) => void): Promise<ParseStats> {
    const stats: ParseStats = { totalRows: 0, newGroups: 0, newFarmers: 0, updatedFarmers: 0, errors: [] };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Fetch existing records for matching
                onProgress("Fetching existing database records...");
                const existingGroups = await db.farmerGroups.toArray();
                const existingFarmers = await db.farmers.toArray();

                const farmersToPut: Farmer[] = [];
                const groupsToPut: FarmerGroup[] = [];

                // Process each sheet (excluding first summary sheet if it exists, usually sheet 1 or 2 contains the data)
                for (let i = 0; i < workbook.SheetNames.length; i++) {
                    const sheetName = workbook.SheetNames[i];

                    // The first sheet is often a summary, check if it looks like data
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json<any[][]>(worksheet, { header: 1 });

                    if (rawData.length < 10) continue; // Skip empty/summary sheets

                    onProgress(`Processing sheet: ${sheetName}`);

                    // 1. Find Context (Region, District, Society)
                    let region = '';
                    let district = '';
                    let society = '';

                    for (let r = 0; r < 20; r++) {
                        const row = rawData[r] || [];
                        const textRow = row.join(' ').toLowerCase();

                        if (textRow.includes('region:')) {
                            // Find the cell containing the value (usually next to or in the same cell)
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

                    // Fallbacks if missing
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
                        existingGroups.push(newGroup); // for subsequent matches
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

                    for (let r = headerRowIndex + 2; r < rawData.length; r++) { // Skip sub-headers
                        const row = rawData[r] || [];
                        const name = (row[nameColIdx] || '').toString().trim();
                        const phone = phoneColIdx !== -1 ? (row[phoneColIdx] || '').toString().trim() : '';

                        if (!name || name.toLowerCase() === 'total payment') continue; // Skip empty rows or footer

                        stats.totalRows++;

                        // Matching Logic
                        let matchedFarmer = existingFarmers.find(f => {
                            // 1. Exact Phone Match
                            if (phone && f.contact === phone) return true;
                            // 2. Exact Name + District Match (fuzzy)
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
                            existingFarmers.push(newFarmer); // for subsequent matches
                            stats.newFarmers++;
                        }
                    }
                }

                // 5. Batch Insert everything
                onProgress(`Saving ${groupsToPut.length} groups and ${farmersToPut.length} farmers to database...`);

                if (groupsToPut.length > 0) {
                    await db.farmerGroups.bulkPut(groupsToPut);
                }
                if (farmersToPut.length > 0) {
                    await db.farmers.bulkPut(farmersToPut);
                }

                onProgress("Import complete!");
                resolve(stats);
            } catch (error) {
                console.error("Excel parse error:", error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
    });
}
