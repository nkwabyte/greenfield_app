'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import { Users, Map, UsersRound, MapPin, Wrench, Archive, ChevronRight } from 'lucide-react';
import { useFarmersCount, useUniqueRegions, useFarmerGroups } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';

export default function FarmersHubPage() {
    const totalFarmers = useFarmersCount() ?? 0;
    const uniqueRegions = useUniqueRegions();
    const totalRegions = uniqueRegions ? uniqueRegions.length : 0;
    const groups = useFarmerGroups();
    const totalGroups = groups ? groups.length : 0;

    return (
        <AppShell>
            <PageHeader
                title="Farmer Management Hub"
                description="Navigate to different views to manage farmers, groups, and regional operations."
            />

            <div className="p-6 space-y-10 max-w-6xl">

                {/* ── KPI Summary (top, always visible) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Farmers</p>
                                <p className="text-3xl font-bold mt-1">{totalFarmers.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-orange-500/20 bg-orange-500/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Farmer Groups</p>
                                <p className="text-3xl font-bold mt-1">{totalGroups.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-orange-500/10">
                                <UsersRound className="h-6 w-6 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="flex items-center justify-between py-5 px-6">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Regions Covered</p>
                                <p className="text-3xl font-bold mt-1">{totalRegions.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-full bg-blue-500/10">
                                <MapPin className="h-6 w-6 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Core Navigation ── */}
                <section>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Core Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Featured: All Farmers — spans full row on small, col1 on md */}
                        <Link
                            href="/farmers/all"
                            className="group relative overflow-hidden rounded-xl border bg-linear-to-br from-primary/5 to-primary/10 border-primary/20 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 md:col-span-1 flex flex-col justify-between min-h-[160px]"
                        >
                            <div className="flex items-start justify-between">
                                <div className="p-3 rounded-xl bg-primary/10 w-12 h-12 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">All Farmers</h3>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">View and manage the complete farmer database. Export data and edit records.</p>
                            </div>
                        </Link>

                        {/* Farmer Groups */}
                        <Link
                            href="/farmers/groups"
                            className="group relative overflow-hidden rounded-xl border bg-linear-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20 p-6 shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all duration-200 flex flex-col justify-between min-h-[160px]"
                        >
                            <div className="flex items-start justify-between">
                                <div className="p-3 rounded-xl bg-orange-500/10 w-12 h-12 flex items-center justify-center">
                                    <UsersRound className="h-6 w-6 text-orange-500" />
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold group-hover:text-orange-500 transition-colors">Farmer Groups</h3>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Manage cooperatives and groups for streamlined resource distribution.</p>
                            </div>
                        </Link>

                        {/* Regions */}
                        <Link
                            href="/farmers/regions"
                            className="group relative overflow-hidden rounded-xl border bg-linear-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 p-6 shadow-sm hover:shadow-md hover:border-blue-500/50 transition-all duration-200 flex flex-col justify-between min-h-[160px]"
                        >
                            <div className="flex items-start justify-between">
                                <div className="p-3 rounded-xl bg-blue-500/10 w-12 h-12 flex items-center justify-center">
                                    <Map className="h-6 w-6 text-blue-500" />
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold group-hover:text-blue-500 transition-colors">Regions</h3>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Filter farmers geographically and analyse operations by region.</p>
                            </div>
                        </Link>
                    </div>
                </section>

                {/* ── Admin / Utility ── */}
                <section>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Administration & Utilities</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Data Fixes */}
                        <Link
                            href="/farmers/bulk-fixes"
                            className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all duration-200"
                        >
                            <div className="p-3 rounded-xl bg-amber-500/10 w-11 h-11 shrink-0 flex items-center justify-center">
                                <Wrench className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold group-hover:text-amber-500 transition-colors">Data Fixes</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">Fix incorrectly imported regions, districts, and communities in bulk.</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>

                        {/* Archived Farmers */}
                        <Link
                            href="/farmers/archived"
                            className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-slate-400/50 transition-all duration-200"
                        >
                            <div className="p-3 rounded-xl bg-slate-500/10 w-11 h-11 shrink-0 flex items-center justify-center">
                                <Archive className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold group-hover:text-slate-500 transition-colors">Archived Farmers</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">View and restore farmers removed from the main system.</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>

                        {/* Archived Groups */}
                        <Link
                            href="/farmers/groups/archived"
                            className="group flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-slate-400/50 transition-all duration-200"
                        >
                            <div className="p-3 rounded-xl bg-slate-600/10 w-11 h-11 shrink-0 flex items-center justify-center">
                                <Archive className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold group-hover:text-slate-600 transition-colors">Archived Groups</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">View and restore farmer groups no longer active.</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </section>

            </div>
        </AppShell>
    );
}
