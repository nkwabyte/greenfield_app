'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, ClipboardList, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { useFarmerRequests, useFarmers } from '@/hooks/useData';
import { addFarmerRequest, updateFarmerRequest } from '@/lib/db/services/farmer-requests';
import type { FarmerRequest, Farmer } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RequestFormValues } from '@/components/requests/add-edit-request-dialog';
import { format } from 'date-fns';

const AddEditRequestDialog = dynamic(
    () => import('@/components/requests/add-edit-request-dialog').then(mod => mod.AddEditRequestDialog),
    { ssr: false }
);

export default function FarmerRequestsPage() {
    const { toast } = useToast();
    const requests = useFarmerRequests();
    const farmers = useFarmers();

    const [search, setSearch] = React.useState('');
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
    const [editingRequest, setEditingRequest] = React.useState<FarmerRequest | null>(null);

    const handleOpenAddDialog = () => {
        setEditingRequest(null);
        setIsAddEditDialogOpen(true);
    };

    const handleOpenEditDialog = (req: FarmerRequest) => {
        setEditingRequest(req);
        setIsAddEditDialogOpen(true);
    };

    const handleSaveRequest = async (data: RequestFormValues) => {
        try {
            if (editingRequest) {
                await updateFarmerRequest(editingRequest.id, {
                    ...data,
                    requestDate: data.requestDate.toISOString()
                });
                toast({ title: 'Success', description: 'Request updated successfully.' });
            } else {
                const id = uuidv4();
                await addFarmerRequest({
                    ...data,
                    requestDate: data.requestDate.toISOString()
                }, id);
                toast({ title: 'Success', description: 'Request created successfully.' });
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Could not save the request.', variant: 'destructive' });
        }
    };

    const farmerMap = React.useMemo(() => {
        const map = new Map<string, Farmer>();
        if (farmers) {
            farmers.forEach(f => map.set(f.id, f));
        }
        return map;
    }, [farmers]);

    const filteredRequests = React.useMemo(() => {
        if (!requests) return [];
        if (!search) return requests;

        return requests.filter(req => {
            const farmer = farmerMap.get(req.farmerId);
            const farmerName = farmer ? farmer.name.toLowerCase() : '';
            return farmerName.includes(search.toLowerCase()) || req.seasonYear.includes(search);
        });
    }, [requests, search, farmerMap]);

    return (
        <AppShell>
            <PageHeader title="Farmer Requests" description="Manage dynamic input requests and prices for farmers.">
                <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Request
                </Button>
            </PageHeader>

            <div className="flex items-center space-x-2 mb-6 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
                <Input
                    placeholder="Search by farmer name or year..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {!requests || !farmers ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading requests...</div>
            ) : filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 py-24 border rounded-xl bg-card border-dashed">
                    <ClipboardList className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-medium">No Requests Found</h3>
                    <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                        {search ? 'No requests match your search.' : 'There are no pending or approved requests yet.'}
                    </p>
                    {!search && (
                        <Button onClick={handleOpenAddDialog} variant="outline">
                            Create your first request
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map(req => {
                        const farmer = farmerMap.get(req.farmerId);

                        return (
                            <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow relative" onClick={() => handleOpenEditDialog(req)}>
                                <div className="absolute right-4 top-4">
                                    <Badge variant={
                                        req.status === 'Approved' ? 'default' :
                                            req.status === 'Delivered' ? 'secondary' :
                                                req.status === 'Rejected' ? 'destructive' : 'outline'
                                    }>
                                        {req.status === 'Pending' && <Clock className="mr-1 h-3 w-3" />}
                                        {req.status === 'Approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                                        {req.status}
                                    </Badge>
                                </div>
                                <CardHeader className="pb-3 border-b">
                                    <p className="text-sm text-muted-foreground mb-1">
                                        {format(new Date(req.requestDate), 'MMM d, yyyy')} • {req.seasonYear} Season
                                    </p>
                                    <CardTitle className="text-lg">
                                        {farmer ? farmer.name : 'Unknown Farmer'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="space-y-2">
                                        {req.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="truncate pr-4 text-muted-foreground">
                                                    {item.quantity}x {item.productName}
                                                </span>
                                                <span className="font-medium">₵{item.total.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {req.items.length > 3 && (
                                            <div className="text-xs text-muted-foreground italic">
                                                + {req.items.length - 3} more items
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-3 mt-3 border-t">
                                        <span className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Total</span>
                                        <span className="font-bold text-lg">₵{req.grandTotal.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AddEditRequestDialog
                open={isAddEditDialogOpen}
                onOpenChange={setIsAddEditDialogOpen}
                request={editingRequest}
                onSave={handleSaveRequest}
            />
        </AppShell>
    );
}
