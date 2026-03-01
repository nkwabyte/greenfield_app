'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, Users, Building2, UsersRound, Leaf, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

// ─── helpers ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    color = 'text-primary',
    bg = 'bg-primary/10',
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    color?: string;
    bg?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            </div>
        </div>
    );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; count: number; pct: number }[] }) {
    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
                {rows.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-muted-foreground">No data</p>
                ) : rows.map((r) => (
                    <div key={r.label} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{r.label || '—'}</span>
                            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary/60"
                                    style={{ width: `${r.pct}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-muted-foreground shrink-0">{r.count.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── main page ───────────────────────────────────────────────────────────────

import { normalizeRegion } from '@/lib/utils/region-normalizer';

export default function RegionDetailPage() {
    const params = useParams();
    const regionParam = decodeURIComponent((params.region as string) || '');

    const regionData = useLiveQuery(async () => {
        // Build base query
        const query = regionParam === 'N/A'
            ? db.farmers.filter(f => !f.isArchived && !f.deleted && (!f.region || normalizeRegion(f.region) === 'N/A'))
            : db.farmers.filter(f => !f.isArchived && !f.deleted && normalizeRegion(f.region) === regionParam);

        // Count total matching farmers first (clone query to prevent consumption)
        const total = await query.clone().count();

        if (total === 0) return null;

        // Fetch all groups to build society → group map
        const allGroups = await db.farmerGroups.toArray();
        const societyToGroup = new Map(allGroups.map(g => [g.society?.toLowerCase() ?? '', g.name]));

        // Initialize analytic maps
        const districtMap = new Map<string, number>();
        const societyMap = new Map<string, number>();
        const groupMap = new Map<string, number>();
        const statusMap = new Map<string, number>();
        const genderMap = new Map<string, number>();

        // Stream through and tally up stats to avoid huge memory spike
        await query.each((f) => {
            const district = f.district || 'Unspecified';
            districtMap.set(district, (districtMap.get(district) ?? 0) + 1);

            const society = f.society || 'Unspecified';
            societyMap.set(society, (societyMap.get(society) ?? 0) + 1);

            const groupName = societyToGroup.get((f.society || '').toLowerCase()) || '—';
            groupMap.set(groupName, (groupMap.get(groupName) ?? 0) + 1);

            const status = f.status || 'Unknown';
            statusMap.set(status, (statusMap.get(status) ?? 0) + 1);

            const gender = f.gender || 'Unknown';
            genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1);
        });

        const toRows = (map: Map<string, number>) =>
            [...map.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }));

        return {
            total,
            districts: toRows(districtMap),
            societies: toRows(societyMap),
            groups: toRows(groupMap),
            statuses: toRows(statusMap),
            genders: toRows(genderMap),
        };
    }, [regionParam]);

    const displayName = regionParam === 'N/A' ? 'Unknown / Unspecified' : regionParam;

    return (
        <AppShell>
            <div className="mb-4">
                <Link
                    href="/farmers/regions"
                    className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Regions
                </Link>
            </div>

            <PageHeader
                title={displayName}
                description={`Breakdown of farmers across districts, societies, groups, statuses, and genders in the ${displayName} region.`}
            />

            {regionData === undefined ? (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p>Loading region data…</p>
                </div>
            ) : regionData === null ? (
                <div className="py-16 text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No farmers found</p>
                    <p className="text-sm">There are currently no active farmers registered in this region.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* KPI row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={Users} label="Total Farmers" value={regionData.total} color="text-primary" bg="bg-primary/10" />
                        <StatCard icon={Building2} label="Districts" value={regionData.districts.length} color="text-blue-500" bg="bg-blue-500/10" />
                        <StatCard icon={Leaf} label="Societies" value={regionData.societies.length} color="text-emerald-500" bg="bg-emerald-500/10" />
                        <StatCard icon={UsersRound} label="Groups" value={regionData.groups.filter(g => g.label !== '—').length} color="text-orange-500" bg="bg-orange-500/10" />
                        <StatCard
                            icon={UserCheck}
                            label="Active"
                            value={`${regionData.statuses.find(s => s.label === 'Active')?.pct ?? 0}%`}
                            color="text-green-600"
                            bg="bg-green-500/10"
                        />
                    </div>

                    {/* Gender badges */}
                    <div className="flex flex-wrap gap-2">
                        {regionData.genders.map(g => (
                            <Badge key={g.label} variant="outline" className="text-sm px-3 py-1">
                                {g.label}: <span className="font-semibold ml-1">{g.count.toLocaleString()}</span>
                                <span className="text-muted-foreground ml-1">({g.pct}%)</span>
                            </Badge>
                        ))}
                    </div>

                    {/* Breakdown tables — 2-col grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BreakdownTable title="Districts" rows={regionData.districts} />
                        <BreakdownTable title="Societies / Communities" rows={regionData.societies} />
                        <BreakdownTable title="Groups" rows={regionData.groups.filter(g => g.label !== '—')} />
                        <BreakdownTable title="Status" rows={regionData.statuses} />
                    </div>

                    {/* View all farmers CTA */}
                    <div className="flex">
                        <Link
                            href={`/farmers/all?region=${encodeURIComponent(regionParam)}`}
                            className="inline-flex items-center gap-2 rounded-lg border bg-card px-5 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
                        >
                            <Users className="h-4 w-4" />
                            View all {regionData.total.toLocaleString()} farmers in {displayName}
                        </Link>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
