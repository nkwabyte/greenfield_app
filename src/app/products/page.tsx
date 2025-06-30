'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Sigma, AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/products/product-columns';
import type { Product, Supplier, Kpi } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditProductDialog, type ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { getProducts, addProduct, updateProduct, deleteProduct } from '@/lib/firebase/services/products';
import { getSuppliers } from '@/lib/firebase/services/suppliers';
import { Skeleton } from '@/components/ui/skeleton';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  const fetchAndSetData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [productData, supplierData] = await Promise.all([
        getProducts(),
        getSuppliers(),
      ]);
      setProducts(productData);
      setSuppliers(supplierData);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not retrieve product data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetData();
  }, [fetchAndSetData]);

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
  
  const handleOpenEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsAddEditDialogOpen(true);
  };
  
  const handleSaveProduct = async (data: ProductFormValues) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, data);
        toast({ title: "Product Updated", description: `${data.name}'s record has been updated.` });
      } else {
        await addProduct(data);
        toast({ title: "Product Added", description: `${data.name} has been added to the system.` });
      }
      fetchAndSetData();
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the product.", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      try {
        await deleteProduct(productId);
        toast({ title: "Product Deleted", description: "The product record has been removed." });
        fetchAndSetData();
      } catch (error) {
        toast({ title: "Delete Failed", description: "An error occurred while deleting the product.", variant: "destructive" });
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
          {isLoading ? <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </> : kpis.map(kpi => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
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
