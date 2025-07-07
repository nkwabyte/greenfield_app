'use client';

import { usePaginatedFarmers } from '@/hooks/use-farmers';
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

    const pagesLoadedRef = useRef<number>(0);

    useEffect(() => {
        if (!data) return;

        // Load only the new pages
        const newPages = data.pages.slice(pagesLoadedRef.current);
        newPages.forEach(farmerPage => {
            farmerPage.forEach((farmer: Farmer) => dispatch(addFarmer(farmer)));
        });

        pagesLoadedRef.current = data.pages.length;

        // Fetch next page if available
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [data, dispatch, fetchNextPage, hasNextPage, isFetchingNextPage]);

    return { isLoading };
}
