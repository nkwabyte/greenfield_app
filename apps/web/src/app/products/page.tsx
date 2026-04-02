'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Sigma, AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/products/product-columns';
import { useToast } from '@/hooks/use-toast';
import { AddEditProductDialog, type ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Kpi } from '@/lib/types';
import { useProductsPaginatedAndFiltered, useSupplierOptions } from '@/hooks/useData';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { ProductFilters, type ProductFiltersState } from '@/components/products/product-filters';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRequireRole } from '@/hooks/use-role-guard';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
});

export default function ProductsPage() {
  const router = useRouter();
  const { allowed } = useRequireRole(['Admin', 'General Manager', 'Operational Manager', 'Project Coordinator', 'Finance Manager', 'Administrative Member']);
  const { toast } = useToast();
  const user = useSelector((state: RootState) => state.auth.user);
  if (!allowed) return null;
  const canEdit = user?.role !== 'Field Agent';

  // Pagination State
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 100,
  });

  // Filter State
  const [filters, setFilters] = React.useState<ProductFiltersState>({
    search: '',
    category: 'all',
    stockStatus: 'all',
  });

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [filters.category, filters.stockStatus, debouncedSearch]);

  const result = useProductsPaginatedAndFiltered(
    pagination.pageIndex + 1,
    pagination.pageSize,
    {
      search: debouncedSearch || undefined,
      category: filters.category === 'all' ? undefined : filters.category,
      stockStatus: filters.stockStatus === 'all' ? undefined : filters.stockStatus as any,
    }
  );

  const products = result?.data ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const isLoading = !result;

  const suppliers = useSupplierOptions();
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<typeof products[0] | null>(null);
  const [productToDelete, setProductToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const kpis: Kpi[] = React.useMemo(() => {
    const totalProducts = totalCount;
    const totalStockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const outOfStock = products.filter(p => p.quantity === 0).length;

    return [
      { label: 'Total Products (All)', value: totalProducts.toString(), icon: Package },
      { label: 'Stock Value (Page)', value: currencyFormatter.format(totalStockValue), icon: Sigma },
      { label: 'Out of Stock (Page)', value: outOfStock.toString(), icon: AlertCircle },
    ];
  }, [products, totalCount]);

  const handleOpenAddDialog = () => {
    setEditingProduct(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (product: typeof products[0]) => {
    setEditingProduct(product);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveProduct = async (data: ProductFormValues) => {
    try {
      if (editingProduct) {
        const { updateProduct } = await import('@/lib/db/services/products');
        await updateProduct(editingProduct.id, data);
        toast({ title: 'Product Updated', description: `${data.name}'s record has been updated.` });
      } else {
        const { addProduct } = await import('@/lib/db/services/products');
        await addProduct(data, crypto.randomUUID());
        toast({ title: 'Product Added', description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      toast({ title: 'Save Failed', description: 'An error occurred while saving the product.', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { deleteProduct } = await import('@/lib/db/services/products');
      await deleteProduct(productToDelete);
      toast({ title: 'Product Deleted', description: 'The product record has been removed.' });
    } catch (error) {
      toast({ title: 'Delete Failed', description: 'An error occurred while deleting the product.', variant: 'destructive' });
    } finally {
      setProductToDelete(null);
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteProduct,
    suppliers: suppliers || [],
    canEdit,
  }), [suppliers, canEdit]);

  return (
    <AppShell>
      <PageHeader
        title="Product & Inventory Management"
        description="Monitor stock levels, manage products, and view supplier information."
      >
        {canEdit && (
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2" />
            Add Product
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)
          )}
        </div>

        <ProductFilters filters={filters} onFilterChange={setFilters} />

        <DataTable
          columns={columns}
          data={products}
          isLoading={isLoading}
          // Pagination Props
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
          onRowClick={(row) => router.push(`/products/details?id=${row.id}`)}
        />
      </div>

      <AddEditProductDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
        suppliers={suppliers || []}
      />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={confirmDeleteProduct}
      />
    </AppShell>
  );
}
