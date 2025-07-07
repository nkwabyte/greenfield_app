'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    addFirebaseFarmer,
    updateFirebaseFarmer,
    deleteFirebaseFarmer,
} from '@/lib/firebase/services/farmers';
import type { FarmerFormValues } from '@/components/farmers/add-edit-farmer-dialog';

export const useFarmerMutations = () => {
    const queryClient = useQueryClient();

    const add = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: FarmerFormValues }) =>
            addFirebaseFarmer(data, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farmers-paginated'] });
        },
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: FarmerFormValues }) =>
            updateFirebaseFarmer(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farmers-paginated'] });
        },
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteFirebaseFarmer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farmers-paginated'] });
        },
    });

    return {
        addFarmer: add.mutateAsync,
        updateFarmer: update.mutateAsync,
        deleteFarmer: remove.mutateAsync,
    };
};
