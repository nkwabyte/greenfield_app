'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, MapPin, UsersRound, Calendar, Edit, Plus } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Farmer } from '@/lib/types';

export default function FarmerGroupDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const group = useLiveQuery(() => db.farmerGroups.get(id), [id]);
    const members = useLiveQuery(() => db.farmers.where('groupId').equals(id).toArray(), [id]);

    const isLoading = group === undefined || members === undefined;

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppShell>
        );
    }

    if (group === null) {
        return (
            <AppShell>
                <div className="p-12 text-center text-muted-foreground">
                    Farmer Group not found.
                </div>
            </AppShell>
        );
    }

    const columns: ColumnDef<Farmer>[] = [
        {
            accessorKey: 'name',
            header: 'Farmer Name',
            cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
        },
        {
            accessorKey: 'contact',
            header: 'Contact',
        },
        {
            accessorKey: 'community',
            header: 'Community',
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/farmers/${row.original.id}`)}
                >
                    View Details
                </Button>
            ),
        }
    ];

    return (
        <AppShell>
            <div className="mb-4">
                <Link href="/farmers/groups" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Groups
                </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <UsersRound className="h-8 w-8 text-orange-500" />
                        {group.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {group.district}, {group.region}
                        </span>
                        {group.community && (
                            <span className="flex items-center gap-1.5">
                                • {group.community}
                            </span>
                        )}
                        {group.seasonYear && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {group.seasonYear}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Group
                    </Button>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Distribute Products
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-card rounded-xl border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Members</h3>
                    <p className="text-3xl font-bold">{members?.length || 0}</p>
                </div>
                <div className="p-6 bg-card rounded-xl border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Outstanding (GHS)</h3>
                    <p className="text-3xl font-bold">0.00</p>
                    <p className="text-xs text-muted-foreground mt-1">Pending bulk calculation</p>
                </div>
                <div className="p-6 bg-card rounded-xl border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Group Leader</h3>
                    <p className="text-lg font-medium mt-1">
                        {group.leaderId
                            ? members?.find(m => m.id === group.leaderId)?.name || 'Unknown'
                            : 'Not Assigned'}
                    </p>
                </div>
            </div>

            <div className="bg-card rounded-xl border overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold">Group Members</h2>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Member
                        </Button>
                    </div>
                </div>
                <div className="p-0">
                    <DataTable
                        columns={columns}
                        data={members || []}
                        filterColumnId="name"
                        filterPlaceholder="Search members..."
                    />
                </div>
            </div>
        </AppShell>
    );
}
