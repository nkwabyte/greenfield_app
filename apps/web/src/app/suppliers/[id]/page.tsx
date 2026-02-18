'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { ArrowLeft, Edit, Mail, Phone, User, Calendar, Building2, Package } from 'lucide-react';
import { SupplierProducts } from '@/components/suppliers/supplier-products';
import { AddEditSupplierDialog, type SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { updateSupplier as updateSupplierService } from '@/lib/db/services/suppliers';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductsBySupplier } from '@/hooks/useData';

export default function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = React.use(params);
    const supplier = useSupplier(id);
    const products = useProductsBySupplier(id);
    const [isEditOpen, setIsEditOpen] = React.useState(false);

    if (supplier === undefined) {
        return (
            <AppShell>
                <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-64 md:col-span-2" />
                        <Skeleton className="h-64" />
                    </div>
                    <Skeleton className="h-80 w-full" />
                </div>
            </AppShell>
        );
    }

    if (supplier === null) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h2 className="text-2xl font-bold">Supplier not found</h2>
                    <p className="text-muted-foreground mt-1 mb-4">The supplier you're looking for doesn't exist or has been removed.</p>
                    <Button variant="link" onClick={() => router.back()}>Go back</Button>
                </div>
            </AppShell>
        );
    }

    const handleSave = async (data: SupplierFormValues) => {
        try {
            await updateSupplierService(supplier.id, data);
            toast({ title: "Updated", description: "Supplier details updated successfully." });
            setIsEditOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update supplier.", variant: "destructive" });
        }
    };

    const productCount = products?.length ?? 0;
    const totalInventoryValue = (products ?? []).reduce((sum, p) => sum + p.price * p.quantity, 0);
    const totalUnits = (products ?? []).reduce((sum, p) => sum + p.quantity, 0);
    const categories = [...new Set((products ?? []).map(p => p.category))];

    return (
        <AppShell>
            <div className="space-y-6 pb-10">
                <Button variant="ghost" className="-ml-4 w-fit" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{supplier.name}</h1>
                        <div className="flex items-center text-muted-foreground mt-1">
                            <Building2 className="mr-1.5 h-4 w-4" />
                            Supplier since {new Date(supplier.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <Button onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10 border-blue-200/50 dark:border-blue-800/30">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Products</p>
                                    <p className="text-2xl font-bold">{productCount}</p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500/60" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/10 border-green-200/50 dark:border-green-800/30">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Units</p>
                                    <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
                                </div>
                                <Package className="h-8 w-8 text-green-500/60" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/10 border-purple-200/50 dark:border-purple-800/30">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Inventory Value</p>
                                    <p className="text-2xl font-bold">GH₵ {totalInventoryValue.toFixed(0)}</p>
                                </div>
                                <Package className="h-8 w-8 text-purple-500/60" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 border-amber-200/50 dark:border-amber-800/30">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Categories</p>
                                    <p className="text-2xl font-bold">{categories.length}</p>
                                </div>
                                <Package className="h-8 w-8 text-amber-500/60" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Contact Information */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Contact Person</span>
                                <div className="font-medium flex items-center">
                                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {supplier.contactPerson}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Email</span>
                                <div className="font-medium flex items-center">
                                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">
                                        {supplier.email}
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Phone</span>
                                <div className="font-medium flex items-center">
                                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${supplier.phone}`} className="hover:underline">
                                        {supplier.phone}
                                    </a>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Added</span>
                                <div className="font-medium flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {new Date(supplier.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Supply Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                                <div className="font-medium flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {new Date(supplier.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Product Categories</span>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {categories.length > 0 ? (
                                        categories.map((cat, i) => (
                                            <Badge key={i} variant="outline">{cat}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground italic">No products yet</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Products Table */}
                <SupplierProducts supplierId={supplier.id} />

                <AddEditSupplierDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    supplier={supplier}
                    onSave={handleSave}
                />
            </div>
        </AppShell>
    );
}
