import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
} from '@/lib/firebase/services/products';
import type { ProductFormValues } from '@/components/products/add-edit-product-dialog';

export const useProducts = () => {
    const queryClient = useQueryClient();

    const productQuery = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
        staleTime: 1000 * 60 * 5,
    });

    const add = useMutation({
        mutationFn: (data: ProductFormValues) => addProduct(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ProductFormValues }) =>
            updateProduct(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    });

    return {
        ...productQuery,
        addProduct: add.mutateAsync,
        updateProduct: update.mutateAsync,
        deleteProduct: remove.mutateAsync,
    };
};
