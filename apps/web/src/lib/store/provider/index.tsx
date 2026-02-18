'use client';

import { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../store';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ReduxProvider store={store}>
            {children}
        </ReduxProvider>
    );
}
