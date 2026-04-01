'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import Link from 'next/link';

import { useArchivedFarmerGroups } from '@/hooks/useData';
import { archiveFarmerGroup, deleteFarmerGroup } from '@/lib/db/services/farmer-groups';
import { useToast } from '@/hooks/use-toast';
import { ColumnDef } from '@tanstack/react-table';
import type { FarmerGroup } from '@/lib/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ArchivedGroupsPage() {
    const { toast } = useToast();
    const archivedGroups = useArchivedFarmerGroups();
    const [groupToDelete, setGroupToDelete] = React.useState<string | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = React.useState(false);

    const handleRestoreGroup = async (groupId: string) => {
        try {
            await archiveFarmerGroup(groupId, false);
            toast({ title: 'Group Restored', description: 'Farmer Group has been restored to the main database.' });
        } catch (error) {
            toast({ title: 'Restore Failed', description: 'Could not restore the farmer group.', variant: 'destructive' });
        }
    };

    const performDelete = async () => {
        if (!groupToDelete) return;
        try {
            await deleteFarmerGroup(groupToDelete);
            toast({ title: 'Group Deleted', description: 'Farmer Group has been securely deleted.' });
        } catch (error) {
            toast({ title: 'Delete Failed', description: 'Could not delete the farmer group.', variant: 'destructive' });
        } finally {
            setGroupToDelete(null);
        }
    };

    const performDeleteAll = async () => {
        if (!archivedGroups || archivedGroups.length === 0) return;
        try {
            for (const group of archivedGroups) {
                await deleteFarmerGroup(group.id);
            }
            toast({ title: 'All Groups Deleted', description: 'All archived farmer groups have been securely deleted.' });
        } catch (error) {
            toast({ title: 'Delete Failed', description: 'Could not delete all farmer groups.', variant: 'destructive' });
        } finally {
            setIsDeleteAllOpen(false);
        }
    };

    const columns: ColumnDef<FarmerGroup>[] = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Group Name',
            cell: ({ row }) => <div className="font-medium text-muted-foreground">{row.original.name}</div>,
        },
        {
            accessorKey: 'seasonYear',
            header: 'Season',
            cell: ({ row }) => <div>{row.getValue('seasonYear') || 'N/A'}</div>,
        },
        {
            accessorKey: 'region',
            header: 'Region',
            cell: ({ row }) => <div>{row.getValue('region') || 'N/A'}</div>,
        },
        {
            accessorKey: 'district',
            header: 'District',
            cell: ({ row }) => <div>{row.getValue('district') || 'N/A'}</div>,
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const group = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleRestoreGroup(group.id)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Restore Group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setGroupToDelete(group.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Group
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    return (
        <AppShell>
            <div className="mb-4">
                <Link href="/farmers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Farmer Hub
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                <PageHeader
                    title="Archived Groups"
                    description="View or restore farmer groups that have been archived from the main operations."
                />
                {archivedGroups && archivedGroups.length > 0 && (
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setIsDeleteAllOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All
                    </Button>
                )}
            </div>

            <div className="p-6">
                <div className="bg-card rounded-xl border sm:rounded-2xl overflow-hidden shadow-sm">
                    {!archivedGroups ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : archivedGroups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <ArchiveRestore className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No Archived Groups</h3>
                            <p className="text-muted-foreground">There are no farmer groups currently in the archive.</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={archivedGroups}
                            filterColumnId="name"
                            filterPlaceholder="Search archived groups by name..."
                        />
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={!!groupToDelete}
                onOpenChange={(open) => !open && setGroupToDelete(null)}
                title="Delete Farmer Group?"
                description="This will permanently mark the group as deleted. Are you sure you want to proceed?"
                confirmText="Delete"
                onConfirm={performDelete}
                variant="destructive"
            />

            <ConfirmDialog
                open={isDeleteAllOpen}
                onOpenChange={setIsDeleteAllOpen}
                title="Delete All Archived Groups?"
                description="This will permanently delete ALL archived farmer groups. This action cannot be undone. Are you sure you want to proceed?"
                confirmText="Delete All"
                onConfirm={performDeleteAll}
                variant="destructive"
            />
        </AppShell>
    );
}
