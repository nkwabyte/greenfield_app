import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Employee } from '@/lib/types';

interface EmployeesState {
    data: Employee[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: EmployeesState = {
    data: [],
    status: 'idle',
};

const employeesSlice = createSlice({
    name: 'employees',
    initialState,
    reducers: {
        setEmployees(state, action: PayloadAction<Employee[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addEmployee(state, action: PayloadAction<Employee>) {
            state.data.unshift(action.payload);
        },
        updateEmployee(state, action: PayloadAction<Employee>) {
            const index = state.data.findIndex(f => f.id === action.payload.id);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteEmployee(state, action: PayloadAction<string>) {
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
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setLoading,
    setError,
} = employeesSlice.actions;

export default employeesSlice.reducer;
