'use client';

import * as React from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { FarmerRequest, Farmer } from '@/lib/types';
import { PackageOpen, Calendar, Plus, Eye, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestDetailsDialog } from './request-details-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { addFarmerRequest, deleteFarmerRequest, updateFarmerRequest } from '@/lib/db/services/farmer-requests';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AddEditRequestDialog, type RequestFormValues } from '@/components/requests/add-edit-request-dialog';
import { v4 as uuidv4 } from 'uuid';

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
    const [isAddRequestOpen, setIsAddRequestOpen] = React.useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleAddRequestClick = () => {
        if (!farmerGroupId) {
            // Farmer has no group — open the direct request dialog instead of forcing group assignment
            setIsAddRequestOpen(true);
            return;
        }
        router.push(`/farmers/groups/distribute?id=${farmerGroupId}&preselect=${farmerId}`);
    };

    const handleSaveDirectRequest = async (data: RequestFormValues) => {
        try {
            const id = uuidv4();
            await addFarmerRequest({
                farmerId,
                groupId: data.groupId || undefined,
                seasonYear: data.seasonYear,
                items: data.items,
                grandTotal: data.grandTotal,
                status: data.status,
                requestDate: data.requestDate.toISOString(),
                paymentPlan: data.paymentPlan,
                depositPaid: data.depositPaid,
                otherPaymentPlan: data.otherPaymentPlan,
                payments: [],
            }, id);
            toast({ title: 'Request added successfully' });
            setIsAddRequestOpen(false);
            router.push(`/farmers/details?id=${farmerId}&tab=payments`);
        } catch (e: any) {
            toast({ title: 'Error adding request', description: e.message, variant: 'destructive' });
        }
    };

    const handleUpdateStatus = async (requestId: string, newStatus: FarmerRequest['status']) => {
        try {
            await updateFarmerRequest(requestId, { status: newStatus });
            toast({ title: `Status updated to ${newStatus}` });
        } catch (e: any) {
            toast({ title: 'Error updating status', description: e.message, variant: 'destructive' });
        }
    };

    const handleDeleteRequest = async () => {
        if (!requestToDelete) return;
        const totalPaid = requestToDelete.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
        if (totalPaid > 0) {
            toast({ title: 'Cannot delete', description: 'This request has payments recorded and cannot be deleted.', variant: 'destructive' });
            setRequestToDelete(null);
            return;
        }
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
            cell: ({ row }) => (
                <StatusCell
                    requestId={row.original.id}
                    currentStatus={row.original.status}
                    onUpdate={handleUpdateStatus}
                />
            ),
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const req = row.original;
                const totalPaid = req.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
                const isLocked = totalPaid > 0;
                return (
                    <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View / Pay
                        </Button>
                        {isLocked ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground h-8 w-8 cursor-default"
                                disabled
                                title="Locked: payment has been recorded on this request"
                            >
                                <Lock className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                onClick={() => setRequestToDelete(req)}
                                title="Delete Request"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                );
            },
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

            {/* Direct add-request dialog for farmers who don't belong to a group */}
            <AddEditRequestDialog
                open={isAddRequestOpen}
                onOpenChange={setIsAddRequestOpen}
                request={null}
                onSave={handleSaveDirectRequest}
                prefillFarmerId={farmerId}
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

// ─── Status Cell ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: FarmerRequest['status'][] = ['Pending', 'Approved', 'Rejected', 'Delivered'];

const STATUS_COLORS: Record<string, string> = {
    Delivered: 'text-green-600 dark:text-green-400',
    Approved:  'text-blue-600  dark:text-blue-400',
    Rejected:  'text-red-600   dark:text-red-400',
    Pending:   'text-orange-500 dark:text-orange-400',
};

function StatusCell({
    requestId,
    currentStatus,
    onUpdate,
}: {
    requestId: string;
    currentStatus: string;
    onUpdate: (id: string, status: FarmerRequest['status']) => Promise<void>;
}) {
    const [loading, setLoading] = React.useState(false);

    const handleChange = async (val: string) => {
        if (val === currentStatus) return;
        setLoading(true);
        try {
            await onUpdate(requestId, val as FarmerRequest['status']);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select value={currentStatus} onValueChange={handleChange} disabled={loading}>
            <SelectTrigger className={`h-7 w-28 text-xs border-dashed ${STATUS_COLORS[currentStatus] ?? ''}`}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s} className={STATUS_COLORS[s]}>
                        {s}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
