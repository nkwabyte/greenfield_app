'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { FarmerRequest } from '@/lib/types';
import { PackageOpen, Calendar, CircleDollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

    // TODO: Pull financial records when the FarmerPayments table is implemented
    const dummyFinancials = {
        totalAmount: 0,
        depositPaid: 0,
        outstandingBalance: 0
    };

    if (requests && requests.length > 0) {
        dummyFinancials.totalAmount = requests.reduce((acc, req) => acc + (req.grandTotal || 0), 0);
        dummyFinancials.outstandingBalance = dummyFinancials.totalAmount - dummyFinancials.depositPaid;
    }

    const handleAddRequestClick = () => {
        if (!farmerGroupId) {
            onRequireGroup?.();
            return;
        }
        // Placeholder for future add request functionality
        alert("Add request form coming soon!");
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
            cell: ({ row }) => <div className="font-bold">GH₵{(row.original.grandTotal || 0).toFixed(2)}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <Badge variant={
                        status === 'Approved' ? 'default' :
                            status === 'Delivered' ? 'default' : // Should probably be success but default is fine
                                status === 'Rejected' ? 'destructive' : 'secondary'
                    }>
                        {status}
                    </Badge>
                );
            }
        },
    ];

    if (!requests) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-24 bg-muted rounded-xl"></div>
                <div className="h-64 bg-muted rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Request Value</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">GH₵{dummyFinancials.totalAmount.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Deposit Paid</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">GH₵{dummyFinancials.depositPaid.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">GH₵{dummyFinancials.outstandingBalance.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

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
        </div>
    );
}

