/**
 * Sync Status Badge
 * Shows: online/offline status, per-entity Supabase→Dexie sync progress,
 * outbound queue pending count, and manual sync controls.
 */

'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw, Pause, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { syncService } from '@/lib/db/sync';
import { useState } from 'react';
import { SyncQueueDialog } from './sync-queue-dialog';

const ENTITY_LABELS: Record<string, string> = {
    farmers: 'Farmers',
    employees: 'Employees',
    suppliers: 'Suppliers',
    products: 'Products',
};

export function SyncStatusBadge() {
    const { isOnline, pendingCount, isSyncing, isPaused, entitySync } = useSelector(
        (state: RootState) => state.data.sync
    );
    const [isManualSyncing, setIsManualSyncing] = useState(false);
    const [isQueueDialogOpen, setIsQueueDialogOpen] = useState(false);

    // Track DLQ (Dead-Letter Queue) count for failed outbound syncs
    const errorCount = useLiveQuery(() => db.syncQueue.where('status').equals('failed').count(), []) || 0;

    // Compute aggregate entity sync state
    const entityEntries = Object.entries(entitySync) as [
        keyof typeof entitySync,
        { status: string; count: number }
    ][];
    const allDone = entityEntries.every(([, v]) => v.status === 'done');
    const anyError = entityEntries.some(([, v]) => v.status === 'error');
    const syncingEntities = entityEntries.filter(([, v]) => v.status === 'syncing');
    const anyEntitySyncing = syncingEntities.length > 0;
    const hasStarted = entityEntries.some(([, v]) => v.status !== 'idle');

    const handleManualSync = async () => {
        if (!isOnline || isSyncing || isManualSyncing) return;
        setIsManualSyncing(true);
        try {
            await syncService.syncAll();
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            setIsManualSyncing(false);
        }
    };

    const handlePauseResume = () => {
        if (isPaused) syncService.resume();
        else syncService.pause();
    };

    // Build tooltip content for entity sync details
    const tooltipContent = (
        <div className="space-y-1.5 text-xs">
            {entityEntries.map(([entity, { status, count }]) => (
                <div key={entity} className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">{ENTITY_LABELS[entity]}</span>
                    <span className="flex items-center gap-1 font-medium">
                        {status === 'syncing' && (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                        )}
                        {status === 'done' && (
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                        )}
                        {status === 'error' && (
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                        )}
                        {status === 'idle' ? '—' : status === 'done' ? `${count.toLocaleString()} records` : status}
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-3 text-sm">

                {/* ── Online / Offline indicator ── */}
                {isOnline ? (
                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                        </span>
                        <span className="font-medium hidden sm:inline">Online</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="font-medium hidden sm:inline">Offline</span>
                    </span>
                )}

                {/* ── Entity sync progress indicator ── */}
                {hasStarted && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default">
                                {anyEntitySyncing && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span className="hidden sm:inline">Syncing {syncingEntities.map(([e]) => ENTITY_LABELS[e]).join(', ')}…</span>
                                        <span className="sm:hidden">Syncing…</span>
                                    </span>
                                )}
                                {!anyEntitySyncing && anyError && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span className="hidden sm:inline">Sync issue</span>
                                    </span>
                                )}
                                {!anyEntitySyncing && !anyError && allDone && hasStarted && (
                                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span className="font-medium hidden sm:inline">Synced</span>
                                    </span>
                                )}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="w-52">
                            <p className="font-semibold mb-2 text-xs">Cloud → Local Sync</p>
                            {tooltipContent}
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* ── DLQ (Dead-Letter) error count ── */}
                {errorCount > 0 && (
                    <button
                        onClick={() => setIsQueueDialogOpen(true)}
                        className="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                        title="Some changes failed to sync. Click to view and manage."
                    >
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        <span className="hidden sm:inline">{errorCount.toLocaleString()} failed</span>
                        <span className="sm:hidden">{errorCount}</span>
                    </button>
                )}

                {/* ── Outbound queue pending count ── */}
                {pendingCount > 0 && (
                    <button
                        onClick={() => setIsQueueDialogOpen(true)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${isPaused
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-amber-500/15 dark:text-amber-400 hover:bg-yellow-200 dark:hover:bg-amber-500/25'
                            }`}>
                        {isPaused ? (
                            <Pause className="mr-1 h-3 w-3" />
                        ) : isSyncing && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        <span className="hidden sm:inline">{isPaused ? 'Paused' : `${pendingCount.toLocaleString()} pending`}</span>
                        <span className="sm:hidden">{pendingCount}</span>
                    </button>
                )}

                {/* ── Manual sync controls (only when there are pending items) ── */}
                {isOnline && pendingCount > 0 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePauseResume}
                            className="h-7 px-2"
                            title={isPaused ? 'Resume Sync' : 'Pause Sync'}
                        >
                            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                        {!isPaused && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleManualSync}
                                disabled={isSyncing || isManualSyncing}
                                className="h-7 px-2"
                                title="Sync now"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${(isSyncing || isManualSyncing) ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <SyncQueueDialog
                open={isQueueDialogOpen}
                onOpenChange={setIsQueueDialogOpen}
            />
        </TooltipProvider>
    );
}
