
'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Sigma, AlertCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/products/product-columns';
import { mockProducts, mockSuppliers } from '@/lib/mock-data';
import type { Product, Supplier, Kpi } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditProductDialog, type ProductFormValues } from '@/components/products/add-edit-product-dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>(() =>
    mockProducts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );
  const [suppliers] = React.useState<Supplier[]>(mockSuppliers);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

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
  
  const handleSaveProduct = (data: ProductFormValues) => {
    const now = new Date().toISOString();
    
    if (editingProduct) {
      // Edit mode
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id 
          ? { ...editingProduct, ...data, updatedAt: now } 
          : p
      );
      setProducts(updatedProducts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Product Updated", description: `${data.name}'s record has been updated.` });
    } else {
      // Add mode
      const newProduct: Product = {
        id: `PROD${Date.now()}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      setProducts(prev => [...prev, newProduct].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Product Added", description: `${data.name} has been added to the system.` });
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
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
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <DataTable
          columns={columns} 
          data={products}
          filterColumnId="name"
          filterPlaceholder="Filter by product name..."
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
