/**
 * Custom React Hook for Dexie Live Queries
 * Provides real-time data from IndexedDB without storing in Redux
 * 
 * This hook uses Dexie's useLiveQuery to automatically update when data changes
 * Perfect for large datasets - only loads what's needed for current view
 */

'use client';

import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useLiveQuery } from '@/hooks/useLiveQuery';
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
    getFarmerOptions,
    getUniqueRegions,
    getUniqueDistricts,
    getUniqueSocieties,
    getUniqueCommunities,
    getSyncStats,
    getFarmersByFarmSize,
    getFarmersByAge,
    getFarmersByRegionAndGender,
    getArchivedFarmers,
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
    getEmployeeOptions,
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
    getProductOptions,
} from '@/lib/db/services/products';
import {
    getAllSuppliers,
    getPaginatedSuppliers, // NEW
    getSuppliersCount,
    getSupplierOptions,
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
    getFarmerGroupOptions,
    getArchivedFarmerGroups
} from '@/lib/db/services/farmer-groups';
import {
    getAllFarmerRequests,
    getFarmerRequest,
    getFarmerRequestsByFarmer,
    getFarmerRequestsByGroup,
    getFarmerRequestsCount,
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
 * Get simple farmer options for dropdowns and selectors
 */
export function useFarmerOptions() {
    return useLiveQuery(() => getFarmerOptions(), []);
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
        const statsDoc = await db.statistics.get('farmer_counts');

        // If cache exists, use it instantly
        if (statsDoc && statsDoc.byRegion) {
            const counts = { ...statsDoc.byRegion };
            delete counts['N/A'];
            delete counts[''];
            return counts;
        }

        // Cache missing or empty: Fire off cache rebuild in the background so future loads are instant
        const { updateFarmersCache } = await import('@/lib/db/services/farmers');
        updateFarmersCache().catch(console.error);

        return {};
    }, []);
}

/**
 * Get farmers by farm size directly using cache
 */
export function useFarmSizeStats() {
    return useLiveQuery(() => getFarmersByFarmSize(), []);
}

/**
 * Get farmers by age directly using cache
 */
export function useAgeStats() {
    return useLiveQuery(() => getFarmersByAge(), []);
}

/**
 * Get farmers by region and gender directly using cache
 */
export function useRegionGenderStats() {
    return useLiveQuery(() => getFarmersByRegionAndGender(), []);
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
        minFarmSize?: number;
        maxFarmSize?: number;
        gender?: string;
        minAge?: number;
        maxAge?: number;
        startDate?: Date;
        endDate?: Date;
        search?: string;
        allowedDistricts?: string[];
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
            filters.status,
            filters.minFarmSize,
            filters.maxFarmSize,
            filters.gender,
            filters.minAge,
            filters.maxAge,
            filters.startDate,
            filters.endDate,
            filters.search,
            filters.allowedDistricts?.join(',')  // stable dep key
        ]
    );
}

export function useUniqueRegions() {
    return useLiveQuery(() => getUniqueRegions(), []);
}

export function useUniqueDistricts(region?: string) {
    return useLiveQuery(() => getUniqueDistricts(region), [region]);
}

export function useArchivedFarmers() {
    return useLiveQuery(() => getArchivedFarmers(), []);
}

export function useUniqueSocieties(district?: string) {
    return useLiveQuery(() => getUniqueSocieties(district), [district]);
}

/** Alias for useUniqueSocieties — community is now merged into society. */
export function useUniqueCommunities(society?: string) {
    return useLiveQuery(() => getUniqueSocieties(society), [society]);
}

export function useFarmerSyncStats() {
    return useLiveQuery(() => getSyncStats(), []);
}

export function useFarmer(id: string) {
    return useLiveQuery(() => getFarmer(id), [id]);
}

export function useRelatedFarmers(farmer: Farmer | undefined | null) {
    return useLiveQuery(async () => {
        if (!farmer || !farmer.society) return [];
        // Match by society (community is merged into society)
        const allInSociety = await db.farmers.where('society').equals(farmer.society).toArray();
        return allInSociety.filter((f: Farmer) => f.id !== farmer.id);
    }, [farmer?.id, farmer?.society]);
}

// ============================================================================
// FARMER GROUPS HOOKS
// ============================================================================

export function useFarmerGroupOptions() {
    return useLiveQuery(() => getFarmerGroupOptions(), []);
}

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

export function useEmployeeOptions() {
    return useLiveQuery(() => getEmployeeOptions(), []);
}

// ============================================================================
// PRODUCTS HOOKS
// ============================================================================

export function useProductOptions() {
    return useLiveQuery(() => getProductOptions(), []);
}

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

export function useSupplierOptions() {
    return useLiveQuery(() => getSupplierOptions(), []);
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

// ============================================================================
// FARMER NAME MAP HOOK
// ============================================================================

export function useFarmerNameMap() {
    return useLiveQuery(async () => {
        const farmers = await db.farmers.toArray();
        const map = new Map<string, string>();
        for (const f of farmers) {
            map.set(f.id, f.name);
        }
        return map;
    }, []);
}

// ============================================================================
// GROUP FINANCIAL SUMMARY HOOKS
// ============================================================================

export interface GroupFinancialRow {
    groupId: string;
    groupName: string;
    region: string;
    district: string;
    totalRequests: number;
    totalOwed: number;
    totalPaid: number;
    outstanding: number;
    percentCollected: number;
}

export interface GroupFinancialSummary {
    groups: GroupFinancialRow[];
    totals: {
        totalOwed: number;
        totalPaid: number;
        outstanding: number;
        totalRequests: number;
        activeGroups: number;
        percentCollected: number;
    };
    monthlyPayments: { month: string; amount: number }[];
}

export function useGroupFinancialSummary(seasonYear: string) {
    return useLiveQuery(async () => {
        const allRequests = await db.farmerRequests.where('seasonYear').equals(seasonYear).toArray();
        const allGroups = await db.farmerGroups.toArray();

        const groupMap = new Map(allGroups.map(g => [g.id, g]));
        const groupFinances = new Map<string, { totalOwed: number; totalPaid: number; totalRequests: number }>();
        const monthlyPaymentsMap = new Map<string, number>();

        for (const req of allRequests) {
            if (!req.groupId) continue;

            const entry = groupFinances.get(req.groupId) || { totalOwed: 0, totalPaid: 0, totalRequests: 0 };
            entry.totalOwed += req.grandTotal || 0;
            entry.totalRequests += 1;

            if (req.payments && req.payments.length > 0) {
                for (const payment of req.payments) {
                    entry.totalPaid += payment.amount || 0;
                    const month = payment.monthOfPayment || 'Unknown';
                    monthlyPaymentsMap.set(month, (monthlyPaymentsMap.get(month) || 0) + (payment.amount || 0));
                }
            }

            groupFinances.set(req.groupId, entry);
        }

        const groups: GroupFinancialRow[] = [];
        for (const [groupId, finances] of groupFinances) {
            const group = groupMap.get(groupId);
            const outstanding = finances.totalOwed - finances.totalPaid;
            groups.push({
                groupId,
                groupName: group?.name || 'Unknown Group',
                region: group?.region || '',
                district: group?.district || '',
                totalRequests: finances.totalRequests,
                totalOwed: finances.totalOwed,
                totalPaid: finances.totalPaid,
                outstanding,
                percentCollected: finances.totalOwed > 0 ? (finances.totalPaid / finances.totalOwed) * 100 : 0,
            });
        }

        // Also include groups with seasonYear match but no requests yet
        const groupsForYear = allGroups.filter(g => g.seasonYear === seasonYear);
        for (const g of groupsForYear) {
            if (!groupFinances.has(g.id)) {
                groups.push({
                    groupId: g.id,
                    groupName: g.name,
                    region: g.region || '',
                    district: g.district || '',
                    totalRequests: 0,
                    totalOwed: 0,
                    totalPaid: 0,
                    outstanding: 0,
                    percentCollected: 0,
                });
            }
        }

        const totalOwed = groups.reduce((sum, g) => sum + g.totalOwed, 0);
        const totalPaid = groups.reduce((sum, g) => sum + g.totalPaid, 0);
        const totals = {
            totalOwed,
            totalPaid,
            outstanding: groups.reduce((sum, g) => sum + g.outstanding, 0),
            totalRequests: groups.reduce((sum, g) => sum + g.totalRequests, 0),
            activeGroups: groups.length,
            percentCollected: totalOwed > 0 ? (totalPaid / totalOwed) * 100 : 0,
        };

        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthlyPayments = Array.from(monthlyPaymentsMap.entries())
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

        return { groups, totals, monthlyPayments } as GroupFinancialSummary;
    }, [seasonYear]);
}

export function useAllTimeRequestFinancials() {
    return useLiveQuery(async () => {
        const allRequests = await db.farmerRequests.toArray();

        let totalOwed = 0;
        let totalPaid = 0;

        for (const req of allRequests) {
            totalOwed += req.grandTotal || 0;
            if (req.payments) {
                for (const p of req.payments) {
                    totalPaid += p.amount || 0;
                }
            }
        }

        return {
            totalOwed,
            totalPaid,
            outstanding: totalOwed - totalPaid,
        };
    }, []);
}

export function useFarmerRequestsCount() {
    return useLiveQuery(() => getFarmerRequestsCount(), []);
}

export function useArchivedFarmerGroups() {
    return useLiveQuery(() => getArchivedFarmerGroups(), []);
}

/**
 * Returns the assigned districts for the currently logged-in Field Agent.
 * Returns an empty array for Admin users or non-Field-Agent employees,
 * meaning no district restriction is applied.
 * Returns the district list from their employee record when they are a Field Agent.
 */
export function useFieldAgentDistricts(): string[] {
    const user = useSelector((state: RootState) => state.auth.user);
    const isFieldAgent = user?.jobTitle === 'Field Agent';

    const districts = useLiveQuery(async () => {
        if (!isFieldAgent || !user?.uid) return [];
        const employee = await db.employees.get(user.uid);
        return employee?.assignedDistricts ?? [];
    }, [user?.uid, isFieldAgent]);

    return districts ?? [];
}

/**
 * Live farmers array filtered by districts.
 * Pass null to skip (Admin users use cached stats instead).
 */
export function useFarmersByDistricts(districts: string[] | null) {
    return useLiveQuery(
        async () => {
            if (districts === null) return null;
            if (districts.length === 0) return db.farmers.filter(f => !f.isArchived && !f.deleted).toArray();
            return db.farmers
                .filter(f => !f.isArchived && !f.deleted && !!(f.district && districts.includes(f.district)))
                .toArray();
        },
        [districts === null ? 'null' : districts.join(',')]
    );
}

/**
 * Groups filtered by assigned districts (field agents) or all groups (admin).
 */
export function useFarmerGroupsByDistricts(districts: string[] | null) {
    return useLiveQuery(
        async () => {
            if (districts === null || districts.length === 0)
                return db.farmerGroups.filter(g => !g.isArchived && !g.deleted).toArray();
            return db.farmerGroups
                .filter(g => !g.isArchived && !g.deleted && !!(g.district && districts.includes(g.district)))
                .toArray();
        },
        [districts === null ? 'null' : districts.join(',')]
    );
}

