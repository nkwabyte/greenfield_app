'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { ArrowLeft, MapPin, UsersRound, Calendar, Edit, Plus } from 'lucide-react';
import Link from 'next/link';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Farmer } from '@/lib/types';
import { EditGroupDialog } from '@/components/farmers/edit-group-dialog';
import { AddMemberToGroupDialog } from '@/components/farmers/add-member-to-group-dialog';
import { DistributeProductsDialog } from '@/components/groups/distribute-products-dialog';
import { AssignLeaderDialog } from '@/components/groups/assign-leader-dialog';
import { AddEditRequestDialog, RequestFormValues } from '@/components/requests/add-edit-request-dialog';
import { DataTable } from '@/components/data-table';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { addFarmerRequest } from '@/lib/db/services/farmer-requests';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export default function FarmerGroupDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isDistributeProductsOpen, setIsDistributeProductsOpen] = useState(false);
    const [isAssignLeaderOpen, setIsAssignLeaderOpen] = useState(false);
    const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);
    const [selectedFarmerIdForRequest, setSelectedFarmerIdForRequest] = useState<string | null>(null);

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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/farmers/${row.original.id}`)}>
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
                    <Button variant="outline" className="gap-2" onClick={() => setIsEditGroupOpen(true)}>
                        <Edit className="h-4 w-4" />
                        Edit Group
                    </Button>
                    <Button className="gap-2" onClick={() => setIsDistributeProductsOpen(true)}>
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
                <div className="p-6 bg-card rounded-xl border relative">
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
                    />
                </div>
            </div>

            <EditGroupDialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen} group={group} />
            <AddMemberToGroupDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} group={group} />
            <DistributeProductsDialog open={isDistributeProductsOpen} onOpenChange={setIsDistributeProductsOpen} group={group} members={members} />
            <AssignLeaderDialog open={isAssignLeaderOpen} onOpenChange={setIsAssignLeaderOpen} group={group} members={members} />

            <AddEditRequestDialog
                open={isAddRequestOpen}
                onOpenChange={setIsAddRequestOpen}
                request={null}
                prefillFarmerId={selectedFarmerIdForRequest || undefined}
                prefillGroupId={group.id}
                onSave={handleSaveRequest}
            />
        </AppShell>
    );
}
