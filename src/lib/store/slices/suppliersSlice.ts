import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Farmer, Supplier } from '@/lib/types';

interface SuppliersState {
    data: Supplier[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: SuppliersState = {
    data: [],
    status: 'idle',
};

const suppliersSlice = createSlice({
    name: 'suppliers',
    initialState,
    reducers: {
        setSuppliers(state, action: PayloadAction<Supplier[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addSupplier(state, action: PayloadAction<Supplier>) {
            state.data.unshift(action.payload);
        },
        updateSupplier(state, action: PayloadAction<Supplier>) {
            const index = state.data.findIndex(f => f.id === action.payload.id);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteSupplier(state, action: PayloadAction<string>) {
            state.data = state.data.filter(f => f.id !== action.payload);
        },
        setLoading(state) {
            state.status = 'loading';
        },
        setError(state, action: PayloadAction<string>) {
            state.status = 'failed';
            state.error = action.payload;
        },
    },
});

export const {
    setSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    setLoading,
    setError,
} = suppliersSlice.actions;

export default suppliersSlice.reducer;
