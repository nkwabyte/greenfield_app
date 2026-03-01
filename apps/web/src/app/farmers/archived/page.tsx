'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArchiveRestore, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import Link from 'next/link';

import { useArchivedFarmers, useFarmerGroups } from '@/hooks/useData';
import { archiveFarmer, deleteFarmer } from '@/lib/db/services/farmers';
import { useToast } from '@/hooks/use-toast';
import { ColumnDef } from '@tanstack/react-table';
import type { Farmer } from '@/lib/types';
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

export default function ArchivedFarmersPage() {
    const { toast } = useToast();
    const archivedFarmers = useArchivedFarmers();
    const groups = useFarmerGroups();

    const [farmerToDelete, setFarmerToDelete] = React.useState<string | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = React.useState(false);

    const societyToGroupName = React.useMemo(() => {
        const map: Record<string, string> = {};
        if (groups) {
            for (const g of groups) {
                if (g.society) map[g.society] = g.name;
            }
        }
        return map;
    }, [groups]);

    const handleRestoreFarmer = async (farmerId: string) => {
        try {
            await archiveFarmer(farmerId, false);
            toast({ title: 'Farmer Restored', description: 'Farmer has been restored to the main database.' });
        } catch (error) {
            toast({ title: 'Restore Failed', description: 'Could not restore the farmer.', variant: 'destructive' });
        }
    };

    const performDelete = async () => {
        if (!farmerToDelete) return;
        try {
            await deleteFarmer(farmerToDelete);
            toast({ title: 'Farmer Deleted', description: 'Farmer has been securely deleted.' });
        } catch (error) {
            toast({ title: 'Delete Failed', description: 'Could not delete the farmer.', variant: 'destructive' });
        } finally {
            setFarmerToDelete(null);
        }
    };

    const performDeleteAll = async () => {
        if (!archivedFarmers || archivedFarmers.length === 0) return;
        try {
            for (const farmer of archivedFarmers) {
                await deleteFarmer(farmer.id);
            }
            toast({ title: 'All Farmers Deleted', description: 'All archived farmers have been securely deleted.' });
        } catch (error) {
            toast({ title: 'Delete Failed', description: 'Could not delete all farmers.', variant: 'destructive' });
        } finally {
            setIsDeleteAllOpen(false);
        }
    };

    const columns: ColumnDef<Farmer>[] = React.useMemo(() => [
        {
            accessorKey: 'name',
            header: 'Full Name',
            cell: ({ row }) => <div className="font-medium text-muted-foreground">{row.original.name}</div>,
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
            accessorKey: 'society',
            header: 'Society/Group',
            cell: ({ row }) => {
                const society = row.getValue('society') as string;
                if (!society) return <span className="text-muted-foreground">N/A</span>;
                const groupName = societyToGroupName[society];
                return (
                    <div className="flex flex-col">
                        <span>{society}</span>
                        {groupName && <span className="text-xs text-muted-foreground">{groupName}</span>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                if (!status) return null;
                return (
                    <Badge variant="secondary" className="opacity-60">{status}</Badge>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const farmer = row.original;
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
                            <DropdownMenuItem onClick={() => handleRestoreFarmer(farmer.id)}>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Restore Farmer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFarmerToDelete(farmer.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Farmer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], [societyToGroupName]);

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
                    title="Archived Farmers"
                    description="View or restore farmers that have been archived from the main operations."
                />
                {archivedFarmers && archivedFarmers.length > 0 && (
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setIsDeleteAllOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All
                    </Button>
                )}
            </div>

            <div className="p-6">
                <div className="bg-card rounded-xl border sm:rounded-2xl overflow-hidden shadow-sm">
                    {!archivedFarmers ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : archivedFarmers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <ArchiveRestore className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-1">No Archived Farmers</h3>
                            <p className="text-muted-foreground">There are no farmers currently in the archive.</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={archivedFarmers}
                            filterColumnId="name"
                            filterPlaceholder="Search archived farmers by name..."
                        />
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={!!farmerToDelete}
                onOpenChange={(open) => !open && setFarmerToDelete(null)}
                title="Delete Farmer?"
                description="This will permanently delete the farmer. Are you sure you want to proceed?"
                confirmText="Delete"
                onConfirm={performDelete}
                variant="destructive"
            />

            <ConfirmDialog
                open={isDeleteAllOpen}
                onOpenChange={setIsDeleteAllOpen}
                title="Delete All Archived Farmers?"
                description="This will permanently delete ALL archived farmers. This action cannot be undone. Are you sure you want to proceed?"
                confirmText="Delete All"
                onConfirm={performDeleteAll}
                variant="destructive"
            />
        </AppShell>
    );
}
