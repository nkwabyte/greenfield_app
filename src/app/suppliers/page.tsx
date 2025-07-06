'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/suppliers/supplier-columns';
import { useToast } from '@/hooks/use-toast';
import { AddEditSupplierDialog, type SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { useSuppliers } from '@/hooks/use-suppliers';

export default function SuppliersPage() {
  const { toast } = useToast();
  const {
    data: suppliers = [],
    isLoading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<typeof suppliers[0] | null>(null);

  const handleOpenAddDialog = () => {
    setEditingSupplier(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (supplier: typeof suppliers[0]) => {
    setEditingSupplier(supplier);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveSupplier = async (data: SupplierFormValues) => {
    try {
      if (editingSupplier) {
        await updateSupplier({ id: editingSupplier.id, data });
        toast({ title: "Supplier Updated", description: `${data.name}'s record has been updated.` });
      } else {
        await addSupplier(data);
        toast({ title: "Supplier Added", description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the supplier.", variant: "destructive" });
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      try {
        await deleteSupplier(supplierId);
        toast({ title: "Supplier Deleted", description: "The supplier record has been removed." });
      } catch (error) {
        toast({ title: "Delete Failed", description: "An error occurred while deleting the supplier.", variant: "destructive" });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteSupplier,
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
          isLoading={isLoading}
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
