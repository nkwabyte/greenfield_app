'use client';

import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks';

/**
 * A wrapper around Dexie's useLiveQuery that safely handles Next.js Server-Side Rendering (SSR).
 * It skips executing the querier function synchronously on the server, which prevents
 * the Vercel build from hanging during static page generation.
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps?: any[]): T | undefined {
    return useDexieLiveQuery(() => {
        if (typeof window === 'undefined') {
            return undefined as any;
        }
        return querier();
    }, deps);
}
