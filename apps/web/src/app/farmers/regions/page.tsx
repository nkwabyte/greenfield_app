'use client';

import * as React from 'react';
import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { GHANA_REGIONS } from '@/lib/utils/region-normalizer';
import { Users, MapPin, ArrowLeft, HelpCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useRegionCounts } from '@/hooks/useData';

export default function RegionsHubPage() {
    const regionCounts = useRegionCounts();
    const [searchQuery, setSearchQuery] = useState('');

    // Force rebuild cache on mount to overwrite unnormalized cached region strings 
    React.useEffect(() => {
        import('@/lib/db/services/farmers').then(({ updateFarmersCache }) => {
            updateFarmersCache().catch(console.error);
        });
    }, []);

    const filteredRegions = GHANA_REGIONS.filter(region =>
        region.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const showUnknown = 'unknown / unspecified'.includes(searchQuery.toLowerCase()) ||
        'n/a'.includes(searchQuery.toLowerCase());

    return (
        <AppShell>
            <div className="mb-4">
                <Link href="/farmers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Farmer Hub
                </Link>
            </div>
            <PageHeader
                title="Regions"
                description="View and filter your agricultural network across the 16 regions of Ghana."
            >
                <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search regions..."
                        className="w-full pl-8 bg-background border-input focus-visible:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </PageHeader>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRegions.map((region) => {
                        const isLoading = regionCounts === undefined;
                        const count = regionCounts?.[region] || 0;
                        return (
                            <Link
                                key={region}
                                href={`/farmers/regions/details?region=${encodeURIComponent(region)}`}
                                className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    {!isLoading && count > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            Active
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-500 transition-colors line-clamp-1">
                                    {region}
                                </h3>

                                <div className="flex items-center text-sm text-muted-foreground gap-1.5 mt-3">
                                    <Users className="h-4 w-4" />
                                    <span>
                                        {isLoading ? 'Loading...' : `${count.toLocaleString()} ${count === 1 ? 'Farmer' : 'Farmers'}`}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}

                    {/* Unknown/Unspecified Region Card */}
                    {showUnknown && (() => {
                        const isLoading = regionCounts === undefined;
                        const unknownCount = regionCounts?.['Unknown'] || 0;
                        return (
                            <Link
                                href={`/farmers/regions/details?region=N%2FA`}
                                className="group block rounded-xl border bg-muted/30 p-5 shadow-sm hover:shadow-md hover:border-slate-500/50 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2.5 rounded-lg bg-slate-500/10 text-slate-500 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                                        <HelpCircle className="h-5 w-5" />
                                    </div>
                                    {!isLoading && unknownCount > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            Action Needed
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-semibold mb-1 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors line-clamp-1">
                                    Unknown / Unspecified
                                </h3>

                                <div className="flex items-center text-sm text-muted-foreground gap-1.5 mt-3">
                                    <Users className="h-4 w-4" />
                                    <span>
                                        {isLoading ? 'Loading...' : `${unknownCount.toLocaleString()} ${unknownCount === 1 ? 'Farmer' : 'Farmers'}`}
                                    </span>
                                </div>
                            </Link>
                        );
                    })()}
                </div>
            </div>
        </AppShell>
    );
}
