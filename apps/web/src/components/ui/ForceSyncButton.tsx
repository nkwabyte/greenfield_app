'use client';

import { CloudDownload, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import { useSyncContext } from '@/lib/context/SyncContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

function SyncBtn({
    icon: Icon,
    label,
    spinning,
    disabled,
    onClick,
    side = 'bottom',
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    spinning: boolean;
    disabled: boolean;
    onClick: () => void;
    side?: 'bottom' | 'top' | 'left' | 'right';
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={onClick}
                    aria-label={label}
                    className="h-9 w-9"
                >
                    <Icon className={cn('h-4 w-4', spinning && 'animate-pulse')} />
                </Button>
            </TooltipTrigger>
            <TooltipContent side={side}>{label}</TooltipContent>
        </Tooltip>
    );
}

export function ForceSyncButton() {
    const { pullFromCloud, pushToCloud, isPulling, isPushing, lastPullAt } = useSyncContext();
    const { pendingCount } = useSelector((state: RootState) => state.data.sync);
    const { toast } = useToast();

    const pullLabel = isPulling
        ? 'Pulling from cloud…'
        : lastPullAt
            ? `Pull from cloud (last: ${new Date(lastPullAt).toLocaleTimeString()})`
            : 'Pull from cloud';

    const pushLabel = isPushing
        ? 'Pushing to cloud…'
        : 'Push local changes to cloud';

    const handlePush = async () => {
        if (pendingCount === 0) {
            toast({
                title: 'Sync to Cloud',
                description: 'Everything is up to date, nothing to sync.',
                variant: 'default'
            });
            return;
        }

        await pushToCloud();

        toast({
            title: 'Sync to Cloud',
            description: 'Local changes have been successfully synced to the cloud.',
            variant: 'default'
        });
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-0.5">
                {/* Pull: cloud → local */}
                <SyncBtn
                    icon={CloudDownload}
                    label={pullLabel}
                    spinning={isPulling}
                    disabled={isPulling || isPushing}
                    onClick={pullFromCloud}
                />

                {/* Push: local → cloud */}
                <SyncBtn
                    icon={CloudUpload}
                    label={pushLabel}
                    spinning={isPushing}
                    disabled={isPulling || isPushing}
                    onClick={handlePush}
                />
            </div>
        </TooltipProvider>
    );
}

