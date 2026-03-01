'use client';

import * as React from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { SyncQueueItem } from '@/lib/db/types';
import { GHANA_REGION_NAMES, GHANA_REGIONS_AND_DISTRICTS } from '@/lib/data/ghana-regions-districts';
import { ArrowLeft, Save, Undo2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { deleteFarmer } from '@/lib/db/services/farmers';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function BulkFixesPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [pageIndex, setPageIndex] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(100);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [bulkRegion, setBulkRegion] = React.useState<string>('all');
    const [issueFilter, setIssueFilter] = React.useState<string>('all');
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

    // This query pulls farmers; we only keep a local editable state for the current page
    const rawFarmers = useLiveQuery(
        () => db.farmers.orderBy('name').toArray(),
        []
    );

    const filteredFarmers = React.useMemo(() => {
        if (!rawFarmers) return [];
        let filtered = rawFarmers;
        const lowSearch = searchTerm.toLowerCase();

        if (lowSearch) {
            filtered = filtered.filter(f =>
                f.name.toLowerCase().includes(lowSearch) ||
                (f.society && f.society.toLowerCase().includes(lowSearch)) ||
                (f.region && f.region.toLowerCase().includes(lowSearch)) ||
                (f.district && f.district.toLowerCase().includes(lowSearch))
            );
        }

        if (bulkRegion !== 'all') {
            filtered = filtered.filter(f => f.region === bulkRegion);
        }

        if (issueFilter === 'missing_region') {
            filtered = filtered.filter(f => !f.region || f.region.trim() === '');
        } else if (issueFilter === 'missing_district') {
            filtered = filtered.filter(f => !f.district || f.district.trim() === '');
        } else if (issueFilter === 'missing_any') {
            filtered = filtered.filter(f => !f.region || !f.district || f.region.trim() === '' || f.district.trim() === '');
        } else if (issueFilter === 'possible_duplicates') {
            const nameCounts: Record<string, number> = {};
            rawFarmers.forEach(f => {
                const norm = f.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
                if (norm) nameCounts[norm] = (nameCounts[norm] || 0) + 1;
            });

            const duplicateNames = new Set<string>();
            Object.entries(nameCounts).forEach(([norm, count]) => {
                if (count > 1) duplicateNames.add(norm);
            });

            filtered = filtered.filter(f => {
                const norm = f.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
                return duplicateNames.has(norm);
            });

            // Sort to cluster duplicates together
            filtered.sort((a, b) => {
                const normA = a.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
                const normB = b.name.toLowerCase().replace(/[^a-z0-9]/gi, '');
                if (normA === normB) {
                    // Tie-breaker by original name or ID
                    return a.name.localeCompare(b.name);
                }
                return normA.localeCompare(normB);
            });
        }

        return filtered;
    }, [rawFarmers, searchTerm, bulkRegion, issueFilter]);

    const pageCount = Math.ceil(filteredFarmers.length / pageSize);
    const currentPageData = React.useMemo(() => {
        const start = pageIndex * pageSize;
        return filteredFarmers.slice(start, start + pageSize);
    }, [filteredFarmers, pageIndex, pageSize]);

    // Track local edits
    const [localEdits, setLocalEdits] = React.useState<Record<string, {
        name?: string;
        region: string;
        district: string;
        society: string;
    }>>({});

    // Checkbox selection
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // Mass edit ribbon states
    const [massRegion, setMassRegion] = React.useState('none');
    const [massDistrict, setMassDistrict] = React.useState('none');
    const [massSociety, setMassSociety] = React.useState('');


    const handleToggleAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(currentPageData.map(f => f.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleToggleOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleApplyMassEdits = () => {
        if (selectedIds.size === 0) return;
        const newEdits = { ...localEdits };

        selectedIds.forEach(id => {
            const farmer = currentPageData.find(f => f.id === id);
            if (!farmer) return;

            // Start with what exists (either an existing local edit or the original value)
            const currentEdit = newEdits[id] || {
                region: farmer.region,
                district: farmer.district,
                society: farmer.society || '',
            };

            if (massRegion !== 'none') currentEdit.region = massRegion;

            // If they changed the mass region, but didn't pick a district, we have to clear the district
            if (massRegion !== 'none' && massDistrict === 'none' && massRegion !== farmer.region) {
                currentEdit.district = '';
            } else if (massDistrict !== 'none') {
                currentEdit.district = massDistrict;
            }

            if (massSociety.trim() !== '') currentEdit.society = massSociety;

            newEdits[id] = currentEdit;
        });

        setLocalEdits(newEdits);

        // Reset mass edit bar inputs
        setMassRegion('none');
        setMassDistrict('none');
        setMassSociety('');

        toast({
            title: 'Edits Staged',
            description: `Staged updates for ${selectedIds.size} records. Click Save to commit.`,
        });
    };

    const handleInlineEdit = (id: string, field: 'name' | 'region' | 'district' | 'society', value: string) => {
        const farmer = currentPageData.find(f => f.id === id);
        if (!farmer) return;

        const currentEdit = localEdits[id] || {
            name: farmer.name,
            region: farmer.region,
            district: farmer.district,
            society: farmer.society || '',
        };

        const updated = { ...currentEdit, [field]: value };
        if (field === 'region') updated.district = ''; // cascade clear district

        setLocalEdits({ ...localEdits, [id]: updated });
    };


    const handleSave = async () => {
        const uncommittedIds = Object.keys(localEdits);
        if (uncommittedIds.length === 0) return;

        const farmersToSave = [];
        const syncItems: SyncQueueItem[] = [];

        for (const id of uncommittedIds) {
            const original = rawFarmers?.find(f => f.id === id);
            if (!original) continue;

            const edit = localEdits[id];

            // Generate exact copy with new values and new timestamp
            const updatedFarmer = { ...original, ...edit, updatedAt: new Date().toISOString() };
            farmersToSave.push(updatedFarmer);

            syncItems.push({
                entityType: 'farmer',
                entityId: id,
                operation: 'update',
                data: updatedFarmer,
                timestamp: Date.now(),
                synced: 0,
                retryCount: 0,
                status: 'pending'
            });
        }

        try {
            await Promise.all([
                db.farmers.bulkPut(farmersToSave),
                db.syncQueue.bulkAdd(syncItems)
            ]);

            setLocalEdits({});
            setSelectedIds(new Set()); // clear selections
            toast({ title: 'Success', description: `Saved and queued ${farmersToSave.length} records for sync.` });
        } catch (e: any) {
            toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        try {
            const promises = Array.from(selectedIds).map(id => deleteFarmer(id));
            await Promise.all(promises);

            // Clear selections and edits for these deleted rows
            const newEdits = { ...localEdits };
            selectedIds.forEach(id => delete newEdits[id]);
            setLocalEdits(newEdits);
            setSelectedIds(new Set());

            toast({ title: 'Deleted', description: `Successfully queued ${promises.length} records for deletion.` });
        } catch (e: any) {
            toast({ title: 'Delete Failed', description: e.message, variant: 'destructive' });
        }
    };


    const massDistrictOptions = massRegion !== 'none'
        ? (GHANA_REGIONS_AND_DISTRICTS[massRegion] ?? []).map(d => ({ value: d, label: d }))
        : [];


    return (
        <AppShell>
            <PageHeader
                title="Bulk Data Fixes"
                description="Align regions, districts, and communities across your database to correct import errors."
            >
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button variant="outline" onClick={() => router.push('/farmers')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
                    </Button>
                    <div className="ml-auto flex gap-2">
                        {Object.keys(localEdits).length > 0 && (
                            <Button variant="outline" onClick={() => setLocalEdits({})} className="text-destructive border-destructive/20 hover:bg-destructive/10">
                                <Undo2 className="mr-2 h-4 w-4" /> Discard ({Object.keys(localEdits).length})
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={Object.keys(localEdits).length === 0}
                            className="bg-primary hover:bg-primary/90"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save {Object.keys(localEdits).length > 0 ? Object.keys(localEdits).length : ''} Changes
                        </Button>
                    </div>
                </div>
            </PageHeader>

            {/* Mass Edit Ribbon */}
            <div className="bg-muted/40 border border-primary/20 rounded-lg p-4 mb-4 flex flex-col md:flex-row items-end gap-3 shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">With selected ({selectedIds.size}):</p>
                    <Select value={massRegion} onValueChange={(v) => { setMassRegion(v); setMassDistrict('none'); }}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Set Region..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Don't Change Region --</SelectItem>
                            {GHANA_REGION_NAMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <Select value={massDistrict} onValueChange={setMassDistrict} disabled={massRegion === 'none' && massDistrictOptions.length === 0}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Set District..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">-- Don't Change District --</SelectItem>
                            {massDistrictOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <Input placeholder="Set Society..." value={massSociety} onChange={e => setMassSociety(e.target.value)} className="bg-background" />
                </div>
                <Button variant="secondary" onClick={handleApplyMassEdits} disabled={selectedIds.size === 0} className="font-semibold text-primary hover:text-primary">
                    Apply to {selectedIds.size} Rows
                </Button>
                <div className="flex-1"></div>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={selectedIds.size === 0} className="font-semibold">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete {selectedIds.size > 0 && selectedIds.size}
                </Button>
            </div>


            {/* Filtering Ribbon */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Input
                    placeholder="Search by name, district, society..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPageIndex(0); }}
                    className="max-w-xs bg-background"
                />
                <Select value={bulkRegion} onValueChange={v => { setBulkRegion(v); setPageIndex(0); }}>
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Filter Region" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {GHANA_REGION_NAMES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={issueFilter} onValueChange={v => { setIssueFilter(v); setPageIndex(0); }}>
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="All Issues" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Records</SelectItem>
                        <SelectItem value="missing_any">Any Missing Data</SelectItem>
                        <SelectItem value="missing_region">Missing Region</SelectItem>
                        <SelectItem value="missing_district">Missing District</SelectItem>
                        <SelectItem value="possible_duplicates">Possible Duplicates</SelectItem>
                    </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">
                    Showing {filteredFarmers.length.toLocaleString()} records
                </div>
            </div>


            <div className="rounded-md border overflow-hidden overflow-x-auto bg-card">
                <div className="grid grid-cols-[3rem_1.5fr_1.5fr_1.5fr_1.5fr] bg-muted/60 text-xs font-semibold text-muted-foreground border-b min-w-[900px]">
                    <div className="py-2.5 px-3 flex items-center justify-center">
                        <Checkbox
                            checked={currentPageData.length > 0 && selectedIds.size === currentPageData.length}
                            onCheckedChange={handleToggleAll}
                        />
                    </div>
                    <div className="py-2.5 px-3">Farmer Name</div>
                    <div className="py-2.5 px-3">Region</div>
                    <div className="py-2.5 px-3">District</div>
                    <div className="py-2.5 px-3">Society</div>
                </div>

                <div className="min-w-[900px]">
                    {currentPageData.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-sm">No records found.</div>
                    ) : (
                        currentPageData.map((row, idx) => {
                            const isSelected = selectedIds.has(row.id);
                            const editState = localEdits[row.id];
                            const isEdited = !!editState;

                            // active values are either the edited values OR the original DB values
                            const activeName = editState && editState.name !== undefined ? editState.name : row.name;
                            const activeRegion = editState ? editState.region : (row.region || '');
                            const activeDistrict = editState ? editState.district : (row.district || '');
                            const activeSociety = editState ? editState.society : (row.society || '');

                            // Dynamic districts for inline dropdown
                            const curDistrictOptions = activeRegion ? (GHANA_REGIONS_AND_DISTRICTS[activeRegion] ?? []).map((d: string) => ({ value: d, label: d })) : [];

                            return (
                                <div
                                    key={row.id}
                                    className={`grid grid-cols-[3rem_1.5fr_1.5fr_1.5fr_1.5fr] items-center border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 !== 0 ? 'bg-muted/10' : ''} ${isEdited ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="py-1 px-3 flex items-center justify-center relative">
                                        {isEdited && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}
                                        <Checkbox checked={isSelected} onCheckedChange={() => handleToggleOne(row.id)} />
                                    </div>
                                    <div className="py-2 px-2 text-sm font-medium flex items-center gap-1">
                                        <Input
                                            value={activeName}
                                            onChange={e => handleInlineEdit(row.id, 'name', e.target.value)}
                                            className="h-8 px-2 text-xs border-transparent hover:border-input bg-transparent w-full font-medium"
                                        />
                                        {isEdited && <Badge variant="outline" className="text-[10px] h-4 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">Staged</Badge>}
                                    </div>

                                    <div className="py-1 px-2">
                                        <Select value={activeRegion || ''} onValueChange={v => handleInlineEdit(row.id, 'region', v)}>
                                            <SelectTrigger className="h-8 px-2 text-xs border-transparent hover:border-input bg-transparent w-full">
                                                <SelectValue placeholder="—" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {GHANA_REGION_NAMES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="py-1 px-2">
                                        {curDistrictOptions.length > 0 ? (
                                            <Select value={activeDistrict || ''} onValueChange={v => handleInlineEdit(row.id, 'district', v)}>
                                                <SelectTrigger className="h-8 px-2 text-xs border-transparent hover:border-input bg-transparent w-full">
                                                    <SelectValue placeholder="—" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {curDistrictOptions.map((o: { value: string, label: string }) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                value={activeDistrict}
                                                onChange={e => handleInlineEdit(row.id, 'district', e.target.value)}
                                                placeholder="Unknown District"
                                                className="h-8 px-2 text-xs border-transparent hover:border-input bg-transparent w-full text-destructive font-medium"
                                            />
                                        )}
                                    </div>

                                    <div className="py-1 px-2 mb-2 md:mb-0">
                                        <Input
                                            value={activeSociety}
                                            onChange={e => handleInlineEdit(row.id, 'society', e.target.value)}
                                            className="h-8 px-2 text-xs border-transparent hover:border-input bg-transparent w-full"
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm px-2">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <span>
                        Page {pageIndex + 1} of {Math.max(1, pageCount)} · {filteredFarmers.length.toLocaleString()} rows
                    </span>
                    <div className="flex items-center gap-2">
                        <span>Rows per page:</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(val) => {
                                setPageSize(Number(val));
                                setPageIndex(0);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[80px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[50, 100, 200, 500].map(size => (
                                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}>
                        Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1 || pageCount === 0}>
                        Next
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete Selected records?"
                description={`You are about to permanently queue ${selectedIds.size} farmer record(s) for deletion. This action cannot be undone.`}
                confirmText="Yes, delete"
                onConfirm={handleDeleteSelected}
            />
        </AppShell>
    );
}

