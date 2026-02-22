/**
 * Offline-First CRUD Service for Transactions
 * Implements Dexie-first approach with automatic sync to Supabase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Transaction } from '@/lib/types';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';
import { getSupabaseTransactions } from '@/lib/supabase/services/transactions';

/**
 * Get all transactions from local database
 */
export async function getAllTransactions(): Promise<Transaction[]> {
    return await db.transactions.toArray();
}

/**
 * Get a single transaction by ID from local database
 */
export async function getTransaction(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
}

/**
 * Get transactions with pagination
 */
export async function getPaginatedTransactions(page: number, pageSize: number): Promise<{ data: Transaction[], total: number }> {
    const total = await db.transactions.count();
    const data = await db.transactions
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
    return { data, total };
}

/**
 * Get transactions with filters
 */
export async function getTransactionsFiltered(filters: {
    type?: 'Income' | 'Expense';
    category?: string;
    startDate?: string;
    endDate?: string;
}): Promise<Transaction[]> {
    let collection = db.transactions.toCollection();

    if (filters.type) {
        collection = db.transactions.where('type').equals(filters.type);
    }
    if (filters.category) {
        collection = collection.and(t => t.category === filters.category);
    }
    if (filters.startDate || filters.endDate) {
        collection = collection.and(t => {
            const transactionDate = new Date(t.date);
            if (filters.startDate && transactionDate < new Date(filters.startDate)) {
                return false;
            }
            if (filters.endDate && transactionDate > new Date(filters.endDate)) {
                return false;
            }
            return true;
        });
    }

    return await collection.toArray();
}

/**
 * Get transactions within a date range
 */
export async function getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    // Ensure dates are ISO strings for comparison
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    return await db.transactions
        .where('date')
        .between(start, end, true, true)
        .toArray();
}

/**
 * Add a new transaction (offline-first)
 */
export async function addTransaction(
    transactionData: TransactionFormValues,
    id: string
): Promise<void> {
    const now = new Date().toISOString();

    const transaction: Transaction = {
        id,
        type: transactionData.type,
        category: transactionData.category,
        description: transactionData.description,
        amount: transactionData.amount,
        date: typeof transactionData.date === 'string'
            ? transactionData.date
            : transactionData.date.toISOString(),
        employeeName: transactionData.employeeName,
        createdAt: now,
        updatedAt: now,
    };

    // 1. Save to local database immediately
    await db.transactions.add(transaction);

    // 2. Add to sync queue
    await syncService.addToQueue('transaction', 'create', id, transactionData);
}

/**
 * Update an existing transaction (offline-first)
 */
export async function updateTransaction(
    id: string,
    transactionData: Partial<TransactionFormValues>
): Promise<void> {
    const now = new Date().toISOString();

    // Get existing transaction
    const existingTransaction = await db.transactions.get(id);
    if (!existingTransaction) {
        throw new Error(`Transaction with ID ${id} not found`);
    }

    // Merge updates with proper type conversion
    const { date: newDate, ...safeUpdates } = transactionData;

    const updatedTransaction: Transaction = {
        ...existingTransaction,
        ...safeUpdates,
        date: newDate
            ? (typeof newDate === 'string' ? newDate : newDate.toISOString())
            : existingTransaction.date,
        updatedAt: now,
    };

    // 1. Update local database
    await db.transactions.put(updatedTransaction);

    // 2. Add to sync queue
    await syncService.addToQueue('transaction', 'update', id, transactionData);
}

/**
 * Delete a transaction (offline-first)
 */
export async function deleteTransaction(id: string): Promise<void> {
    const existing = await db.transactions.get(id);

    // 1. Delete from local database
    await db.transactions.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('transaction', 'delete', id, null);
}

/**
 * Sync transactions from Supabase to local database (delta sync)
 */
export async function syncTransactionsFromSupabase(): Promise<number> {
    try {
        const lastSync = localStorage.getItem('lastSync_transactions');
        const lastSyncTime = lastSync ? parseInt(lastSync) : undefined;

        // Capture start time BEFORE the query to avoid race conditions
        const syncStartTime = Date.now();

        let hasMore = true;
        let offset = 0;
        const chunkSize = 1000;
        let totalSynced = 0;

        while (hasMore) {
            const result = await import('@/lib/supabase/services/transactions').then(m => m.getSupabaseTransactionsPaginated(lastSyncTime, offset, chunkSize));
            const supabaseTransactions = result.transactions;
            hasMore = result.hasMore;

            if (supabaseTransactions.length > 0) {
                const transactionsToPut: Transaction[] = [];
                const idsToDelete: string[] = [];

                for (const transaction of supabaseTransactions as (Transaction & { deleted?: boolean })[]) {
                    if (transaction.deleted) {
                        idsToDelete.push(transaction.id);
                    } else {
                        delete transaction.deleted;
                        transactionsToPut.push(transaction);
                    }
                }

                if (transactionsToPut.length > 0) {
                    await db.transactions.bulkPut(transactionsToPut);
                }

                if (idsToDelete.length > 0) {
                    await db.transactions.bulkDelete(idsToDelete);
                }

                totalSynced += supabaseTransactions.length;

                // Yield to main thread to prevent UI freezing
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            offset += chunkSize;
        }

        localStorage.setItem('lastSync_transactions', syncStartTime.toString());

        return totalSynced;
    } catch (error) {
        console.error('❌ Failed to sync transactions from Supabase:', error);
        throw error;
    }
}

/**
 * Get transactions count
 */
export async function getTransactionsCount(): Promise<number> {
    return await db.transactions.count();
}

/**
 * Get total income (Memory-Optimized using Cursors)
 */
export async function getTotalIncome(): Promise<number> {
    let total = 0;
    await db.transactions.where('type').equals('Income').each(t => {
        total += t.amount;
    });
    return total;
}

/**
 * Get total expenses (Memory-Optimized using Cursors)
 */
export async function getTotalExpenses(): Promise<number> {
    let total = 0;
    await db.transactions.where('type').equals('Expense').each(t => {
        total += t.amount;
    });
    return total;
}

/**
 * Get transactions by category (Memory-Optimized using Cursors)
 */
export async function getTransactionsByCategory(): Promise<Record<string, number>> {
    const categoryCounts: Record<string, number> = {};
    await db.transactions.each(t => {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });
    return categoryCounts;
}

/**
 * Get recent transactions (last N)
 */
export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return await db.transactions
        .orderBy('date')
        .reverse()
        .limit(limit)
        .toArray();
}
