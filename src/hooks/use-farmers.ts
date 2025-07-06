'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getFirebaseFarmers,
    addFirebaseFarmer,
    updateFirebaseFarmer,
    deleteFirebaseFarmer,
} from '@/lib/firebase/services/farmers';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';
import { localDb } from '@/lib/db/local-db';
import type { Farmer } from '@/lib/types';
import { useInfiniteQuery } from '@tanstack/react-query';

const CHUNK_SIZE = 200;

export const usePaginatedFarmers = () => {
    return useInfiniteQuery<Farmer[], Error>({
        queryKey: ['farmers'],
        queryFn: async ({ pageParam = 0 }: { pageParam: any }) => {
            const totalFarmers = await localDb.farmers.count();

            // If local DB is empty, or all are synced, pull from Firebase
            if (totalFarmers === 0 || (await localDb.farmers.where('synced').equals(0).count()) === 0) {
                const firebaseFarmers = await getFirebaseFarmers();

                // Cache them in local DB
                await localDb.farmers.clear(); // clear first to prevent duplicates
                await localDb.farmers.bulkAdd(
                    firebaseFarmers.map(farmer => ({
                        ...farmer,
                        synced: 1, // Mark as synced
                    }))
                );
            }

            // Return paginated local data
            return await localDb.farmers
                .orderBy('createdAt')
                .offset(pageParam)
                .limit(CHUNK_SIZE)
                .toArray();
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < CHUNK_SIZE) return undefined;
            return allPages.flat().length;
        },
        initialPageParam: 0,
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

