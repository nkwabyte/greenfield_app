'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PurgeConfirmDialog } from '@/components/farmers/purge-confirm-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';
import { deleteAllFarmers } from '@/lib/db/services/farmers';
import { clearAllData } from '@/lib/db/schema';

export function DangerZone() {
    const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

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

    const handleResetCache = async () => {

        try {
            setIsResetting(true);
            await clearAllData();
            toast({ title: "Local Cache Cleared", description: "Reloading application..." });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast({ title: "Reset Failed", description: "Failed to clear local cache.", variant: "destructive" });
            setIsResetting(false);
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
                        disabled={isPurging || isResetting}
                    >
                        {isPurging ? 'Purging Data...' : 'Purge Data'}
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 mt-4 border-t border-red-200 dark:border-red-900">
                    <div className="space-y-1">
                        <h4 className="font-semibold text-red-600 dark:text-red-400">Reset Local Application Cache</h4>
                        <p className="text-sm text-muted-foreground">
                            If your database has been wiped manually or is out of sync, this resolves errors by erasing all downloaded data locally and fetching a fresh copy from the cloud.
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => setIsResetDialogOpen(true)}
                        disabled={isPurging || isResetting}
                    >
                        {isResetting ? 'Resetting...' : 'Reset Local Cache'}
                    </Button>
                </div>
            </div>

            <PurgeConfirmDialog
                open={isPurgeDialogOpen}
                onOpenChange={setIsPurgeDialogOpen}
                onConfirm={handlePurgeData}
            />

            <ConfirmDialog
                open={isResetDialogOpen}
                onOpenChange={setIsResetDialogOpen}
                title="Clear Local Cache?"
                description="Are you sure you want to clear your local cache? All downloaded data will be removed locally, and the app will reload and fetch a fresh copy of everything from the cloud. This resolves sync issues but may take a moment."
                confirmText="Yes, clear cache"
                cancelText="Cancel"
                onConfirm={() => {
                    setIsResetDialogOpen(false);
                    handleResetCache();
                }}
            />
        </div>
    );
}
