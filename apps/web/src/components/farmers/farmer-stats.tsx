'use client';

import * as React from 'react';
import { useFarmerSyncStats } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function FarmerStats() {
    const stats = useFarmerSyncStats();

    if (!stats) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <Card className="bg-green-100 animate-pulse h-24" />
                <Card className="bg-yellow-100 animate-pulse h-24" />
            </div>
        );
    }

    const { totalSynced, pending } = stats;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <Card className="bg-green-600 border-none shadow-md">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-green-100">Total Active Farmers Synced</p>
                        <h3 className="text-3xl font-bold text-white">{totalSynced.toLocaleString()}</h3>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-yellow-100 border-yellow-200 border shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-yellow-800">Pending Sync</p>
                        <h3 className="text-3xl font-bold text-yellow-700">{pending.toLocaleString()}</h3>
                    </div>
                    {pending > 0 && (
                        <Loader2 className="h-6 w-6 text-yellow-600 animate-spin" />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
