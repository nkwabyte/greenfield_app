'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/employees/employee-columns';
import { useToast } from '@/hooks/use-toast';
import { AddEditEmployeeDialog, type EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { EmployeeSuccessDialog } from '@/components/employees/employee-success-dialog';
import { EmployeeFilters, type EmployeeFiltersState } from '@/components/employees/employee-filters';
import { useEmployeesPaginatedAndFiltered } from '@/hooks/useData';

export default function EmployeesPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Pagination State
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Filter State
  const [filters, setFilters] = React.useState<EmployeeFiltersState>({
    role: 'all',
    status: 'all',
    search: '',
  });

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [filters.role, filters.status, debouncedSearch]);

  // Dexie Hook
  const result = useEmployeesPaginatedAndFiltered(
    pagination.pageIndex + 1,
    pagination.pageSize,
    {
      role: filters.role === 'all' ? undefined : filters.role as any,
      status: filters.status === 'all' ? undefined : filters.status as any,
      search: debouncedSearch
    }
  );

  // Maintain last results for smoother transitions/loading
  const [data, setData] = React.useState<{ data: any[], total: number } | null>(null);

  React.useEffect(() => {
    if (result) {
      setData(result);
    }
  }, [result]);

  const employees = result?.data ?? data?.data ?? [];
  const totalCount = result?.total ?? data?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const isLoading = !result && !data;

  // Handle case where current page becomes empty after deletion
  React.useEffect(() => {
    if (result && result.data.length === 0 && pagination.pageIndex > 0 && result.total > 0) {
      const maxPage = Math.ceil(result.total / pagination.pageSize);
      if (pagination.pageIndex + 1 > maxPage) {
        setPagination(prev => ({ ...prev, pageIndex: Math.max(0, maxPage - 1) }));
      }
    }
  }, [result, pagination.pageIndex, pagination.pageSize]);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false);
  const [newEmployeeData, setNewEmployeeData] = React.useState<{ name: string, email: string, password: string } | null>(null);
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
        const password = await addEmployee(data);

        // Show custom success dialog
        setNewEmployeeData({
          name: data.name,
          email: data.email,
          password: password
        });
        setIsSuccessDialogOpen(true);

        toast({ title: "Employee Added", description: `${data.name} has been added to the system.` });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Save Failed", description: "An error occurred while saving the employee.", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      try {
        const { deleteEmployee } = await import('@/lib/db/services/employees');
        await deleteEmployee(employeeId);

        // No need to manually refresh, useLiveQuery handles it
        // But we might want to adjust pagination if the page is now empty
        // which is handled by the useEffect above

        toast({ title: "Employee Deleted", description: "The employee record has been removed." });
      } catch (error) {
        console.error(error);
        toast({ title: "Delete Failed", description: "An error occurred while deleting the employee.", variant: "destructive" });
      }
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
    onDelete: handleDeleteEmployee,
    onViewDetails: (employee) => router.push(`/employees/${employee.id}`),
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

      <EmployeeFilters filters={filters} onFilterChange={setFilters} />

      <div className="grid gap-6">
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isLoading}
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
          onRowClick={(row) => router.push(`/employees/${row.id}`)}
        />
      </div>

      <AddEditEmployeeDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        employee={editingEmployee}
        onSave={handleSaveEmployee}
      />

      <EmployeeSuccessDialog
        open={isSuccessDialogOpen}
        onOpenChange={setIsSuccessDialogOpen}
        employeeData={newEmployeeData}
      />
    </AppShell>
  );
}
