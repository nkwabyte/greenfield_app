import { configureStore } from '@reduxjs/toolkit';
import farmersReducer from './slices/famersSlice';
import usersReducer from './slices/usersSlice';
import employeesReducer from './slices/employeesSlice';
import productsReducer from './slices/productsSlice';
import suppliersReducer from './slices/suppliersSlice';
import transactionsReducer from './slices/transactionsSlice';

export const store = configureStore({
    reducer: {
        farmers: farmersReducer,
        users: usersReducer,
        employees: employeesReducer,
        products: productsReducer,
        suppliers: suppliersReducer,
        transactions: transactionsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
