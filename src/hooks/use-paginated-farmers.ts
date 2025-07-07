'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getPaginatedFarmers,
} from '@/lib/firebase/services/farmers';

export const usePaginatedFarmers = () => {
    return useInfiniteQuery({
        queryKey: ['farmers-paginated'],
        queryFn: async ({ pageParam }: { pageParam: any }) => {
            try {
                return await getPaginatedFarmers(pageParam);
            } catch (err) {
                console.error('Error fetching paginated farmers:', err);
                throw err;
            }
        },
        getNextPageParam: (lastPage) => lastPage?.lastDoc ?? undefined,
        select: (data) => ({
            farmers: data.pages.flatMap((p) => p.farmers), // Flatten for easier UI rendering
            pageParams: data.pageParams,
        }),
        initialPageParam: undefined,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
