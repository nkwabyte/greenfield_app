
'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/suppliers/supplier-columns';
import { mockSuppliers } from '@/lib/mock-data';
import type { Supplier } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditSupplierDialog, type SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';

export default function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(() =>
    mockSuppliers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);

  const handleOpenAddDialog = () => {
    setEditingSupplier(null);
    setIsAddEditDialogOpen(true);
  };
  
  const handleOpenEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsAddEditDialogOpen(true);
  };
  
  const handleSaveSupplier = (data: SupplierFormValues) => {
    const now = new Date().toISOString();
    
    if (editingSupplier) {
      // Edit mode
      const updatedSuppliers = suppliers.map(s => 
        s.id === editingSupplier.id 
          ? { ...s, ...data, updatedAt: now } 
          : s
      );
      setSuppliers(updatedSuppliers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Supplier Updated", description: `${data.name}'s record has been updated.` });
    } else {
      // Add mode
      const newSupplier: Supplier = {
        id: `SUP${Date.now()}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Supplier Added", description: `${data.name} has been added to the system.` });
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
  }), []);


  return (
    <AppShell>
      <PageHeader 
        title="Supplier Management"
        description="View, add, edit, and manage all supplier records."
      >
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Supplier
        </Button>
      </PageHeader>
      
      <div className="grid gap-6">
        <DataTable
          columns={columns} 
          data={suppliers}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
        />
      </div>
      
      <AddEditSupplierDialog 
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </AppShell>
  );
}
