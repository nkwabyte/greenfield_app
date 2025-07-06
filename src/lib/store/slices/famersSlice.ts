import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Farmer } from '@/lib/types';

interface FarmersState {
    data: Farmer[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: FarmersState = {
    data: [],
    status: 'idle',
};

const farmersSlice = createSlice({
    name: 'farmers',
    initialState,
    reducers: {
        setFarmers(state, action: PayloadAction<Farmer[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addFarmer(state, action: PayloadAction<Farmer>) {
            const exists = state.data.some((f: { id: string; }) => f.id === action.payload.id);
            if (!exists) state.data.unshift(action.payload);
        },
        updateFarmer(state, action: PayloadAction<Farmer>) {
            const index = state.data.findIndex((f: { id: string; }) => f.id === action.payload.id);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteFarmer(state, action: PayloadAction<string>) {
            state.data = state.data.filter((f: { id: string; }) => f.id !== action.payload);
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
    setFarmers,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    setLoading,
    setError,
} = farmersSlice.actions;

export default farmersSlice.reducer;
