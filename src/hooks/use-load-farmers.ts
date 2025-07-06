'use client';

import { usePaginatedFarmers } from '@/hooks/use-farmers';
import { useDispatch } from 'react-redux';
import { addFarmer } from '@/lib/store/slices/famersSlice';
import { syncFarmersToFirebase } from '@/lib/sync/sync-farmers';
import React from 'react';

export function useLoadFarmersToRedux() {
    const dispatch = useDispatch();
    const dispatchedPagesRef = React.useRef(0);
    const syncTriggeredRef = React.useRef(false);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = usePaginatedFarmers();

    React.useEffect(() => {
        if (!data) return;

        const newPages = data.pages.slice(dispatchedPagesRef.current);
        for (const page of newPages) {
            for (const farmer of page) {
                dispatch(addFarmer(farmer));
            }
        }

        dispatchedPagesRef.current = data.pages.length;

        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }

        const allPagesFetched = !hasNextPage && !isFetchingNextPage;
        const allDispatched = dispatchedPagesRef.current === data.pages.length;

        if (allPagesFetched && allDispatched && !syncTriggeredRef.current && navigator.onLine) {
            syncTriggeredRef.current = true;
            syncFarmersToFirebase();
        }
    }, [data, dispatch, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return { isLoading };
}
