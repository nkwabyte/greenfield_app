'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/suppliers/supplier-columns';
import { useToast } from '@/hooks/use-toast';
import { AddEditSupplierDialog, type SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';
import { useSuppliersPaginated } from '@/hooks/useData';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

export default function SuppliersPage() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);
  const canEdit = user?.role !== 'Field Agent';
  const { toast } = useToast();

  // Pagination State — must be before any early return
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 100,
  });

  // Dexie Hook
  const result = useSuppliersPaginated(pagination.pageIndex + 1, pagination.pageSize);

  const suppliers = result?.data ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const isLoading = !result;

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<typeof suppliers[0] | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

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
        const { updateSupplier } = await import('@/lib/db/services/suppliers');
        await updateSupplier(editingSupplier.id, data);
        toast({ title: "Supplier Updated", description: `${data.name}'s record has been updated.` });
      } else {
        const { addSupplier } = await import('@/lib/db/services/suppliers');
        await addSupplier(data, crypto.randomUUID());
        toast({ title: "Supplier Added", description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the supplier.", variant: "destructive" });
    }
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setSupplierToDelete(supplierId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      const { deleteSupplier } = await import('@/lib/db/services/suppliers');
      await deleteSupplier(supplierToDelete);
      toast({ title: "Supplier Deleted", description: "The supplier record has been removed." });
    } catch (error) {
      toast({ title: "Delete Failed", description: "An error occurred while deleting the supplier.", variant: "destructive" });
    } finally {
      setSupplierToDelete(null);
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteSupplier,
    canEdit,
  }), [canEdit]);

  return (
    <AppShell>
      <PageHeader
        title="Supplier Management"
        description="View, add, edit, and manage all supplier records."
      >
        {canEdit && (
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2" />
            Add Supplier
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6">
        <DataTable
          columns={columns}
          data={suppliers}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
          isLoading={isLoading}
          // Pagination Props
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
          onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
        />
      </div>

      <AddEditSupplierDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        onConfirm={confirmDeleteSupplier}
      />
    </AppShell>
  );
}
