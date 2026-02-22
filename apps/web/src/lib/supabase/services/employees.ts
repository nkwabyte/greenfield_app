'use client';
import { supabase } from '@/lib/supabase/client';
import type { Employee } from '@/lib/types';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';

/**
 * Delta sync: fetches only employees modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getSupabaseEmployees(lastSyncTime?: number): Promise<Employee[]> {
    let query = supabase.from('employees').select('*').order('updated_at', { ascending: false });

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapEmployeeRow);
}

/**
 * Paginated delta sync for employees.
 */
export async function getSupabaseEmployeesPaginated(
    lastSyncTime?: number,
    offset = 0,
    chunkSize = 500
): Promise<{ employees: Employee[]; hasMore: boolean }> {
    let query = supabase
        .from('employees')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(offset, offset + chunkSize - 1);

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const employees = (data || []).map(mapEmployeeRow);
    return {
        employees,
        hasMore: employees.length === chunkSize,
    };
}

export async function addSupabaseEmployee(employeeData: EmployeeFormValues, id: string) {
    const { startDate, ...rest } = employeeData;
    const { error } = await supabase.from('employees').insert({
        id,
        ...rest,
        start_date: new Date(startDate).toISOString(),
        is_verified: true, // Admin-created employees are automatically verified
    });
    if (error) throw error;
}

export async function updateSupabaseEmployee(id: string, employeeData: EmployeeFormValues) {
    const { startDate, ...rest } = employeeData;
    const { error } = await supabase.from('employees').update({
        ...rest,
        start_date: new Date(startDate).toISOString(),
    }).eq('id', id);
    if (error) throw error;
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteSupabaseEmployee(id: string) {
    const { error } = await supabase.from('employees').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

/** Maps a Postgres snake_case row to a camelCase Employee object */
function mapEmployeeRow(row: any): Employee {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        salary: row.salary,
        startDate: row.start_date ? new Date(row.start_date).toISOString() : '',
        status: row.status,
        isVerified: row.is_verified ?? true,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
    };
}
