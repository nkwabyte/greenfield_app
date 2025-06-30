'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/employees/employee-columns';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditEmployeeDialog, type EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '@/lib/firebase/services/employees';

export default function EmployeesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);

  const fetchAndSetEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const employeeData = await getEmployees();
      setEmployees(employeeData);
    } catch (error) {
      toast({ title: "Error fetching employees", description: "Could not retrieve employee data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetEmployees();
  }, [fetchAndSetEmployees]);

  const handleOpenAddDialog = () => {
    setEditingEmployee(null);
    setIsAddEditDialogOpen(true);
  };
  
  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsAddEditDialogOpen(true);
  };
  
  const handleSaveEmployee = async (data: EmployeeFormValues) => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, data);
        toast({ title: "Employee Updated", description: `${data.name}'s record has been updated.` });
      } else {
        await addEmployee(data);
        toast({ title: "Employee Added", description: `${data.name} has been added to the system.` });
      }
      fetchAndSetEmployees();
    } catch (error) {
      toast({ title: "Save Failed", description: "An error occurred while saving the employee.", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      try {
        await deleteEmployee(employeeId);
        toast({ title: "Employee Deleted", description: "The employee record has been removed." });
        fetchAndSetEmployees();
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
