'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import { Users, Map, UsersRound, MapPin } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { useFarmersCount, useUniqueRegions, useFarmerGroups } from '@/hooks/useData';

export default function FarmersHubPage() {
    const totalFarmers = useFarmersCount() ?? 0;
    const uniqueRegions = useUniqueRegions();
    const totalRegions = uniqueRegions ? uniqueRegions.length : 0;
    const groups = useFarmerGroups();
    const totalGroups = groups ? groups.length : 0;

    const hubCards = [
        {
            title: 'All Farmers',
            description: 'View the complete database of farmers, manage records, and export data.',
            icon: Users,
            href: '/farmers/all',
            color: 'text-primary',
            bgColor: 'bg-primary/10',
        },
        {
            title: 'Farmer Groups',
            description: 'Manage cooperatives and farmer groups for streamlined resource distribution.',
            icon: UsersRound,
            href: '/farmers/groups',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
        },
        {
            title: 'Regions',
            description: 'Filter farmers geographically and analyze operations by region.',
            icon: Map,
            href: '/farmers/regions',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        }
    ];

    return (
        <AppShell>
            <PageHeader
                title="Farmer Management Hub"
                description="Navigate to different views to manage farmers, groups, and regional operations."
            />

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
                    {hubCards.map((card) => (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="group block rounded-xl border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer h-full"
                        >
                            <div className="flex flex-col h-full">
                                <div className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-4 transition-colors ${card.bgColor}`}>
                                    <card.icon className={`h-6 w-6 ${card.color}`} />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                    {card.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed grow">
                                    {card.description}
                                </p>

                                <div className="mt-6 text-sm font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                                    Open Subsystem &rarr;
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-10 max-w-6xl">
                    <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Database Summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <KpiCard label="Total Farmers" value={totalFarmers.toLocaleString()} icon={Users} />
                        <KpiCard label="Farmer Groups" value={totalGroups.toLocaleString()} icon={UsersRound} />
                        <KpiCard label="Regions Covered" value={totalRegions.toLocaleString()} icon={MapPin} />
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
