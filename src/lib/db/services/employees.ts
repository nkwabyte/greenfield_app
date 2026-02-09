/**
 * Offline-First CRUD Service for Employees
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Employee } from '@/lib/types';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { getFirebaseEmployees } from '@/lib/firebase/services/employees';

/**
 * Get all employees from local database
 */
export async function getAllEmployees(): Promise<Employee[]> {
    return await db.employees.toArray();
}

/**
 * Get a single employee by ID from local database
 */
export async function getEmployee(id: string): Promise<Employee | undefined> {
    return await db.employees.get(id);
}

/**
 * Get employees with pagination
 */
export async function getPaginatedEmployees(page: number, pageSize: number): Promise<{ data: Employee[], total: number }> {
    const total = await db.employees.count();
    const data = await db.employees
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    return { data, total };
}

/**
 * Get employees with filters
 */
export async function getEmployeesFiltered(filters: {
    role?: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
    status?: 'Active' | 'On Leave' | 'Terminated';
}): Promise<Employee[]> {
    let collection = db.employees.toCollection();

    if (filters.role) {
        collection = db.employees.where('role').equals(filters.role);
    }
    if (filters.status) {
        collection = collection.and(e => e.status === filters.status);
    }

    return await collection.toArray();
}

/**
 * Add a new employee (offline-first)
 */
export async function addEmployee(
    employeeData: EmployeeFormValues,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const employee: Employee = {
        id,
        name: employeeData.name,
        email: employeeData.email,
        role: employeeData.role,
        salary: employeeData.salary,
        startDate: typeof employeeData.startDate === 'string'
            ? employeeData.startDate
            : employeeData.startDate.toISOString(),
        status: employeeData.status,
        createdAt: now,
        updatedAt: now,
    };

    // 1. Save to local database immediately
    await db.employees.add(employee);

    // 2. Add to sync queue
    await syncService.addToQueue('employee', 'create', id, employeeData);

    console.log(`✅ Employee added locally: ${employee.name}`);
}

/**
 * Update an existing employee (offline-first)
 */
export async function updateEmployee(
    id: string,
    employeeData: Partial<EmployeeFormValues>
): Promise<void> {
    const now = new Date().toISOString();

    // Get existing employee
    const existingEmployee = await db.employees.get(id);
    if (!existingEmployee) {
        throw new Error(`Employee with ID ${id} not found`);
    }

    // Merge updates with proper type conversion
    const { startDate: newStartDate, ...safeUpdates } = employeeData;

    const updatedEmployee: Employee = {
        ...existingEmployee,
        ...safeUpdates,
        startDate: newStartDate
            ? (typeof newStartDate === 'string' ? newStartDate : newStartDate.toISOString())
            : existingEmployee.startDate,
        updatedAt: now,
    };

    // 1. Update local database
    await db.employees.put(updatedEmployee);

    // 2. Add to sync queue
    await syncService.addToQueue('employee', 'update', id, employeeData);

    console.log(`✅ Employee updated locally: ${updatedEmployee.name}`);
}

/**
 * Delete an employee (offline-first)
 */
export async function deleteEmployee(id: string): Promise<void> {
    // 1. Delete from local database
    await db.employees.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('employee', 'delete', id, null);

    console.log(`✅ Employee deleted locally: ${id}`);
}

/**
 * Sync employees from Firebase to local database
 */
export async function syncEmployeesFromFirebase(): Promise<number> {
    try {
        const firebaseEmployees = await getFirebaseEmployees();

        // Clear local employees and replace with Firebase data
        await db.employees.clear();
        await db.employees.bulkAdd(firebaseEmployees);

        console.log(`✅ Synced ${firebaseEmployees.length} employees from Firebase`);
        return firebaseEmployees.length;
    } catch (error) {
        console.error('❌ Failed to sync employees from Firebase:', error);
        throw error;
    }
}

/**
 * Get employees count
 */
export async function getEmployeesCount(): Promise<number> {
    return await db.employees.count();
}

/**
 * Get employees by role (for analytics)
 */
export async function getEmployeesByRole(): Promise<Record<string, number>> {
    const employees = await db.employees.toArray();
    const roleCounts: Record<string, number> = {};

    employees.forEach(employee => {
        roleCounts[employee.role] = (roleCounts[employee.role] || 0) + 1;
    });

    return roleCounts;
}

/**
 * Get employees by status (for analytics)
 */
export async function getEmployeesByStatus(): Promise<Record<string, number>> {
    const employees = await db.employees.toArray();
    const statusCounts: Record<string, number> = {};

    employees.forEach(employee => {
        statusCounts[employee.status] = (statusCounts[employee.status] || 0) + 1;
    });

    return statusCounts;
}
