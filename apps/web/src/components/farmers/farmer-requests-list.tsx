'use client';

import * as React from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { FarmerRequest, Farmer } from '@/lib/types';
import { PackageOpen, Calendar, Plus, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestDetailsDialog } from './request-details-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteFarmerRequest } from '@/lib/db/services/farmer-requests';
import { useToast } from '@/hooks/use-toast';

interface FarmerRequestsListProps {
    farmerId: string;
    farmerGroupId?: string;
    onRequireGroup?: () => void;
}

export function FarmerRequestsList({ farmerId, farmerGroupId, onRequireGroup }: FarmerRequestsListProps) {
    const requests = useLiveQuery(
        () => db.farmerRequests.where('farmerId').equals(farmerId).toArray(),
        [farmerId]
    );

    const farmer = useLiveQuery(
        () => db.farmers.get(farmerId),
        [farmerId]
    ) as Farmer | undefined;

    const [selectedRequest, setSelectedRequest] = React.useState<FarmerRequest | null>(null);
    const [requestToDelete, setRequestToDelete] = React.useState<FarmerRequest | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const handleAddRequestClick = () => {
        if (!farmerGroupId) {
            onRequireGroup?.();
            return;
        }
        router.push(`/farmers/groups/distribute?id=${farmerGroupId}&preselect=${farmerId}`);
    };

    const handleDeleteRequest = async () => {
        if (!requestToDelete) return;
        try {
            await deleteFarmerRequest(requestToDelete.id);
            toast({ title: 'Request deleted successfully' });
        } catch (error: any) {
            toast({ title: 'Error deleting request', description: error.message, variant: 'destructive' });
        } finally {
            setRequestToDelete(null);
        }
    };

    const columns: ColumnDef<FarmerRequest>[] = [
        {
            accessorKey: 'requestDate',
            header: 'Date',
            cell: ({ row }) => (
                <div className="flex items-center text-muted-foreground whitespace-nowrap">
                    <Calendar className="mr-2 h-4 w-4" />
                    {new Date(row.original.requestDate || row.original.createdAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            accessorKey: 'seasonYear',
            header: 'Season',
        },
        {
            accessorKey: 'items',
            header: 'Products Requested',
            cell: ({ row }) => (
                <div className="flex flex-col gap-1">
                    {row.original.items.map((item, idx) => (
                        <div key={idx} className="text-sm">
                            <span className="font-medium">{item.quantity} units</span> of {item.productName}
                            <span className="text-muted-foreground ml-2">(@ GH₵{item.dynamicPrice})</span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            accessorKey: 'grandTotal',
            header: 'Total Cost',
            cell: ({ row }) => {
                const total = row.original.grandTotal > 0
                    ? row.original.grandTotal
                    : row.original.items.reduce((sum, item) => sum + item.total, 0);
                return <div className="font-bold">GH₵{total.toFixed(2)}</div>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <Badge variant={
                        status === 'Approved' ? 'default' :
                            status === 'Delivered' ? 'default' :
                                status === 'Rejected' ? 'destructive' : 'secondary'
                    }>
                        {status}
                    </Badge>
                );
            }
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(row.original)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View / Pay
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => setRequestToDelete(row.original)}
                        title="Delete Request"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        }
    ];

    if (!requests) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-64 bg-muted rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <PackageOpen className="h-5 w-5" />
                        Request History
                    </CardTitle>
                    <Button size="sm" onClick={handleAddRequestClick}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Request
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <DataTable
                        columns={columns}
                        data={requests}
                        filterColumnId="status"
                        filterPlaceholder="Filter by status..."
                    />
                </CardContent>
            </Card>

            <RequestDetailsDialog
                open={!!selectedRequest}
                onOpenChange={(open) => !open && setSelectedRequest(null)}
                request={selectedRequest}
                farmer={farmer}
            />

            <ConfirmDialog
                open={!!requestToDelete}
                onOpenChange={(open) => !open && setRequestToDelete(null)}
                title="Delete Request"
                description={`Are you sure you want to delete this product request from ${requestToDelete?.seasonYear}? This action cannot be undone and will remove all associated payment records.`}
                onConfirm={handleDeleteRequest}
            />
        </div>
    );
}
