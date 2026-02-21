'use client';

/**
 * BulkUploadPreviewDialog
 *
 * Opens after Excel/CSV parsing is complete. Shows all valid rows in an
 * editable table and all skipped rows (with error reasons) in a collapsible
 * section below. The user can:
 *   - Edit any cell inline before committing
 *   - Delete individual rows
 *   - Click "Import N Farmers" to commit, or "Cancel" to discard
 */

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ChevronDown, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Farmer, FailedRecord } from '@/lib/types';
import { GHANA_REGION_NAMES, GHANA_REGIONS_AND_DISTRICTS } from '@/lib/data/ghana-regions-districts';

// ── Types ──────────────────────────────────────────────────────────────────

export type PreviewFarmer = Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'> & {
    _rowKey: string; // Stable local key for React, not persisted
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    validFarmers: PreviewFarmer[];
    skippedRecords: FailedRecord[];
    onConfirm: (farmers: PreviewFarmer[]) => Promise<void>;
}

// ── Editable cell helpers ──────────────────────────────────────────────────

type EditableTextProps = {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
};

function EditableText({ value, onChange, placeholder, className }: EditableTextProps) {
    return (
        <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`h-7 px-2 text-xs border-0 bg-transparent focus:bg-white dark:focus:bg-zinc-800 focus:border rounded w-full ${className ?? ''}`}
        />
    );
}

type EditableSelectProps = {
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
    placeholder?: string;
};

function EditableSelect({ value, options, onChange, placeholder }: EditableSelectProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-7 px-2 text-xs border-0 bg-transparent focus:bg-white dark:focus:bg-zinc-800 focus:border w-full">
                <SelectValue placeholder={placeholder ?? '—'} />
            </SelectTrigger>
            <SelectContent>
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function BulkUploadPreviewDialog({
    open,
    onOpenChange,
    validFarmers: initialFarmers,
    skippedRecords,
    onConfirm,
}: Props) {
    const [rows, setRows] = React.useState<PreviewFarmer[]>([]);
    const [isImporting, setIsImporting] = React.useState(false);
    const [skippedOpen, setSkippedOpen] = React.useState(false);

    // Sync when new data comes in
    React.useEffect(() => {
        setRows(initialFarmers);
        setSkippedOpen(false);
    }, [initialFarmers]);

    // ── Mutation helpers ────────────────────────────────────────────────────

    const updateRow = React.useCallback(
        (rowKey: string, patch: Partial<PreviewFarmer>) => {
            setRows(prev =>
                prev.map(r =>
                    r._rowKey === rowKey ? { ...r, ...patch } : r
                )
            );
        },
        []
    );

    const deleteRow = React.useCallback((rowKey: string) => {
        setRows(prev => prev.filter(r => r._rowKey !== rowKey));
    }, []);

    // When region changes, clear district (it may be invalid for the new region)
    const handleRegionChange = React.useCallback(
        (rowKey: string, region: string) => {
            updateRow(rowKey, { region, district: '' });
        },
        [updateRow]
    );

    // ── Import ──────────────────────────────────────────────────────────────

    const handleImport = async () => {
        if (rows.length === 0) return;
        setIsImporting(true);
        try {
            await onConfirm(rows);
            onOpenChange(false);
        } finally {
            setIsImporting(false);
        }
    };

    // ── Column definitions ──────────────────────────────────────────────────

    const GENDER_OPTIONS = [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Other', label: 'Other' },
    ];

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg">Review Import Data</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Review and edit records before adding them to the database. Click any cell to edit.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="gap-1 text-xs">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {rows.length} valid
                            </Badge>
                            {skippedRecords.length > 0 && (
                                <Badge variant="destructive" className="gap-1 text-xs">
                                    <AlertTriangle className="h-3 w-3" />
                                    {skippedRecords.length} skipped
                                </Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* ── Editable table ── */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="min-w-max">
                            {/* Table header */}
                            <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b grid grid-cols-[2fr_1fr_0.6fr_1.4fr_1.4fr_1fr_1fr_0.8fr_2.5rem] text-xs font-semibold text-muted-foreground px-2">
                                <div className="py-2 px-2">Name</div>
                                <div className="py-2 px-2">Gender</div>
                                <div className="py-2 px-2">Age</div>
                                <div className="py-2 px-2">Region</div>
                                <div className="py-2 px-2">District</div>
                                <div className="py-2 px-2">Society</div>
                                <div className="py-2 px-2">Community</div>
                                <div className="py-2 px-2">Farm (ac)</div>
                                <div className="py-2" />
                            </div>

                            {/* Rows */}
                            {rows.length === 0 ? (
                                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                                    No valid records to import.
                                </div>
                            ) : (
                                rows.map((row, idx) => {
                                    const districtOptions = row.region
                                        ? (GHANA_REGIONS_AND_DISTRICTS[row.region] ?? []).map(d => ({ value: d, label: d }))
                                        : [];

                                    return (
                                        <div
                                            key={row._rowKey}
                                            className={`grid grid-cols-[2fr_1fr_0.6fr_1.4fr_1.4fr_1fr_1fr_0.8fr_2.5rem] items-center px-2 border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                        >
                                            {/* Name */}
                                            <div className="py-1 px-2">
                                                <EditableText
                                                    value={row.name}
                                                    onChange={v => updateRow(row._rowKey, { name: v })}
                                                    placeholder="Full name"
                                                />
                                            </div>

                                            {/* Gender */}
                                            <div className="py-1 px-2">
                                                <EditableSelect
                                                    value={row.gender ?? ''}
                                                    options={GENDER_OPTIONS}
                                                    onChange={v => updateRow(row._rowKey, { gender: v as Farmer['gender'] })}
                                                    placeholder="Gender"
                                                />
                                            </div>

                                            {/* Age */}
                                            <div className="py-1 px-2">
                                                <EditableText
                                                    value={String(row.age ?? '')}
                                                    onChange={v => updateRow(row._rowKey, { age: parseInt(v) || 0 })}
                                                    placeholder="Age"
                                                />
                                            </div>

                                            {/* Region */}
                                            <div className="py-1 px-2">
                                                <EditableSelect
                                                    value={row.region ?? ''}
                                                    options={GHANA_REGION_NAMES.map(r => ({ value: r, label: r }))}
                                                    onChange={v => handleRegionChange(row._rowKey, v)}
                                                    placeholder="Region"
                                                />
                                            </div>

                                            {/* District */}
                                            <div className="py-1 px-2">
                                                {districtOptions.length > 0 ? (
                                                    <EditableSelect
                                                        value={row.district ?? ''}
                                                        options={districtOptions}
                                                        onChange={v => updateRow(row._rowKey, { district: v })}
                                                        placeholder="District"
                                                    />
                                                ) : (
                                                    <EditableText
                                                        value={row.district ?? ''}
                                                        onChange={v => updateRow(row._rowKey, { district: v })}
                                                        placeholder="District"
                                                    />
                                                )}
                                            </div>

                                            {/* Society */}
                                            <div className="py-1 px-2">
                                                <EditableText
                                                    value={row.society ?? ''}
                                                    onChange={v => updateRow(row._rowKey, { society: v })}
                                                    placeholder="Society"
                                                />
                                            </div>

                                            {/* Community */}
                                            <div className="py-1 px-2">
                                                <EditableText
                                                    value={row.community ?? ''}
                                                    onChange={v => updateRow(row._rowKey, { community: v })}
                                                    placeholder="Community"
                                                />
                                            </div>

                                            {/* Farm size */}
                                            <div className="py-1 px-2">
                                                <EditableText
                                                    value={String(row.farmSize ?? '')}
                                                    onChange={v => updateRow(row._rowKey, { farmSize: parseFloat(v) || 0 })}
                                                    placeholder="0"
                                                />
                                            </div>

                                            {/* Delete */}
                                            <div className="py-1 flex items-center justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => deleteRow(row._rowKey)}
                                                    title="Remove this row"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* ── Skipped / failed rows ── */}
                        {skippedRecords.length > 0 && (
                            <div className="border-t mt-2 mx-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setSkippedOpen(v => !v)}
                                    className="w-full flex items-center justify-between text-muted-foreground text-xs h-9 px-3 hover:bg-muted/40 rounded transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        {skippedRecords.length} skipped row{skippedRecords.length !== 1 ? 's' : ''} (validation errors — not imported)
                                    </span>
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${skippedOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {skippedOpen && (
                                    <div className="divide-y rounded-md border mt-1 text-xs overflow-hidden">
                                        {skippedRecords.map((r, i) => (
                                            <div key={i} className="grid grid-cols-[4rem_1fr] gap-2 items-start px-3 py-2 bg-amber-50 dark:bg-amber-950/20">
                                                <span className="text-muted-foreground font-mono pt-0.5">Row {r.rowIndex}</span>
                                                <div>
                                                    <p className="text-destructive font-medium">{r.error}</p>
                                                    <p className="text-muted-foreground mt-0.5 truncate max-w-2xl">{r.rowData}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* ── Footer ── */}
                <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2 justify-between sm:justify-between">
                    <p className="text-xs text-muted-foreground self-center">
                        {rows.length} farmer{rows.length !== 1 ? 's' : ''} will be added to the database
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isImporting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={rows.length === 0 || isImporting}
                            className="min-w-32"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing…
                                </>
                            ) : (
                                `Import ${rows.length} Farmer${rows.length !== 1 ? 's' : ''}`
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
