'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getFirebaseFarmers,
    addFirebaseFarmer,
    updateFirebaseFarmer,
    deleteFirebaseFarmer,
    getPaginatedFarmers,
} from '@/lib/firebase/services/farmers';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { useInfiniteQuery } from '@tanstack/react-query';

export const usePaginatedFarmers = () => {
    return useInfiniteQuery({
        queryKey: ['farmers-paginated'],
        queryFn: async ({ pageParam }: { pageParam: any }) => {
            return await getPaginatedFarmers(pageParam);
        },
        getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
        select: (data) => ({
            pages: data.pages.map(p => p.farmers),
            pageParams: data.pageParams,
        }),
        initialPageParam: undefined,
        staleTime: 1000 * 60 * 5,
    });
};


export const useFarmers = () => {
    const queryClient = useQueryClient();

    const farmerQuery = useQuery({
        queryKey: ['farmers'],
        queryFn: getFirebaseFarmers,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const add = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FarmerFormValues }) =>
            addFirebaseFarmer(data, id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farmers'] }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: FarmerFormValues }) =>
            updateFirebaseFarmer(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farmers'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteFirebaseFarmer(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farmers'] }),
    });

    return {
        ...farmerQuery,
        addFarmer: add.mutateAsync,
        updateFarmer: update.mutateAsync,
        deleteFarmer: remove.mutateAsync,
    };
};

