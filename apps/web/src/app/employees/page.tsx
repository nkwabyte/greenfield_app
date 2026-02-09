'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/employees/employee-columns';
import { useToast } from '@/hooks/use-toast';
import { AddEditEmployeeDialog, type EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { useEmployeesPaginated } from '@/hooks/useData';

export default function EmployeesPage() {
  const { toast } = useToast();

  // Pagination State
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Dexie Hook (1-indexed page for Dexie, 0-indexed for Table)
  const result = useEmployeesPaginated(pagination.pageIndex + 1, pagination.pageSize);

  const employees = result?.data ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const isLoading = !result;

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<typeof employees[0] | null>(null);

  const handleOpenAddDialog = () => {
    setEditingEmployee(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (employee: typeof employees[0]) => {
    setEditingEmployee(employee);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveEmployee = async (data: EmployeeFormValues) => {
    try {
      if (editingEmployee) {
        // Direct Service Call
        const { updateEmployee } = await import('@/lib/db/services/employees');
        await updateEmployee(editingEmployee.id, data);
        toast({ title: "Employee Updated", description: `${data.name}'s record has been updated.` });
      } else {
        // Direct Service Call
        const { addEmployee } = await import('@/lib/db/services/employees');
        await addEmployee(data, crypto.randomUUID());
        toast({ title: "Employee Added", description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the employee.", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      try {
        const { deleteEmployee } = await import('@/lib/db/services/employees');
        await deleteEmployee(employeeId);
        toast({ title: "Employee Deleted", description: "The employee record has been removed." });
      } catch (error) {
        toast({ title: "Delete Failed", description: "An error occurred while deleting the employee.", variant: "destructive" });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteEmployee,
  }), []);

  return (
    <AppShell>
      <PageHeader
        title="Employee Management"
        description="View, add, edit, and manage all employee records."
      >
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Employee
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        <DataTable
          columns={columns}
          data={employees}
          filterColumnId="name"
          filterPlaceholder="Filter by name..."
          isLoading={isLoading}
          // Pagination Props
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </div>

      <AddEditEmployeeDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        employee={editingEmployee}
        onSave={handleSaveEmployee}
      />
    </AppShell>
  );
}
