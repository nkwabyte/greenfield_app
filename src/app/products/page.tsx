'use client';

import * as React from 'react';
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
import { useProducts } from '@/hooks/use-products';
import { RootState } from '@/lib/store/store';
import { useSelector } from 'react-redux';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
});

export default function ProductsPage() {
  const { toast } = useToast();
  const {
    data: products = [],
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const suppliers = useSelector((state: RootState) => state.suppliers.data);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<typeof products[0] | null>(null);

  React.useEffect(() => {
    // if suppliers are empty, show a warning toast
    if (suppliers.length === 0) {
      toast({
        title: 'No Suppliers Found',
        description: 'Please add suppliers before managing products.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const kpis: Kpi[] = React.useMemo(() => {
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const outOfStock = products.filter(p => p.quantity === 0).length;

    return [
      { label: 'Total Products', value: totalProducts.toString(), icon: Package },
      { label: 'Total Stock Value', value: currencyFormatter.format(totalStockValue), icon: Sigma },
      { label: 'Out of Stock', value: outOfStock.toString(), icon: AlertCircle },
    ];
  }, [products]);

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
        await updateProduct({ id: editingProduct.id, data });
        toast({ title: 'Product Updated', description: `${data.name}'s record has been updated.` });
      } else {
        await addProduct(data);
        toast({ title: 'Product Added', description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      toast({ title: 'Save Failed', description: 'An error occurred while saving the product.', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await deleteProduct(id);
        toast({ title: 'Product Deleted', description: 'The product record has been removed.' });
      } catch (error) {
        toast({ title: 'Delete Failed', description: 'An error occurred while deleting the product.', variant: 'destructive' });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteProduct,
    suppliers,
  }), [suppliers]);

  return (
    <AppShell>
      <PageHeader
        title="Product & Inventory Management"
        description="Monitor stock levels, manage products, and view supplier information."
      >
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Product
        </Button>
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

        <DataTable
          columns={columns}
          data={products}
          filterColumnId="name"
          filterPlaceholder="Filter by product name..."
          isLoading={isLoading}
        />
      </div>

      <AddEditProductDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        product={editingProduct}
        onSave={handleSaveProduct}
        suppliers={suppliers}
      />
    </AppShell>
  );
}
