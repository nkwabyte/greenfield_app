/**
 * Optimized Redux State Management Strategy for Large Datasets
 *
 * PROBLEM: Storing thousands of records in Redux causes performance issues
 * SOLUTION: Store only metadata and pagination state in Redux, read data from Dexie on-demand
 *
 * This approach:
 * - Keeps Redux state minimal (counts, filters, pagination)
 * - Reads data from IndexedDB when needed (fast local queries)
 * - Uses React Query or useLiveQuery for real-time updates
 * - Maintains sync status in Redux
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ============================================================================
// STATE INTERFACE - Minimal, metadata only
// ============================================================================

export interface DataState {
    // Metadata (not the actual data)
    counts: {
        farmers: number;
        employees: number;
        products: number;
        suppliers: number;
        transactions: number;
    };

    // Sync status
    sync: {
        isOnline: boolean;
        pendingCount: number;
        lastSyncAt?: number;
        isSyncing: boolean;
        isPaused: boolean;
        // Per-entity Supabase → Dexie initial sync progress
        entitySync: {
            farmers: { status: 'idle' | 'syncing' | 'done' | 'error'; count: number };
            employees: { status: 'idle' | 'syncing' | 'done' | 'error'; count: number };
            suppliers: { status: 'idle' | 'syncing' | 'done' | 'error'; count: number };
            products: { status: 'idle' | 'syncing' | 'done' | 'error'; count: number };
        };
    };

    // Pagination state (for UI)
    pagination: {
        farmers: { page: number; pageSize: number };
        employees: { page: number; pageSize: number };
        products: { page: number; pageSize: number };
        suppliers: { page: number; pageSize: number };
        transactions: { page: number; pageSize: number };
    };

    // Active filters (for UI state)
    filters: {
        farmers?: {
            region?: string;
            district?: string;
            society?: string;
            status?: 'Active' | 'Inactive';
        };
        employees?: {
            role?: string;
            status?: string;
        };
        products?: {
            category?: string;
            supplierId?: string;
        };
        transactions?: {
            type?: 'Income' | 'Expense';
            category?: string;
            startDate?: string;
            endDate?: string;
        };
    };

    // Loading states
    loading: {
        farmers: boolean;
        employees: boolean;
        products: boolean;
        suppliers: boolean;
        transactions: boolean;
    };
}

const initialState: DataState = {
    counts: {
        farmers: 0,
        employees: 0,
        products: 0,
        suppliers: 0,
        transactions: 0,
    },
    sync: {
        isOnline: true,
        pendingCount: 0,
        isSyncing: false,
        isPaused: false,
        entitySync: {
            farmers: { status: 'idle', count: 0 },
            employees: { status: 'idle', count: 0 },
            suppliers: { status: 'idle', count: 0 },
            products: { status: 'idle', count: 0 },
        },
    },
    pagination: {
        farmers: { page: 1, pageSize: 50 },
        employees: { page: 1, pageSize: 50 },
        products: { page: 1, pageSize: 50 },
        suppliers: { page: 1, pageSize: 50 },
        transactions: { page: 1, pageSize: 50 },
    },
    filters: {},
    loading: {
        farmers: false,
        employees: false,
        products: false,
        suppliers: false,
        transactions: false,
    },
};

// ============================================================================
// SLICE
// ============================================================================

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        // Update counts
        setCounts(state, action: PayloadAction<Partial<DataState['counts']>>) {
            state.counts = { ...state.counts, ...action.payload };
        },

        // Update sync status
        setSyncStatus(state, action: PayloadAction<Partial<Omit<DataState['sync'], 'entitySync'>>>) {
            state.sync = { ...state.sync, ...action.payload };
        },

        // Update per-entity Supabase→Dexie sync status
        setEntitySyncStatus(
            state,
            action: PayloadAction<{
                entity: keyof DataState['sync']['entitySync'];
                status: 'idle' | 'syncing' | 'done' | 'error';
                count?: number;
            }>
        ) {
            const { entity, status, count } = action.payload;
            state.sync.entitySync[entity] = {
                status,
                count: count ?? state.sync.entitySync[entity].count,
            };
        },

        // Update pagination
        setPagination(
            state,
            action: PayloadAction<{
                entity: keyof DataState['pagination'];
                page?: number;
                pageSize?: number;
            }>
        ) {
            const { entity, page, pageSize } = action.payload;
            if (page !== undefined) {
                state.pagination[entity].page = page;
            }
            if (pageSize !== undefined) {
                state.pagination[entity].pageSize = pageSize;
            }
        },

        // Update filters
        setFilters(
            state,
            action: PayloadAction<{
                entity: keyof DataState['filters'];
                filters: any;
            }>
        ) {
            const { entity, filters } = action.payload;
            state.filters[entity] = filters;
        },

        // Clear filters
        clearFilters(state, action: PayloadAction<keyof DataState['filters']>) {
            delete state.filters[action.payload];
        },

        // Update loading state
        setLoading(
            state,
            action: PayloadAction<{
                entity: keyof DataState['loading'];
                loading: boolean;
            }>
        ) {
            state.loading[action.payload.entity] = action.payload.loading;
        },
    },
});

export const {
    setCounts,
    setSyncStatus,
    setEntitySyncStatus,
    setPagination,
    setFilters,
    clearFilters,
    setLoading,
} = dataSlice.actions;

export default dataSlice.reducer;
