/**
 * Custom React Hook for Dexie Live Queries
 * Provides real-time data from IndexedDB without storing in Redux
 * 
 * This hook uses Dexie's useLiveQuery to automatically update when data changes
 * Perfect for large datasets - only loads what's needed for current view
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';

// ... (imports)
import {
    getAllFarmers,
    getPaginatedFarmers, // NEW
    getFarmersFiltered,
    getFarmersCount,
    getFarmersByRegion,
    getFarmersByGender,
    getFarmersByDateRange,
    getFarmersPaginatedAndFiltered, // NEW
} from '@/lib/db/services/farmers';
import {
    getAllEmployees,
    getPaginatedEmployees, // NEW
    getEmployeesFiltered,
    getEmployeesCount,
    getEmployeesByRole,
    getEmployeesByStatus,
} from '@/lib/db/services/employees';
import {
    getAllProducts,
    getPaginatedProducts, // NEW
    getProductsFiltered,
    getProductsCount,
    getProductsByCategory,
    getLowStockProducts,
} from '@/lib/db/services/products';
import {
    getAllSuppliers,
    getPaginatedSuppliers, // NEW
    getSuppliersCount,
} from '@/lib/db/services/suppliers';
import {
    getAllTransactions,
    getPaginatedTransactions, // NEW
    getTransactionsFiltered,
    getTransactionsCount,
    getTotalIncome,
    getTotalExpenses,
    getRecentTransactions,
    getTransactionsByDateRange, // NEW
} from '@/lib/db/services/transactions';

import type { Farmer, Employee, Product, Supplier, Transaction } from '@/lib/types';

// ============================================================================
// FARMERS HOOKS
// ============================================================================

/**
 * Get all farmers with live updates
 * Use with caution for large datasets - prefer useFarmersPaginated
 */
export function useFarmers() {
    return useLiveQuery(() => getAllFarmers(), []);
}

/**
 * Get filtered farmers with live updates
 */
export function useFarmersFiltered(filters: {
    region?: string;
    district?: string;
    society?: string;
    status?: 'Active' | 'Inactive';
}) {
    return useLiveQuery(
        () => getFarmersFiltered(filters),
        [filters.region, filters.district, filters.society, filters.status]
    );
}

/**
 * Get paginated farmers (Optimized: Fetches only current page)
 */
export function useFarmersPaginated(page: number = 1, pageSize: number = 50) {
    return useLiveQuery(
        () => getPaginatedFarmers(page, pageSize),
        [page, pageSize]
    );
}

/**
 * Get farmers count
 */
export function useFarmersCount() {
    return useLiveQuery(() => getFarmersCount(), []);
}

/**
 * Get farmers by region (for analytics)
 */
export function useFarmersByRegion() {
    return useLiveQuery(() => getFarmersByRegion(), []);
}

/**
 * Get farmers by gender (for analytics)
 */
export function useFarmersByGender() {
    return useLiveQuery(() => getFarmersByGender(), []);
}

/**
 * Get farmers by date range (for growth charts)
 */
export function useFarmersByDateRange(dateRange: { from?: Date; to?: Date } | undefined) {
    return useLiveQuery(() => {
        if (!dateRange?.from || !dateRange?.to) return getAllFarmers();
        // Adjust end date to include the full day
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        return getFarmersByDateRange(dateRange.from, end);
    }, [dateRange?.from, dateRange?.to]);
}

/**
 * Get farmers with pagination AND filtering
 */
export function useFarmersPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        region?: string;
        district?: string;
        society?: string;
        status?: 'Active' | 'Inactive';
        search?: string;
    }
) {
    return useLiveQuery(
        () => getFarmersPaginatedAndFiltered(page, pageSize, filters),
        [page, pageSize, filters.region, filters.district, filters.society, filters.status, filters.search]
    );
}

// ============================================================================
// EMPLOYEES HOOKS
// ============================================================================

export function useEmployees() {
    return useLiveQuery(() => getAllEmployees(), []);
}

export function useEmployeesPaginated(page: number = 1, pageSize: number = 50) {
    return useLiveQuery(
        () => getPaginatedEmployees(page, pageSize),
        [page, pageSize]
    );
}

export function useEmployeesFiltered(filters: {
    role?: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
    status?: 'Active' | 'On Leave' | 'Terminated';
}) {
    return useLiveQuery(
        () => getEmployeesFiltered(filters),
        [filters.role, filters.status]
    );
}

export function useEmployeesCount() {
    return useLiveQuery(() => getEmployeesCount(), []);
}

export function useEmployeesByRole() {
    return useLiveQuery(() => getEmployeesByRole(), []);
}

export function useEmployeesByStatus() {
    return useLiveQuery(() => getEmployeesByStatus(), []);
}

// ============================================================================
// PRODUCTS HOOKS
// ============================================================================

export function useProducts() {
    return useLiveQuery(() => getAllProducts(), []);
}

export function useProductsPaginated(page: number = 1, pageSize: number = 50) {
    return useLiveQuery(
        () => getPaginatedProducts(page, pageSize),
        [page, pageSize]
    );
}

export function useProductsFiltered(filters: {
    category?: string;
    supplierId?: string;
}) {
    return useLiveQuery(
        () => getProductsFiltered(filters),
        [filters.category, filters.supplierId]
    );
}

export function useProductsCount() {
    return useLiveQuery(() => getProductsCount(), []);
}

export function useProductsByCategory() {
    return useLiveQuery(() => getProductsByCategory(), []);
}

export function useLowStockProducts() {
    return useLiveQuery(() => getLowStockProducts(), []);
}

// ============================================================================
// SUPPLIERS HOOKS
// ============================================================================

export function useSuppliers() {
    return useLiveQuery(() => getAllSuppliers(), []);
}

export function useSuppliersPaginated(page: number = 1, pageSize: number = 50) {
    return useLiveQuery(
        () => getPaginatedSuppliers(page, pageSize),
        [page, pageSize]
    );
}

export function useSuppliersCount() {
    return useLiveQuery(() => getSuppliersCount(), []);
}

// ============================================================================
// TRANSACTIONS HOOKS
// ============================================================================

export function useTransactions() {
    return useLiveQuery(() => getAllTransactions(), []);
}

export function useTransactionsPaginated(page: number = 1, pageSize: number = 50) {
    return useLiveQuery(
        () => getPaginatedTransactions(page, pageSize),
        [page, pageSize]
    );
}

export function useTransactionsFiltered(filters: {
    type?: 'Income' | 'Expense';
    category?: string;
    startDate?: string;
    endDate?: string;
}) {
    return useLiveQuery(
        () => getTransactionsFiltered(filters),
        [filters.type, filters.category, filters.startDate, filters.endDate]
    );
}

export function useTransactionsByDateRange(dateRange: { from?: Date; to?: Date } | undefined) {
    return useLiveQuery(() => {
        if (!dateRange?.from || !dateRange?.to) return getAllTransactions();
        const end = new Date(dateRange.to);
        end.setHours(23, 59, 59, 999);
        return getTransactionsByDateRange(dateRange.from, end);
    }, [dateRange?.from, dateRange?.to]);
}

export function useTransactionsCount() {
    return useLiveQuery(() => getTransactionsCount(), []);
}

export function useTotalIncome() {
    return useLiveQuery(() => getTotalIncome(), []);
}

export function useTotalExpenses() {
    return useLiveQuery(() => getTotalExpenses(), []);
}

export function useRecentTransactions(limit: number = 10) {
    return useLiveQuery(() => getRecentTransactions(limit), [limit]);
}

// ... (combined hooks remain same)
export function useDashboardCounts() {
    const farmersCount = useFarmersCount();
    const employeesCount = useEmployeesCount();
    const productsCount = useProductsCount();
    const suppliersCount = useSuppliersCount();
    const transactionsCount = useTransactionsCount();

    return {
        farmers: farmersCount ?? 0,
        employees: employeesCount ?? 0,
        products: productsCount ?? 0,
        suppliers: suppliersCount ?? 0,
        transactions: transactionsCount ?? 0,
    };
}

export function useFinancialSummary() {
    const income = useTotalIncome();
    const expenses = useTotalExpenses();

    return {
        income: income ?? 0,
        expenses: expenses ?? 0,
        balance: (income ?? 0) - (expenses ?? 0),
    };
}

