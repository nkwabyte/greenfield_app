'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import { useSyncContext } from '@/lib/context/SyncContext';
import { cn } from '@/lib/utils';

export function ForceSyncButton() {
    const { forceSync, isSyncing, lastSyncAt } = useSyncContext();

    const tooltipLabel = isSyncing
        ? 'Syncing…'
        : lastSyncAt
            ? `Last synced ${new Date(lastSyncAt).toLocaleTimeString()}`
            : 'Sync with cloud';

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        disabled={isSyncing}
                        onClick={() => forceSync()}
                        aria-label="Force database sync"
                        className="h-9 w-9"
                    >
                        <RefreshCw
                            className={cn('h-4 w-4', isSyncing && 'animate-spin')}
                        />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tooltipLabel}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
