'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupplier } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { ArrowLeft, Edit, Mail, Phone, User, Calendar, Building2, Package, PlusCircle } from 'lucide-react';
import { SupplierProducts } from '@/components/suppliers/supplier-products';
import { AddEditSupplierDialog, type SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { updateSupplier as updateSupplierService } from '@/lib/db/services/suppliers';
import { addProduct as addProductService } from '@/lib/db/services/products';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductsBySupplier, useSuppliers } from '@/hooks/useData';
import { AddEditProductDialog, type ProductFormValues } from '@/components/products/add-edit-product-dialog';

export default function SupplierDetailsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <SupplierDetailsContent />
        </React.Suspense>
    );
}

function SupplierDetailsContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const supplier = useSupplier(id || '');
    const products = useProductsBySupplier(id || '');
    const suppliers = useSuppliers();
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);

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

    const handleSaveProduct = async (data: ProductFormValues) => {
        try {
            await addProductService(data, crypto.randomUUID());
            toast({ title: "Added", description: "Product has been added to this supplier." });
            setIsAddProductOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
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
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => setIsAddProductOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                        <Button onClick={() => setIsEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/15 dark:to-blue-600/5 border-blue-200/50 dark:border-blue-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/90 mb-1">Products</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{productCount}</p>
                                </div>
                                <Package className="h-8 w-8 text-blue-500/40 dark:text-blue-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/15 dark:to-emerald-600/5 border-emerald-200/50 dark:border-emerald-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/90 mb-1">Total Units</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalUnits.toLocaleString()}</p>
                                </div>
                                <Package className="h-8 w-8 text-emerald-500/40 dark:text-emerald-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-violet-50 to-violet-100/50 dark:from-violet-500/15 dark:to-violet-600/5 border-violet-200/50 dark:border-violet-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/90 mb-1">Inventory Value</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">GH₵ {totalInventoryValue.toFixed(0)}</p>
                                </div>
                                <Package className="h-8 w-8 text-violet-500/40 dark:text-violet-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/15 dark:to-amber-600/5 border-amber-200/50 dark:border-amber-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/90 mb-1">Categories</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{categories.length}</p>
                                </div>
                                <Package className="h-8 w-8 text-amber-500/40 dark:text-amber-400/40" />
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

                <AddEditProductDialog
                    open={isAddProductOpen}
                    onOpenChange={setIsAddProductOpen}
                    product={null}
                    onSave={handleSaveProduct}
                    suppliers={suppliers || []}
                    defaultSupplierId={supplier.id}
                />
            </div>
        </AppShell>
    );
}
