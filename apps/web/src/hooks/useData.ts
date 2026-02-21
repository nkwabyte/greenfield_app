/**
 * Custom React Hook for Dexie Live Queries
 * Provides real-time data from IndexedDB without storing in Redux
 * 
 * This hook uses Dexie's useLiveQuery to automatically update when data changes
 * Perfect for large datasets - only loads what's needed for current view
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { GHANA_REGIONS, type GhanaRegion } from '@/lib/utils/region-normalizer';

// ... (imports)
import {
    getAllFarmers,
    getFarmer,
    getPaginatedFarmers,
    getFarmersFiltered,
    getFarmersCount,
    getFarmersByRegion,
    getFarmersByGender,
    getFarmersByDateRange,
    getFarmersPaginatedAndFiltered, // NEW
    getUniqueRegions,
    getUniqueDistricts,
    getUniqueSocieties,
    getUniqueCommunities,
    getSyncStats,
} from '@/lib/db/services/farmers';
import {
    getAllEmployees,
    getEmployee,
    getPaginatedEmployees,
    getEmployeesFiltered,
    getEmployeesCount,
    getEmployeesByRole,
    getEmployeesByStatus,
    getEmployeesPaginatedAndFiltered, // NEW
} from '@/lib/db/services/employees';
import {
    getAllProducts,
    getPaginatedProducts, // NEW
    getProductsFiltered,
    getProductsCount,
    getProductsByCategory,
    getLowStockProducts,
    getProductsPaginatedAndFiltered,
    getUniqueProductCategories,
    getProduct,
} from '@/lib/db/services/products';
import {
    getAllSuppliers,
    getPaginatedSuppliers, // NEW
    getSuppliersCount,
} from '@/lib/db/services/suppliers';
import {
    getAllTransactions,
    getPaginatedTransactions,
    getTransactionsFiltered,
    getTransactionsCount,
    getTotalIncome,
    getTotalExpenses,
    getRecentTransactions,
    getTransactionsByDateRange,
} from '@/lib/db/services/transactions';
import {
    getAllFarmerGroups,
    getFarmerGroup,
    getFarmerGroupsByYear,
} from '@/lib/db/services/farmer-groups';
import {
    getAllFarmerRequests,
    getFarmerRequest,
    getFarmerRequestsByFarmer,
    getFarmerRequestsByGroup,
} from '@/lib/db/services/farmer-requests';

import type { Farmer, Employee, Product, Supplier, Transaction, FarmerGroup, FarmerRequest } from '@/lib/types';

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
 * Get farmer counts per region directly
 */
export function useRegionCounts() {
    return useLiveQuery(async () => {
        const stats = await getFarmersByRegion();
        const counts = { ...stats };

        // Ensure N/A or empty regions are combined as "Unknown" for the UI
        const naCount = counts['N/A'] || 0;
        const emptyCount = counts[''] || 0;

        counts['Unknown'] = naCount + emptyCount;
        delete counts['N/A'];
        delete counts[''];

        return counts;
    }, []);
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
        community?: string;
        status?: 'Active' | 'Inactive';
        minFarmSize?: number;
        maxFarmSize?: number;
        gender?: string;
        minAge?: number;
        maxAge?: number;
        startDate?: Date;
        endDate?: Date;
        search?: string;
    }
) {
    return useLiveQuery(
        () => getFarmersPaginatedAndFiltered(page, pageSize, filters),
        [
            page,
            pageSize,
            filters.region,
            filters.district,
            filters.society,
            filters.community,
            filters.status,
            filters.minFarmSize,
            filters.maxFarmSize,
            filters.gender,
            filters.minAge,
            filters.maxAge,
            filters.startDate,
            filters.endDate,
            filters.search
        ]
    );
}

export function useUniqueRegions() {
    return useLiveQuery(() => getUniqueRegions(), []);
}

export function useUniqueDistricts(region?: string) {
    return useLiveQuery(() => getUniqueDistricts(region), [region]);
}

export function useUniqueSocieties(district?: string) {
    return useLiveQuery(() => getUniqueSocieties(district), [district]);
}

export function useUniqueCommunities(society?: string) {
    return useLiveQuery(() => getUniqueCommunities(society), [society]);
}

export function useFarmerSyncStats() {
    return useLiveQuery(() => getSyncStats(), []);
}

export function useFarmer(id: string) {
    return useLiveQuery(() => getFarmer(id), [id]);
}

export function useRelatedFarmers(farmer: Farmer | undefined | null) {
    return useLiveQuery(async () => {
        if (!farmer || !farmer.community) return [];
        // Match by community
        const allInCommunity = await db.farmers.where('community').equals(farmer.community).toArray();
        return allInCommunity.filter((f: Farmer) => f.id !== farmer.id);
    }, [farmer?.id, farmer?.community]);
}

// ============================================================================
// FARMER GROUPS HOOKS
// ============================================================================

export function useFarmerGroups() {
    return useLiveQuery(() => getAllFarmerGroups(), []);
}

export function useFarmerGroup(id: string) {
    return useLiveQuery(() => getFarmerGroup(id), [id]);
}

export function useFarmerGroupsByYear(year: string) {
    return useLiveQuery(() => getFarmerGroupsByYear(year), [year]);
}

// ============================================================================
// FARMER REQUESTS HOOKS
// ============================================================================

export function useFarmerRequests() {
    return useLiveQuery(() => getAllFarmerRequests(), []);
}

export function useFarmerRequest(id: string) {
    return useLiveQuery(() => getFarmerRequest(id), [id]);
}

export function useFarmerRequestsByFarmer(farmerId: string) {
    return useLiveQuery(() => getFarmerRequestsByFarmer(farmerId), [farmerId]);
}

export function useFarmerRequestsByGroup(groupId: string) {
    return useLiveQuery(() => getFarmerRequestsByGroup(groupId), [groupId]);
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

export function useEmployeesPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        role?: 'Manager' | 'Field Agent' | 'Accountant' | 'Support';
        status?: 'Active' | 'On Leave' | 'Terminated';
        search?: string;
    }
) {
    return useLiveQuery(
        () => getEmployeesPaginatedAndFiltered(page, pageSize, filters),
        [
            page,
            pageSize,
            filters.role,
            filters.status,
            filters.search
        ]
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

export function useEmployee(id: string) {
    return useLiveQuery(() => getEmployee(id), [id]);
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

export function useProductsPaginatedAndFiltered(
    page: number,
    pageSize: number,
    filters: {
        search?: string;
        category?: string;
        supplierId?: string;
        stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
    }
) {
    return useLiveQuery(
        () => getProductsPaginatedAndFiltered(page, pageSize, filters),
        [page, pageSize, filters.search, filters.category, filters.supplierId, filters.stockStatus]
    );
}

export function useUniqueProductCategories() {
    return useLiveQuery(() => getUniqueProductCategories(), []);
}

export function useProduct(id: string) {
    return useLiveQuery(() => getProduct(id), [id]);
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

export function useSupplier(id: string) {
    return useLiveQuery(async () => {
        const suppliers = await getAllSuppliers();
        return suppliers.find(s => s.id === id) ?? null;
    }, [id]);
}

export function useProductsBySupplier(supplierId: string) {
    return useLiveQuery(
        () => getProductsFiltered({ supplierId }),
        [supplierId]
    );
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

