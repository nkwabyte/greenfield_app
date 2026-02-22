/**
 * Offline-First CRUD Service for Employees
 * Implements Dexie-first approach with automatic sync to Supabase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Employee } from '@/lib/types';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { getSupabaseEmployees } from '@/lib/supabase/services/employees';

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
 * Get simple employee options for dropdowns (Memory Optimized)
 */
export async function getEmployeeOptions(): Promise<Pick<Employee, 'id' | 'name'>[]> {
    return await db.employees
        .toArray(employees => employees.map(e => ({
            id: e.id,
            name: e.name
        })));
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
 * Get employees with pagination AND filtering
 */
export async function getEmployeesPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        role?: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
        status?: 'Active' | 'On Leave' | 'Terminated';
        search?: string;
    }
): Promise<{ data: Employee[], total: number }> {
    let collection = db.employees.toCollection();

    // Apply filtering
    if (filters.role) {
        collection = db.employees.where('role').equals(filters.role);
    }

    // If we have a secondary filter or search, we might need to filter manually or use compound indices.
    // Dexie filtering:
    let filteredCollection = collection.filter(employee => {
        let matches = true;

        if (filters.role && employee.role !== filters.role) matches = false;
        if (filters.status && employee.status !== filters.status) matches = false;

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const nameMatch = employee.name.toLowerCase().includes(searchLower);
            const emailMatch = employee.email.toLowerCase().includes(searchLower);
            if (!nameMatch && !emailMatch) matches = false;
        }

        return matches;
    });

    const total = await filteredCollection.count();
    const data = await filteredCollection
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

    return { data, total };
}

/**
 * Add a new employee (offline-first)
 */
export async function addEmployee(
    employeeData: EmployeeFormValues,
    id?: string // Made optional as we might use Auth UID
): Promise<string> {
    const now = new Date().toISOString();

    // 1. Generate Password (8 characters)
    const password = Math.random().toString(36).slice(-8);

    // 2. Create Auth User (if online)
    // Note: This requires online connection. If offline, we might need a different strategy 
    // or queue it. For now, assuming admin implies online for this action or we handle error.
    let authUid = id;
    try {
        const { createEmployeeAuth } = await import('@/lib/supabase/admin-auth');
        authUid = await createEmployeeAuth(employeeData.email, password);
    } catch (error) {
        console.error("Failed to create auth user, falling back to local ID", error);
        // If auth creation fails, we might want to stop or continue with local ID.
        // For now, let's continue but warn. 
        // Ideally we should throw if this is a strict requirement.
        if (!authUid) authUid = crypto.randomUUID();
    }

    const employee: Employee = {
        id: authUid!,
        name: employeeData.name,
        email: employeeData.email,
        role: employeeData.role,
        salary: employeeData.salary,
        startDate: typeof employeeData.startDate === 'string'
            ? employeeData.startDate
            : employeeData.startDate.toISOString(),
        status: employeeData.status,
        isVerified: true, // Admin-created employees are automatically verified
        createdAt: now,
        updatedAt: now,
    };

    // 1. Save to local database immediately
    await db.employees.add(employee);

    // 2. Add to sync queue
    await syncService.addToQueue('employee', 'create', authUid!, { ...employeeData, password });

    return password;
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
}

/**
 * Delete an employee (offline-first)
 */
export async function deleteEmployee(id: string): Promise<void> {
    const existing = await db.employees.get(id);

    // 1. Delete from local database
    await db.employees.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('employee', 'delete', id, null);
}

/**
 * Sync employees from Supabase to local database (delta sync)
 */
export async function syncEmployeesFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_employees');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // Capture start time BEFORE the query to avoid race conditions
        const syncStartTime = Date.now();

        let hasMore = true;
        let offset = 0;
        const chunkSize = 1000;
        let totalSynced = 0;

        while (hasMore) {
            const result = await import('@/lib/supabase/services/employees').then(m => m.getSupabaseEmployeesPaginated(lastSyncTime, offset, chunkSize));
            const supabaseEmployees = result.employees;
            hasMore = result.hasMore;

            if (supabaseEmployees.length > 0) {
                const employeesToPut: Employee[] = [];
                const idsToDelete: string[] = [];

                for (const employee of supabaseEmployees as (Employee & { deleted?: boolean })[]) {
                    if (employee.deleted) {
                        idsToDelete.push(employee.id);
                    } else {
                        delete employee.deleted;
                        employeesToPut.push(employee);
                    }
                }

                if (employeesToPut.length > 0) {
                    await db.employees.bulkPut(employeesToPut);
                }

                if (idsToDelete.length > 0) {
                    await db.employees.bulkDelete(idsToDelete);
                }

                totalSynced += supabaseEmployees.length;

                // Yield to main thread to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            offset += chunkSize;
        }

        localStorage.setItem('lastSync_employees', syncStartTime.toString());

        return totalSynced;
    } catch (error) {
        console.error('❌ Failed to sync employees from Supabase:', error);
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
