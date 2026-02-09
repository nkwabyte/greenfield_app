import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import usersReducer from './slices/usersSlice';
import dataReducer from './slices/dataSlice';


export const store = configureStore({
    reducer: {
        auth: authReducer,
        users: usersReducer,
        data: dataReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore specific paths in the state or actions that contain non-serializable values
                ignoredActions: ['payload.timestamp', 'payload.createdAt', 'payload.updatedAt'],
                ignoredPaths: ['items.dates'],
            },
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
