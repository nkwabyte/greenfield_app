import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
} from '@/lib/firebase/services/employees';
import type { EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';

export const useEmployees = () => {
    const queryClient = useQueryClient();

    const employeeQuery = useQuery({
        queryKey: ['employees'],
        queryFn: getEmployees,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const add = useMutation({
        mutationFn: (data: EmployeeFormValues) => addEmployee(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: EmployeeFormValues }) =>
            updateEmployee(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => deleteEmployee(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    });

    return {
        ...employeeQuery,
        addEmployee: add.mutateAsync,
        updateEmployee: update.mutateAsync,
        deleteEmployee: remove.mutateAsync,
    };
};
