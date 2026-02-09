'use client';

import { ReactNode } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store } from '../store';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ReduxProvider store={store}>
            <QueryClientProvider client={queryClient}>
                <ReactQueryDevtools initialIsOpen={false} />
                    {children}
            </QueryClientProvider>
        </ReduxProvider>
    );
}
