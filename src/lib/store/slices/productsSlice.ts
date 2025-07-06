import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@/lib/types';

interface ProductsState {
    data: Product[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: ProductsState = {
    data: [],
    status: 'idle',
};

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setProducts(state, action: PayloadAction<Product[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addProduct(state, action: PayloadAction<Product>) {
            state.data.unshift(action.payload);
        },
        updateProduct(state, action: PayloadAction<Product>) {
            const index = state.data.findIndex(f => f.id === action.payload.id);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteProduct(state, action: PayloadAction<string>) {
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
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    setLoading,
    setError,
} = productsSlice.actions;

export default productsSlice.reducer;
