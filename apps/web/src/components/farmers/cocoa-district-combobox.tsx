'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CocoaDistrict } from '@/lib/types';

interface CocoaDistrictComboboxProps {
    /** Current form value */
    value: string;
    /** Called when selection or text changes */
    onChange: (value: string) => void;
    /** List of approved districts from DB */
    districts: CocoaDistrict[];
    /** Whether the field is disabled */
    disabled?: boolean;
    placeholder?: string;
}

/**
 * Smart combobox for the Cocoa District field on the Add/Edit Farmer form.
 *
 * Behaviour:
 * - When districts exist: renders a searchable combobox. The user can pick
 *   from the managed list OR type a custom value. Custom values are accepted
 *   and stored as-is (flagged for admin review via the badge).
 * - When no districts exist: falls back to a plain text input with a helper
 *   note, so no one is blocked from entering data.
 */
export function CocoaDistrictCombobox({
    value,
    onChange,
    districts,
    disabled = false,
    placeholder = 'Search or type district…',
}: CocoaDistrictComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Is the current value an "approved" district (from DB list)?
    const isApproved = React.useMemo(
        () => districts.some(d => d.name.toLowerCase() === value.trim().toLowerCase()),
        [districts, value]
    );

    // Is it a custom (unrecognised) value?
    const isCustom = !!value.trim() && !isApproved;

    // Districts filtered by search term
    const filtered = React.useMemo(
        () =>
            districts.filter(d =>
                d.name.toLowerCase().includes(search.toLowerCase())
            ),
        [districts, search]
    );

    // Whether the search term exactly matches an existing district
    const exactMatch = districts.some(
        d => d.name.toLowerCase() === search.trim().toLowerCase()
    );

    // If no districts are configured yet, fall back to plain text input
    if (districts.length === 0) {
        return (
            <div className="space-y-1">
                <Input
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="e.g. Sefwi Wiawso Cocoa District"
                    disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                    No predefined districts yet. Your entry will be reviewed by an admin.
                </p>
            </div>
        );
    }

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) {
            // Pre-fill search with current value so user can refine
            setSearch('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleSelect = (districtName: string) => {
        onChange(districtName === value ? '' : districtName);
        setOpen(false);
        setSearch('');
    };

    const handleUseCustom = () => {
        const trimmed = search.trim();
        if (trimmed) {
            onChange(trimmed);
            setOpen(false);
            setSearch('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length === 1) {
                handleSelect(filtered[0].name);
            } else if (search.trim() && !exactMatch) {
                handleUseCustom();
            } else if (filtered.length > 0) {
                handleSelect(filtered[0].name);
            }
        }
        if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="space-y-1">
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            'w-full justify-between font-normal h-9 px-3',
                            !value && 'text-muted-foreground'
                        )}
                    >
                        <span className="truncate text-sm">
                            {value || placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 shadow-lg"
                    align="start"
                    onOpenAutoFocus={e => e.preventDefault()}
                >
                    {/* Search input */}
                    <div className="border-b px-3 py-2">
                        <Input
                            ref={inputRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search cocoa districts…"
                            className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                    </div>

                    <ScrollArea className="max-h-60">
                        {/* Approved district list */}
                        {filtered.length > 0 && (
                            <div className="p-1">
                                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Cocoa Districts
                                </p>
                                {filtered.map(d => (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => handleSelect(d.name)}
                                        className={cn(
                                            'flex items-center w-full rounded-sm px-2 py-1.5 text-sm cursor-pointer gap-2 hover:bg-accent hover:text-accent-foreground transition-colors',
                                            value.toLowerCase() === d.name.toLowerCase() && 'bg-accent/60'
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                'h-4 w-4 shrink-0',
                                                value.toLowerCase() === d.name.toLowerCase()
                                                    ? 'opacity-100 text-primary'
                                                    : 'opacity-0'
                                            )}
                                        />
                                        <span className="truncate">{d.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {filtered.length === 0 && !search.trim() && (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No districts found.
                            </p>
                        )}

                        {/* Custom entry prompt */}
                        {search.trim() && !exactMatch && (
                            <div className={cn('p-1', filtered.length > 0 && 'border-t')}>
                                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Custom Entry
                                </p>
                                <button
                                    type="button"
                                    onClick={handleUseCustom}
                                    className="flex items-center w-full rounded-sm px-2 py-1.5 text-sm cursor-pointer gap-2 hover:bg-accent hover:text-accent-foreground transition-colors text-primary"
                                >
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        Use &ldquo;<strong>{search.trim()}</strong>&rdquo;
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="ml-auto text-[10px] shrink-0 text-orange-500 border-orange-400/40 bg-orange-500/5"
                                    >
                                        Pending review
                                    </Badge>
                                </button>
                            </div>
                        )}
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            {/* Hint when a custom (non-approved) value is set */}
            {isCustom && (
                <p className="flex items-center gap-1 text-xs text-orange-500">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Custom entry — will be flagged for admin review.
                </p>
            )}
        </div>
    );
}
