import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
} from '@/lib/firebase/services/transactions';
import type { TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';

export const useTransactions = () => {
    const queryClient = useQueryClient();

    const transactionQuery = useQuery({
        queryKey: ['transactions'],
        queryFn: getTransactions,
        staleTime: 1000 * 60 * 5,
    });

    const add = useMutation({
        mutationFn: (data: TransactionFormValues) => addTransaction(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TransactionFormValues }) =>
            updateTransaction(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteTransaction(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    return {
        ...transactionQuery,
        addTransaction: add.mutateAsync,
        updateTransaction: update.mutateAsync,
        deleteTransaction: remove.mutateAsync,
    };
};
