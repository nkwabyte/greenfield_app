'use client';

import { usePaginatedFarmers } from '@/hooks/use-paginated-farmers';
import { useDispatch } from 'react-redux';
import { addFarmer } from '@/lib/store/slices/famersSlice';
import { useEffect, useRef } from 'react';
import type { Farmer } from '@/lib/types';

export const useLoadFarmersToRedux = () => {
    const dispatch = useDispatch();

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = usePaginatedFarmers();

    const farmers = data?.farmers ?? [];

    const farmersLoadedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (farmers.length === 0) return;

        farmers.forEach((farmer: Farmer) => {
            if (!farmersLoadedRef.current.has(farmer.id)) {
                dispatch(addFarmer(farmer));
                farmersLoadedRef.current.add(farmer.id);
            }
        });

        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [farmers, dispatch, fetchNextPage, hasNextPage, isFetchingNextPage]);

    return { isLoading };
};
