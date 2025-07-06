import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Transaction } from '@/lib/types';

interface TransactionsState {
    data: Transaction[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: TransactionsState = {
    data: [],
    status: 'idle',
};

const transactionsSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        setTransactions(state, action: PayloadAction<Transaction[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addTransaction(state, action: PayloadAction<Transaction>) {
            state.data.unshift(action.payload);
        },
        updateTransaction(state, action: PayloadAction<Transaction>) {
            const index = state.data.findIndex(f => f.id === action.payload.id);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteTransaction(state, action: PayloadAction<string>) {
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
    setTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setLoading,
    setError,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
