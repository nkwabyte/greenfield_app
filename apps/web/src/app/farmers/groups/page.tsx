'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { UsersRound, ArrowLeft, Search, MapPin, Tent, CalendarDays, Archive, Filter, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useFieldAgentDistricts } from '@/hooks/useData';
import { NoDistrictAssigned } from '@/components/common/no-district-assigned';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkUploadGroups } from '@/components/farmers/bulk-upload-groups';
import { CreateGroupDialog } from '@/components/farmers/create-group-dialog';
import { syncFarmerGroupsFromSupabase, archiveFarmerGroup } from '@/lib/db/services/farmer-groups';

const SEASON_START_YEAR = 2020;

function getSeasonYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear; y >= SEASON_START_YEAR; y--) {
        years.push(y.toString());
    }
    return years;
}

export default function FarmerGroupsPage() {
    const user = useSelector((state: RootState) => state.auth.user);
    const isFieldAgent = user?.role === 'Field Agent';
    // undefined = still loading; [] = no districts; [...] = allowed districts
    const allowedDistricts = useFieldAgentDistricts();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('name-asc');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const hasSyncedRef = useRef(false);

    const seasonYearOptions = useMemo(() => getSeasonYearOptions(), []);

    const resolvedDistricts = allowedDistricts ?? [];

    const groupsWithCounts = useLiveQuery(async () => {
        const allGroups = await db.farmerGroups.filter(g => !g.isArchived).toArray();
        const groups = isFieldAgent && resolvedDistricts.length > 0
            ? allGroups.filter(g => g.district && resolvedDistricts.includes(g.district))
            : isFieldAgent && resolvedDistricts.length === 0
            ? [] // field agent with no districts — no groups visible
            : allGroups;
        const results = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await db.farmers.where('groupId').equals(group.id).count();
                return { ...group, memberCount };
            })
        );
        return results;
    }, [isFieldAgent, resolvedDistricts.join(',')]);

    // Trigger a one-time sync if no groups are found on first load
    useEffect(() => {
        if (groupsWithCounts !== undefined && groupsWithCounts.length === 0 && !hasSyncedRef.current) {
            hasSyncedRef.current = true;
            setIsSyncing(true);
            syncFarmerGroupsFromSupabase()
                .catch(error => console.error('Failed to sync farmer groups:', error))
                .finally(() => setIsSyncing(false));
        }
    }, [groupsWithCounts]);

    const handleArchiveEmptyGroups = async () => {
        if (!groupsWithCounts) return;

        const emptyGroups = groupsWithCounts.filter(g => g.memberCount === 0);
        if (emptyGroups.length === 0) return;

        if (!window.confirm(`Are you sure you want to archive ${emptyGroups.length} empty group(s)?`)) {
            return;
        }

        setIsArchiving(true);
        try {
            await Promise.all(
                emptyGroups.map(group => archiveFarmerGroup(group.id, true))
            );
        } catch (error) {
            console.error('Failed to archive empty groups:', error);
        } finally {
            setIsArchiving(false);
        }
    };

    const filteredGroups = useMemo(() => {
        if (!groupsWithCounts) return [];

        let result = groupsWithCounts.filter(group => {
            // Filter by season year
            if (selectedYear && group.seasonYear !== selectedYear) return false;

            // Filter by status (members vs no members)
            if (filterStatus === 'with-members' && group.memberCount === 0) return false;
            if (filterStatus === 'no-members' && group.memberCount > 0) return false;

            // Filter by search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    group.name?.toLowerCase().includes(q) ||
                    group.description?.toLowerCase().includes(q) ||
                    group.region?.toLowerCase().includes(q) ||
                    group.district?.toLowerCase().includes(q)
                );
            }
            return true;
        });

        // Sort results
        result.sort((a, b) => {
            if (sortBy === 'name-asc') {
                return (a.name || '').localeCompare(b.name || '');
            }
            if (sortBy === 'name-desc') {
                return (b.name || '').localeCompare(a.name || '');
            }
            if (sortBy === 'members-desc') {
                return b.memberCount - a.memberCount;
            }
            if (sortBy === 'members-asc') {
                return a.memberCount - b.memberCount;
            }
            return 0;
        });

        return result;
    }, [groupsWithCounts, selectedYear, filterStatus, searchQuery, sortBy]);

    // Gate: field agent with no districts assigned yet
    if (isFieldAgent && allowedDistricts !== undefined && allowedDistricts.length === 0) {
        return (
            <AppShell>
                <div className="mb-4">
                    <Link href="/farmers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Farmer Hub
                    </Link>
                </div>
                <PageHeader title="Farmer Groups" description="Manage and coordinate your agricultural cooperatives and communities." />
                <NoDistrictAssigned />
            </AppShell>
        );
    }

    return (
        <>
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
                        <BulkUploadGroups />
                        <Button
                            variant="outline"
                            onClick={handleArchiveEmptyGroups}
                            disabled={isArchiving || !groupsWithCounts || groupsWithCounts.filter(g => g.memberCount === 0).length === 0}
                            className="text-muted-foreground hover:bg-muted"
                        >
                            <Archive className="mr-2 h-4 w-4" />
                            {isArchiving ? 'Archiving...' : 'Archive Empty'}
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
                            <UsersRound className="mr-2 h-4 w-4" />
                            New Group
                        </Button>
                    </div>
                </PageHeader>

                {/* Filter and Sort Bar */}
                <div className="px-6 py-4 border-b bg-card">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-col sm:flex-row flex-1 w-full gap-4 items-center">
                            <div className="relative w-full max-w-md">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search groups or regions..."
                                    className="w-full pl-8 bg-background border-input focus-visible:ring-primary"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filter Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Groups</SelectItem>
                                    <SelectItem value="with-members">With Members</SelectItem>
                                    <SelectItem value="no-members">No Members (Empty)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-full sm:w-[140px] bg-background">
                                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Season Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {seasonYearOptions.map((year) => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                                    <ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                    <SelectItem value="members-desc">Most Members</SelectItem>
                                    <SelectItem value="members-asc">Least Members</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {!groupsWithCounts || isSyncing ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-pulse flex items-center gap-3 text-muted-foreground">
                                <UsersRound className="h-5 w-5 animate-spin" />
                                {isSyncing ? 'Syncing groups from server...' : 'Loading groups...'}
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
                                    href={`/farmers/groups/details?id=${group.id}`}
                                    className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-orange-500/50 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-500/20 transition-colors">
                                                <UsersRound className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            {group.memberCount > 0 && (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-2xl font-bold tracking-tight text-foreground">
                                            {group.memberCount}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg line-clamp-1 mb-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                        {group.name}
                                    </h3>
                                    <div className="space-y-1.5 mt-3">
                                        {group.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {group.description}
                                            </p>
                                        )}
                                        {group.seasonYear && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                Season {group.seasonYear}
                                            </p>
                                        )}
                                        {(group.district || group.region) && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 line-clamp-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {[group.district, group.region].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </AppShell>

            <CreateGroupDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </>
    );
}
