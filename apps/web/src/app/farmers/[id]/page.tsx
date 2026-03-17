'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFarmer } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { ArrowLeft, Edit, MapPin, Phone, Calendar, Ruler, User, UsersRound } from 'lucide-react';
import { RelatedFarmers } from '@/components/farmers/related-farmers';
import { AddEditFarmerDialog, type FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { AddToGroupDialog } from '@/components/farmers/add-to-group-dialog';
import { updateFarmer as updateFarmerService } from '@/lib/db/services/farmers';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmerRequestsList } from '@/components/farmers/farmer-requests-list';
import { FarmerPaymentsTab } from '@/components/farmers/farmer-payments-tab';

export default function FarmerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = React.use(params);
    const farmer = useFarmer(id);
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);

    if (farmer === undefined) {
        return (
            <AppShell>
                <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </AppShell>
        );
    }

    if (farmer === null) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <h2 className="text-2xl font-bold">Farmer not found</h2>
                    <Button variant="link" onClick={() => router.back()}>Go back</Button>
                </div>
            </AppShell>
        );
    }

    const handleSave = async (data: FarmerFormValues) => {
        try {
            await updateFarmerService(farmer.id, data);
            toast({ title: "Updated", description: "Farmer details updated successfully." });
            setIsEditOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update farmer.", variant: "destructive" });
        }
    };

    const handleSaveGroup = async (groupId: string) => {
        try {
            await updateFarmerService(farmer.id, { groupId } as any);
            toast({ title: "Updated", description: "Farmer assigned to group successfully." });
            setIsGroupDialogOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to assign farmer to group.", variant: "destructive" });
        }
    };

    return (
        <AppShell>
            <div className="space-y-6 pb-10">
                <Button variant="ghost" className="-ml-4 w-fit" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Farmers
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{farmer.name}</h1>
                        <div className="flex items-center text-muted-foreground mt-1">
                            <MapPin className="mr-1 h-4 w-4" />
                            {farmer.society ? `${farmer.society}, ` : ''}{farmer.district}, {farmer.region}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsGroupDialogOpen(true)}>
                            <UsersRound className="mr-2 h-4 w-4" />
                            {farmer.groupId ? 'Change Group' : 'Add to Group'}
                        </Button>
                        <Button onClick={() => setIsEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="requests">Product Requests</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Main Details */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Farmer Information</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Status</span>
                                        <div>
                                            <Badge variant={farmer.status === 'Active' ? 'default' : 'secondary'}>
                                                {farmer.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Gender</span>
                                        <div className="font-medium flex items-center">
                                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {farmer.gender || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Phone</span>
                                        <div className="font-medium flex items-center">
                                            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {farmer.contact || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Age</span>
                                        <div className="font-medium">{farmer.age ? `${farmer.age} years` : 'N/A'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Education</span>
                                        <div className="font-medium">{farmer.educationLevel || 'None'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Cocoa District</span>
                                        <div className="font-medium flex items-center">
                                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {farmer.cocoaDistrict || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Join Date</span>
                                        <div className="font-medium flex items-center">
                                            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {farmer.joinDate ? new Date(farmer.joinDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Farm Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Farm Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Farm Size</span>
                                        <div className="text-2xl font-bold flex items-baseline">
                                            <Ruler className="mr-2 h-5 w-5 text-muted-foreground self-center" />
                                            {farmer.farmSize || 0} <span className="text-sm font-normal text-muted-foreground ml-1">acres</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Crops Grown</span>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {Array.isArray(farmer.cropsGrown) && farmer.cropsGrown.length > 0 ? (
                                                farmer.cropsGrown.map((crop, i) => (
                                                    <Badge key={i} variant="outline">{crop}</Badge>
                                                ))
                                            ) : typeof farmer.cropsGrown === 'string' && farmer.cropsGrown ? (
                                                (farmer.cropsGrown as string).split(',').map((crop, i) => (
                                                    <Badge key={i} variant="outline">{crop.trim()}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground italic">None listed</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <RelatedFarmers farmer={farmer} />
                    </TabsContent>

                    <TabsContent value="requests" className="space-y-6">
                        <FarmerRequestsList
                            farmerId={farmer.id}
                            farmerGroupId={farmer.groupId}
                            onRequireGroup={() => setIsGroupDialogOpen(true)}
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-6">
                        <FarmerPaymentsTab farmerId={farmer.id} />
                    </TabsContent>
                </Tabs>

                <AddEditFarmerDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    farmer={farmer}
                    onSave={handleSave}
                />

                <AddToGroupDialog
                    open={isGroupDialogOpen}
                    onOpenChange={setIsGroupDialogOpen}
                    currentGroupId={farmer.groupId}
                    onSave={handleSaveGroup}
                />
            </div>
        </AppShell>
    );
}
