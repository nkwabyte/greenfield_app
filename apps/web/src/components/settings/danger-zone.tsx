'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PurgeConfirmDialog } from '@/components/farmers/purge-confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { deleteAllFarmers } from '@/lib/db/services/farmers';

export function DangerZone() {
    const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    const handlePurgeData = async () => {
        try {
            setIsPurging(true);
            await deleteAllFarmers();
            toast({ title: "Data Purged", description: "All farmer data has been deleted." });
        } catch (error) {
            toast({ title: "Purge Failed", description: "Failed to delete data.", variant: "destructive" });
        } finally {
            setIsPurging(false);
            setIsPurgeDialogOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">
                    Irreversible and destructive actions for your application data.
                </p>
            </div>

            <div className="border border-red-200 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-red-600 dark:text-red-400">Purge All Farmer Data</h4>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete all farmers from this device and queue a remote deletion command to Database. This action cannot be undone.
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => setIsPurgeDialogOpen(true)}
                        disabled={isPurging}
                    >
                        {isPurging ? 'Purging Data...' : 'Purge Data'}
                    </Button>
                </div>
            </div>

            <PurgeConfirmDialog
                open={isPurgeDialogOpen}
                onOpenChange={setIsPurgeDialogOpen}
                onConfirm={handlePurgeData}
            />
        </div>
    );
}
