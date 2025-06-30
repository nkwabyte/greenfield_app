
'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { FarmerDataTable } from '@/components/farmers/farmer-data-table';
import { getColumns } from '@/components/employees/employee-columns';
import { mockEmployees } from '@/lib/mock-data';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AddEditEmployeeDialog, type EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';

export default function EmployeesPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = React.useState<Employee[]>(() => 
    mockEmployees.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<Employee | null>(null);

  const handleOpenAddDialog = () => {
    setEditingEmployee(null);
    setIsAddEditDialogOpen(true);
  };
  
  const handleOpenEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsAddEditDialogOpen(true);
  };
  
  const handleSaveEmployee = (data: EmployeeFormValues) => {
    const now = new Date().toISOString();
    
    if (editingEmployee) {
      // Edit mode
      const updatedEmployees = employees.map(e => 
        e.id === editingEmployee.id 
          ? { ...e, ...data, startDate: data.startDate.toISOString(), updatedAt: now } 
          : e
      );
      setEmployees(updatedEmployees.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Employee Updated", description: `${data.name}'s record has been updated.` });
    } else {
      // Add mode
      const newEmployee: Employee = {
        id: `EMP${Date.now()}`,
        ...data,
        startDate: data.startDate.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      setEmployees(prev => [...prev, newEmployee].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      toast({ title: "Employee Added", description: `${data.name} has been added to the system.` });
    }
  };

  const columns = React.useMemo(() => getColumns({
    onEdit: handleOpenEditDialog,
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
        <FarmerDataTable columns={columns} data={employees} />
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
