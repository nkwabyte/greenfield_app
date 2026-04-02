'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProduct, useSupplier } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { ArrowLeft, Edit, Package, Tag, DollarSign, Hash, Building2, ExternalLink } from 'lucide-react';
import { AddEditProductDialog, type ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { updateProduct as updateProductService } from '@/lib/db/services/products';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuppliers } from '@/hooks/useData';
import Link from 'next/link';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
});

function getStockStatus(quantity: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' };
    if (quantity < 10) return { label: 'Low Stock', variant: 'secondary' };
    return { label: 'In Stock', variant: 'default' };
}

export default function ProductDetailsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ProductDetailsContent />
        </React.Suspense>
    );
}

function ProductDetailsContent() {
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const product = useProduct(id || '');
    const suppliers = useSuppliers();
    const supplier = useSupplier(product?.supplierId ?? '');
    const [isEditOpen, setIsEditOpen] = React.useState(false);

    if (product === undefined) {
        return (
            <AppShell>
                <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-64 md:col-span-2" />
                        <Skeleton className="h-64" />
                    </div>
                </div>
            </AppShell>
        );
    }

    if (!product) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h2 className="text-2xl font-bold">Product not found</h2>
                    <p className="text-muted-foreground mt-1 mb-4">The product you're looking for doesn't exist or has been removed.</p>
                    <Button variant="link" onClick={() => router.back()}>Go back</Button>
                </div>
            </AppShell>
        );
    }

    const stockStatus = getStockStatus(product.quantity);
    const inventoryValue = product.price * product.quantity;

    const handleSave = async (data: ProductFormValues) => {
        try {
            await updateProductService(product.id, data);
            toast({ title: 'Updated', description: 'Product details updated successfully.' });
            setIsEditOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update product.', variant: 'destructive' });
        }
    };

    return (
        <AppShell>
            <div className="space-y-6 pb-10">
                <Button variant="ghost" className="-ml-4 w-fit" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{product.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{product.category}</Badge>
                            <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                        </div>
                    </div>
                    <Button onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/15 dark:to-blue-600/5 border-blue-200/50 dark:border-blue-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/90 mb-1">Unit Price</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{currencyFormatter.format(product.price)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500/40 dark:text-blue-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/15 dark:to-emerald-600/5 border-emerald-200/50 dark:border-emerald-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/90 mb-1">Quantity</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{product.quantity.toLocaleString()}</p>
                                </div>
                                <Hash className="h-8 w-8 text-emerald-500/40 dark:text-emerald-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-violet-50 to-violet-100/50 dark:from-violet-500/15 dark:to-violet-600/5 border-violet-200/50 dark:border-violet-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/90 mb-1">Inventory Value</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{currencyFormatter.format(inventoryValue)}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-violet-500/40 dark:text-violet-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-linear-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/15 dark:to-amber-600/5 border-amber-200/50 dark:border-amber-500/20 shadow-none">
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/90 mb-1">Category</p>
                                    <p className="text-lg font-bold truncate text-slate-900 dark:text-white">{product.category}</p>
                                </div>
                                <Tag className="h-8 w-8 text-amber-500/40 dark:text-amber-400/40" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Product Details */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Product Name</span>
                                <div className="font-medium flex items-center">
                                    <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {product.name}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Category</span>
                                <div className="font-medium flex items-center">
                                    <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {product.category}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Unit Price</span>
                                <div className="font-medium flex items-center">
                                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {currencyFormatter.format(product.price)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Stock Quantity</span>
                                <div className="font-medium flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    {product.quantity.toLocaleString()}
                                    <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.label}</Badge>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Date Added</span>
                                <div className="font-medium text-sm">
                                    {new Date(product.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                                <div className="font-medium text-sm">
                                    {new Date(product.updatedAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supplier Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {supplier ? (
                                <>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Supplier Name</span>
                                        <div className="font-medium flex items-center">
                                            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {supplier.name}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Contact Person</span>
                                        <div className="font-medium text-sm">{supplier.contactPerson}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Email</span>
                                        <a href={`mailto:${supplier.email}`} className="text-primary hover:underline text-sm block">
                                            {supplier.email}
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Phone</span>
                                        <a href={`tel:${supplier.phone}`} className="hover:underline text-sm block">
                                            {supplier.phone}
                                        </a>
                                    </div>
                                    <Link href={`/suppliers/details?id=${supplier.id}`}>
                                        <Button variant="outline" size="sm" className="w-full mt-2">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Supplier
                                        </Button>
                                    </Link>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No supplier information available.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <AddEditProductDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    product={product}
                    onSave={handleSave}
                    suppliers={suppliers || []}
                />
            </div>
        </AppShell>
    );
}
