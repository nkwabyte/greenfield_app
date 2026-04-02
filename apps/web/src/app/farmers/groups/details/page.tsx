'use client';
import * as React from 'react';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, MapPin, UsersRound, Calendar, Edit, Plus, DollarSign, TrendingUp, AlertCircle, Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Farmer } from '@/lib/types';
import { EditGroupDialog } from '@/components/farmers/edit-group-dialog';
import { AddMemberToGroupDialog } from '@/components/farmers/add-member-to-group-dialog';
import { AssignLeaderDialog } from '@/components/groups/assign-leader-dialog';
import { AddEditRequestDialog, RequestFormValues } from '@/components/requests/add-edit-request-dialog';
import { GroupRequestsTable } from '@/components/groups/group-requests-table';
import { DataTable } from '@/components/data-table';
import { useState, useMemo } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { addFarmerRequest } from '@/lib/db/services/farmer-requests';
import { archiveFarmerGroup, deleteFarmerGroup } from '@/lib/db/services/farmer-groups';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
});

export default function FarmerGroupDetailsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <FarmerGroupDetailsContent />
        </React.Suspense>
    );
}

function FarmerGroupDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id') || '';
    const { toast } = useToast();

    const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isAssignLeaderOpen, setIsAssignLeaderOpen] = useState(false);
    const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);
    const [selectedFarmerIdForRequest, setSelectedFarmerIdForRequest] = useState<string | null>(null);
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const group = useLiveQuery(() => db.farmerGroups.get(id), [id]);
    const members = useLiveQuery(() => db.farmers.where('groupId').equals(id).toArray(), [id]);
    const groupRequests = useLiveQuery(
        () => db.farmerRequests.where('groupId').equals(id).toArray(),
        [id]
    );

    // Live financial computations
    const financials = useMemo(() => {
        if (!groupRequests) return { owed: 0, paid: 0, outstanding: 0 };
        let owed = 0;
        let paid = 0;
        for (const req of groupRequests) {
            if (req.deleted) continue;
            owed += req.grandTotal;
            paid += req.payments?.reduce((s, p) => s + p.amount, 0) || 0;
        }
        return { owed, paid, outstanding: Math.max(0, owed - paid) };
    }, [groupRequests]);

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

    const handleAddRequest = (farmerId: string) => {
        setSelectedFarmerIdForRequest(farmerId);
        setIsAddRequestOpen(true);
    };

    const handleSaveRequest = async (data: RequestFormValues) => {
        try {
            await addFarmerRequest(data as any, uuidv4());
            toast({ title: 'Request added successfully' });
            setIsAddRequestOpen(false);
        } catch (e: any) {
            toast({ title: 'Error adding request', description: e.message, variant: 'destructive' });
        }
    };

    const handleArchiveGroup = async () => {
        try {
            await archiveFarmerGroup(id);
            toast({ title: 'Group Archived', description: 'Group has been moved to the archive.' });
            router.push('/farmers/groups');
        } catch (error) {
            toast({ title: 'Archive Failed', description: 'Could not archive the group.', variant: 'destructive' });
        }
    };

    const handleDeleteGroup = async () => {
        try {
            await deleteFarmerGroup(id);
            toast({ title: 'Group Deleted', description: 'Group has been securely deleted.' });
            router.push('/farmers/groups');
        } catch (error) {
            toast({ title: 'Delete Failed', description: 'Could not delete the group.', variant: 'destructive' });
        }
    };

    const columns: ColumnDef<Farmer>[] = [
        {
            accessorKey: 'name',
            header: 'Farmer Name',
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.name}
                </span>
            ),
        },
        {
            accessorKey: 'contact',
            header: 'Contact',
        },
        {
            id: 'owed',
            header: 'Owed',
            cell: ({ row }) => {
                const farmerRequests = groupRequests?.filter(r => r.farmerId === row.original.id && !r.deleted) || [];
                const owed = farmerRequests.reduce((sum, req) => sum + req.grandTotal, 0);
                return <div className="font-medium text-orange-600 dark:text-orange-400">{currencyFormatter.format(owed)}</div>;
            }
        },
        {
            id: 'paid',
            header: 'Paid',
            cell: ({ row }) => {
                const farmerRequests = groupRequests?.filter(r => r.farmerId === row.original.id && !r.deleted) || [];
                const paid = farmerRequests.reduce((sum, req) => sum + (req.payments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
                return <div className="font-medium text-emerald-600 dark:text-emerald-400">{currencyFormatter.format(paid)}</div>;
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/farmers/details?id=${row.original.id}`)}>
                            View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddRequest(row.original.id)}>
                            Add Request
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                        {group.seasonYear && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {group.seasonYear}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => setIsEditGroupOpen(true)}>
                        <Edit className="h-4 w-4" />
                        Edit Group
                    </Button>
                    <Button variant="outline" className="gap-2 text-orange-500 border-orange-500 hover:bg-orange-500/10" onClick={() => setIsArchiveDialogOpen(true)}>
                        <Archive className="h-4 w-4" />
                        Archive Group
                    </Button>
                    <Button variant="outline" className="gap-2 text-destructive border-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                        Delete Group
                    </Button>
                    <Link href={`/farmers/groups/distribute?id=${id}`}>
                        <Button className="gap-2 w-full sm:w-auto">
                            <Plus className="h-4 w-4" />
                            Distribute Products
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-6 bg-card rounded-xl border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Members</h3>
                    <p className="text-3xl font-bold">{members?.length || 0}</p>
                </div>
                <div className="p-6 bg-card rounded-xl border">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">Total Owed</h3>
                    </div>
                    <p className="text-3xl font-bold">{currencyFormatter.format(financials.owed)}</p>
                </div>
                <div className="p-6 bg-card rounded-xl border">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-sm font-medium text-muted-foreground">Total Paid</h3>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {currencyFormatter.format(financials.paid)}
                    </p>
                </div>
                <div className="p-6 bg-card rounded-xl border">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-medium text-muted-foreground">Outstanding</h3>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {currencyFormatter.format(financials.outstanding)}
                    </p>
                </div>
                <div className="p-6 bg-card rounded-xl border relative sm:col-span-2 lg:col-span-4">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-medium text-muted-foreground">Group Leader</h3>
                        <Button variant="ghost" size="icon" className="h-6 w-6 relative -top-1 -right-1 opacity-70 hover:opacity-100" onClick={() => setIsAssignLeaderOpen(true)}>
                            <Edit className="h-3 w-3" />
                        </Button>
                    </div>
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
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsAddMemberOpen(true)}>
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
                        onRowClick={(row) => router.push(`/farmers/details?id=${row.id}`)}
                    />
                </div>
            </div>

            {/* Group Requests Table */}
            <div className="bg-card rounded-xl border overflow-hidden mt-8">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Group Requests &amp; Payments</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and edit request items, quantities, prices, and record payments inline.
                    </p>
                </div>
                <div className="p-6">
                    <GroupRequestsTable groupId={id} />
                </div>
            </div>

            <EditGroupDialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen} group={group} />
            <AddMemberToGroupDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} group={group} />
            <AssignLeaderDialog open={isAssignLeaderOpen} onOpenChange={setIsAssignLeaderOpen} group={group} members={members} />

            <AddEditRequestDialog
                open={isAddRequestOpen}
                onOpenChange={setIsAddRequestOpen}
                request={null}
                prefillFarmerId={selectedFarmerIdForRequest || undefined}
                prefillGroupId={group.id}
                onSave={handleSaveRequest}
            />

            <ConfirmDialog
                open={isArchiveDialogOpen}
                onOpenChange={setIsArchiveDialogOpen}
                title="Archive Farmer Group?"
                description="This will hide the group from the main lists. You can still access it from the archives."
                confirmText="Archive"
                onConfirm={handleArchiveGroup}
                variant="default"
            />

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Farmer Group?"
                description="This will permanently mark the group as deleted. Are you sure you want to proceed?"
                confirmText="Delete"
                onConfirm={handleDeleteGroup}
                variant="destructive"
            />
        </AppShell>
    );
}
