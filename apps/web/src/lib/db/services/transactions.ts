/**
 * Offline-First CRUD Service for Transactions
 * Implements Dexie-first approach with automatic sync to Firebase
 */

import { db } from '../schema';
import { syncService } from '../sync';
import type { Transaction } from '@/lib/types';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';
import { getFirebaseTransactions } from '@/lib/firebase/services/transactions';

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

    // console.log(`✅ Transaction added locally: ${transaction.description}`);
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

    // console.log(`✅ Transaction updated locally: ${updatedTransaction.description}`);
}

/**
 * Delete a transaction (offline-first)
 */
export async function deleteTransaction(id: string): Promise<void> {
    // 1. Delete from local database
    await db.transactions.delete(id);

    // 2. Add to sync queue
    await syncService.addToQueue('transaction', 'delete', id, null);

    // console.log(`✅ Transaction deleted locally: ${id}`);
}

/**
 * Sync transactions from Firebase to local database
 */
export async function syncTransactionsFromFirebase(): Promise<number> {
    try {
        const firebaseTransactions = await getFirebaseTransactions();

        // Clear local transactions and replace with Firebase data
        await db.transactions.clear();
        await db.transactions.bulkAdd(firebaseTransactions);

        // console.log(`✅ Synced ${firebaseTransactions.length} transactions from Firebase`);
        return firebaseTransactions.length;
    } catch (error) {
        console.error('❌ Failed to sync transactions from Firebase:', error);
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
 * Get total income
 */
export async function getTotalIncome(): Promise<number> {
    const incomeTransactions = await db.transactions
        .where('type')
        .equals('Income')
        .toArray();

    return incomeTransactions.reduce((total, t) => total + t.amount, 0);
}

/**
 * Get total expenses
 */
export async function getTotalExpenses(): Promise<number> {
    const expenseTransactions = await db.transactions
        .where('type')
        .equals('Expense')
        .toArray();

    return expenseTransactions.reduce((total, t) => total + t.amount, 0);
}

/**
 * Get transactions by category (for analytics)
 */
export async function getTransactionsByCategory(): Promise<Record<string, number>> {
    const transactions = await db.transactions.toArray();
    const categoryCounts: Record<string, number> = {};

    transactions.forEach(transaction => {
        categoryCounts[transaction.category] = (categoryCounts[transaction.category] || 0) + 1;
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
