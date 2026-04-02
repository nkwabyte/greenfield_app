'use client';
import { supabase } from '@/lib/supabase/client';
import type { Transaction } from '@/lib/types';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';

/**
 * Delta sync: fetches only transactions modified since lastSyncTime.
 * Includes soft-deleted records so the local DB can remove them.
 */
export async function getSupabaseTransactions(lastSyncTime?: number): Promise<Transaction[]> {
    let query = supabase.from('transactions').select('*');

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate).order('updated_at', { ascending: false });
    } else {
        query = query.order('date', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapTransactionRow);
}

/**
 * Paginated delta sync for transactions.
 */
export async function getSupabaseTransactionsPaginated(
    lastSyncTime?: number,
    offset = 0,
    chunkSize = 500
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
    let query = supabase.from('transactions').select('*').range(offset, offset + chunkSize - 1);

    if (lastSyncTime) {
        const isoDate = new Date(lastSyncTime).toISOString();
        query = query.gt('updated_at', isoDate).order('updated_at', { ascending: false });
    } else {
        query = query.order('date', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    const transactions = (data || []).map(mapTransactionRow);
    return {
        transactions,
        hasMore: transactions.length === chunkSize,
    };
}

export async function addSupabaseTransaction(transactionData: TransactionFormValues, id: string) {
    const { date, employeeName, ...rest } = transactionData as any;
    const { error } = await supabase.from('transactions').insert({
        id,
        ...rest,
        date: new Date(date).toISOString(),
        employee_name: employeeName,
    });
    if (error) throw error;
}

export async function updateSupabaseTransaction(id: string, transactionData: TransactionFormValues) {
    const { date, employeeName, ...rest } = transactionData as any;
    const { error } = await supabase.from('transactions').update({
        ...rest,
        date: new Date(date).toISOString(),
        employee_name: employeeName,
    }).eq('id', id);
    if (error) throw error;
}

/**
 * Soft-delete: marks the record as deleted so other devices pick it up via delta sync.
 */
export async function deleteSupabaseTransaction(id: string) {
    const { error } = await supabase.from('transactions').update({ deleted: true }).eq('id', id);
    if (error) throw error;
}

/** Maps a Postgres snake_case row to a camelCase Transaction object */
function mapTransactionRow(row: any): Transaction {
    return {
        id: row.id,
        type: row.type,
        category: row.category,
        description: row.description,
        amount: row.amount,
        date: row.date ? new Date(row.date).toISOString() : '',
        employeeName: row.employee_name,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
        deleted: row.deleted,
    };
}
