import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
} from '@/lib/firebase/services/suppliers';
import type { SupplierFormValues } from '@/components/suppliers/add-edit-supplier-dialog';

export const useSuppliers = () => {
    const queryClient = useQueryClient();

    const supplierQuery = useQuery({
        queryKey: ['suppliers'],
        queryFn: getSuppliers,
        staleTime: 1000 * 60 * 5,
    });

    const add = useMutation({
        mutationFn: (data: SupplierFormValues) => addSupplier(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: SupplierFormValues }) =>
            updateSupplier(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteSupplier(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
    });

    return {
        ...supplierQuery,
        addSupplier: add.mutateAsync,
        updateSupplier: update.mutateAsync,
        deleteSupplier: remove.mutateAsync,
    };
};
