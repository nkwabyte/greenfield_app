'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { UsersRound, ArrowLeft, Search, MapPin, Tent } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { Input } from '@/components/ui/input';
import { BulkUploadGroups } from '@/components/farmers/bulk-upload-groups';

export default function FarmerGroupsPage() {
    const [searchQuery, setSearchQuery] = useState('');

    const groupsWithCounts = useLiveQuery(async () => {
        const groups = await db.farmerGroups.toArray();
        const results = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await db.farmers.where('groupId').equals(group.id).count();
                return { ...group, memberCount };
            })
        );
        return results;
    }, []);

    const filteredGroups = groupsWithCounts?.filter(group => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            group.name?.toLowerCase().includes(q) ||
            group.region?.toLowerCase().includes(q) ||
            group.district?.toLowerCase().includes(q) ||
            group.community?.toLowerCase().includes(q)
        );
    }) || [];

    return (
        <AppShell>
            <div className="mb-4">
                <Link href="/farmers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Farmer Hub
                </Link>
            </div>
            <PageHeader
                title="Farmer Groups"
                description="Manage and coordinate your agricultural cooperatives and communities."
            >
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search groups or regions..."
                            className="w-full pl-8 bg-background border-input focus-visible:ring-primary"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <BulkUploadGroups />
                </div>
            </PageHeader>

            <div className="p-6">
                {!groupsWithCounts ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-pulse flex items-center gap-3 text-muted-foreground">
                            <UsersRound className="h-5 w-5 animate-spin" />
                            Loading groups...
                        </div>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                        <Tent className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No Farmer Groups Found</h3>
                        <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                            {searchQuery ? `No groups match "${searchQuery}".` : "You haven't added any farmer groups yet."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredGroups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/farmers/groups/${group.id}`}
                                className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all duration-200"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-500/20 transition-colors">
                                        <UsersRound className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <span className="text-2xl font-bold tracking-tight text-foreground">
                                        {group.memberCount}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-lg line-clamp-1 mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                    {group.name}
                                </h3>
                                <div className="space-y-1.5 mt-3">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {group.district}, {group.region}
                                    </p>
                                    {group.community && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                                            <Tent className="h-3.5 w-3.5" />
                                            {group.community}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
