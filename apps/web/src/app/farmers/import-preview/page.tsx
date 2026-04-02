'use client';

/**
 * /farmers/import-preview
 *
 * Reads parsed rows from the Dexie `importStaging` table (written by the
 * farmer-import worker) and shows them in a paginated, inline-editable table.
 *
 * On "Import", triggers Phase 2 of the worker which moves staging → farmers.
 * On "Cancel", clears the staging table and navigates back.
 */

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
    Trash2,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Wrench,
} from 'lucide-react';
import { GHANA_REGION_NAMES, GHANA_REGIONS_AND_DISTRICTS } from '@/lib/data/ghana-regions-districts';
import { db, type StagingFarmer } from '@/lib/db/schema';

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
];

// ── Editable cell primitives ───────────────────────────────────────────────

function EditableText({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 px-2 text-xs border border-transparent hover:border-input focus:border-input bg-transparent rounded w-full"
        />
    );
}

function EditableSelect({ value, options, onChange, placeholder }: {
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 px-2 text-xs border border-transparent hover:border-input focus:border-input bg-transparent w-full">
                <SelectValue placeholder={placeholder ?? '—'} />
            </SelectTrigger>
            <SelectContent>
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ImportPreviewPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    const [pageIndex, setPageIndex] = React.useState(0);
    const [rows, setRows] = React.useState<StagingFarmer[]>([]);
    const [totalCount, setTotalCount] = React.useState(0);
    const [errorCount, setErrorCount] = React.useState(0);
    const [refreshKey, setRefreshKey] = React.useState(0);

    // Force a data refresh when navigating back to this page
    React.useEffect(() => {
        if (pathname === '/farmers/import-preview') setRefreshKey(k => k + 1);
    }, [pathname]);

    // Force refresh when window regains focus (e.g. user toggles tabs)
    React.useEffect(() => {
        const handleFocus = () => setRefreshKey(k => k + 1);
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const loadData = React.useCallback(async () => {
        const [chunk, tCount, eCount] = await Promise.all([
            db.importStaging.offset(pageIndex * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
            db.importStaging.count(),
            db.importErrors.count(),
        ]);
        setRows(chunk);
        setTotalCount(tCount);
        setErrorCount(eCount);
    }, [pageIndex, refreshKey]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const [isImporting, setIsImporting] = React.useState(false);
    const [progress, setProgress] = React.useState({ processed: 0, total: 0 });
    const workerRef = React.useRef<Worker | null>(null);

    const pageCount = Math.ceil(totalCount / PAGE_SIZE);

    React.useEffect(() => {
        return () => { workerRef.current?.terminate(); };
    }, []);



    // ── Row mutations (writes directly to Dexie staging) ───────────────────

    const updateRow = async (row: StagingFarmer, patch: Partial<StagingFarmer>) => {
        const updated = { ...row, ...patch };
        await db.importStaging.put(updated);
        setRows(prev => prev.map(r => r._id === row._id ? updated : r));

        if (patch.region !== undefined) {
            // Region change cascades → clear district too
            const withDistrict = { ...updated, district: '' };
            await db.importStaging.put(withDistrict);
            setRows(prev => prev.map(r => r._id === row._id ? withDistrict : r));
        }
    };

    const deleteRow = async (row: StagingFarmer) => {
        await db.importStaging.delete(row._id!);
        setRows(prev => prev.filter(r => r._id !== row._id));
        setTotalCount(c => c - 1);
    };

    // ── Commit (Phase 2 worker) ─────────────────────────────────────────────

    const handleImport = () => {
        if (totalCount === 0) return;
        setIsImporting(true);
        setProgress({ processed: 0, total: totalCount });

        if (workerRef.current) workerRef.current.terminate();
        const worker = new Worker(
            new URL('@/workers/farmer-import.worker.ts', import.meta.url),
            { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
                setProgress({ processed: msg.savedSoFar, total: totalCount });
            } else if (msg.type === 'committed') {
                setIsImporting(false);
                worker.terminate();
                workerRef.current = null;
                sessionStorage.removeItem('farmer_import_errors');
                sessionStorage.removeItem('farmer_import_skipped');
                toast({
                    title: 'Import Complete',
                    description: `${msg.saved.toLocaleString()} farmer${msg.saved !== 1 ? 's' : ''} added to database.`,
                });
                router.push('/farmers/all');
            } else if (msg.type === 'error') {
                setIsImporting(false);
                worker.terminate();
                workerRef.current = null;
                toast({ title: 'Import Failed', description: msg.message, variant: 'destructive' });
            }
        };

        worker.onerror = (err) => {
            setIsImporting(false);
            worker.terminate();
            workerRef.current = null;
            toast({ title: 'Worker Error', description: err.message, variant: 'destructive' });
        };

        worker.postMessage({ mode: 'commit' });
    };

    const handleCancel = async () => {
        await Promise.all([db.importStaging.clear(), db.importErrors.clear()]);
        sessionStorage.removeItem('farmer_import_error_count');
        router.push('/farmers/all');
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <AppShell>
            <PageHeader
                title="Review Import"
                description="Review and edit records before adding them to the database. Click any cell to edit."
            >
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        {totalCount.toLocaleString()} valid
                    </Badge>
                    {errorCount > 0 && (
                        <Badge variant="destructive" className="gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {errorCount.toLocaleString()} need fixing
                        </Badge>
                    )}
                    <div className="ml-auto flex gap-2">
                        {errorCount > 0 && (
                            <Button
                                variant="outline"
                                className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                onClick={() => router.push('/farmers/import-fix-errors')}
                            >
                                <Wrench className="mr-2 h-4 w-4" />
                                Fix {errorCount.toLocaleString()} errors
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleCancel} disabled={isImporting}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button onClick={handleImport} disabled={totalCount === 0 || isImporting} className="min-w-40">
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {progress.processed.toLocaleString()}/{progress.total.toLocaleString()}…
                                </>
                            ) : (
                                `Import ${totalCount.toLocaleString()} Farmers`
                            )}
                        </Button>
                    </div>
                </div>
            </PageHeader>

            {/* ── Editable table ── */}
            <div className="rounded-md border overflow-hidden overflow-x-auto">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_0.5fr_1.4fr_1.4fr_1.5fr_0.7fr_2.5rem] bg-muted/60 text-xs font-semibold text-muted-foreground border-b min-w-[900px]">
                    {['Name', 'Gender', 'Age', 'Region', 'District', 'Society', 'Acres', ''].map((h, i) => (
                        <div key={i} className="py-2.5 px-3">{h}</div>
                    ))}
                </div>

                {/* Rows */}
                <div className="min-w-[900px]">
                    {rows.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                            {totalCount === 0 ? 'No valid records found in the file.' : 'Loading…'}
                        </div>
                    ) : rows.map((row, idx) => {
                        const districtOptions = row.region
                            ? (GHANA_REGIONS_AND_DISTRICTS[row.region] ?? []).map(d => ({ value: d, label: d }))
                            : [];
                        return (
                            <div
                                key={row._id}
                                className={`grid grid-cols-[2fr_1fr_0.5fr_1.4fr_1.4fr_1.5fr_0.7fr_2.5rem] items-center border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}
                            >
                                <div className="py-1 px-2">
                                    <EditableText value={row.name} onChange={v => updateRow(row, { name: v })} placeholder="Full name" />
                                </div>
                                <div className="py-1 px-2">
                                    <EditableSelect value={row.gender} options={GENDER_OPTIONS} onChange={v => updateRow(row, { gender: v })} placeholder="Gender" />
                                </div>
                                <div className="py-1 px-2">
                                    <EditableText value={String(row.age ?? '')} onChange={v => updateRow(row, { age: parseInt(v) || 0 })} placeholder="Age" />
                                </div>
                                <div className="py-1 px-2">
                                    <EditableSelect
                                        value={row.region}
                                        options={GHANA_REGION_NAMES.map(r => ({ value: r, label: r }))}
                                        onChange={v => updateRow(row, { region: v, district: '' })}
                                        placeholder="Region"
                                    />
                                </div>
                                <div className="py-1 px-2">
                                    {districtOptions.length > 0 ? (
                                        <EditableSelect value={row.district} options={districtOptions} onChange={v => updateRow(row, { district: v })} placeholder="District" />
                                    ) : (
                                        <EditableText value={row.district} onChange={v => updateRow(row, { district: v })} placeholder="District" />
                                    )}
                                </div>
                                <div className="py-1 px-2">
                                    <EditableText value={row.society} onChange={v => updateRow(row, { society: v })} placeholder="Society" />
                                </div>
                                <div className="py-1 px-2">
                                    <EditableText value={String(row.farmSize ?? '')} onChange={v => updateRow(row, { farmSize: parseFloat(v) || 0 })} placeholder="0" />
                                </div>
                                <div className="py-1 flex items-center justify-center">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteRow(row)}
                                        title="Remove this row"
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
                        Page {pageIndex + 1} of {pageCount} · {totalCount.toLocaleString()} rows total
                    </span>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
