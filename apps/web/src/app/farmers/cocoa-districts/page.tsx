'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { CocoaDistrictManagement } from '@/components/farmers/cocoa-district-management';
import { useAllCocoaDistricts } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, LayoutList } from 'lucide-react';

export default function CocoaDistrictsPage() {
    const allDistricts = useAllCocoaDistricts() || [];

    const activeCount = allDistricts.filter(d => d.isActive).length;
    const inactiveCount = allDistricts.filter(d => !d.isActive).length;

    return (
        <AppShell>
            <PageHeader
                title="Cocoa District Management"
                description="Manage the canonical list of cocoa districts used across farmer records. Field agents will select from this list when registering farmers."
            />

            <div className="p-6 space-y-8 max-w-5xl">

                {/* KPI strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Districts</p>
                                <p className="text-3xl font-bold mt-1">{allDistricts.length}</p>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10">
                                <LayoutList className="h-6 w-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                                <p className="text-3xl font-bold mt-1">{activeCount}</p>
                            </div>
                            <div className="p-3 rounded-full bg-emerald-500/10">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-500/20 bg-orange-500/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inactive / Pending</p>
                                <p className="text-3xl font-bold mt-1">{inactiveCount}</p>
                            </div>
                            <div className="p-3 rounded-full bg-orange-500/10">
                                <XCircle className="h-6 w-6 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Info callout */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-700 dark:text-blue-300">
                    <strong>How it works:</strong> Active districts appear in the dropdown when adding or editing a farmer.
                    If a field agent types a district name that isn&apos;t in this list, it is saved as a{' '}
                    <span className="font-medium">custom entry</span> and flagged for review. You can then add it here
                    to promote it to the permanent list.
                </div>

                {/* Management table */}
                <CocoaDistrictManagement />
            </div>
        </AppShell>
    );
}
