'use client';

import React from 'react';
import { useEmployees } from '@/hooks/use-employees';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useTransactions } from '@/hooks/use-transaction';
import { useLoadFarmersToRedux } from '@/hooks/use-load-farmers';
import { useAuth } from '@/hooks/use-auth';

export function AppInitializer() {

  useAuth();

  const employees = useEmployees();
  const suppliers = useSuppliers();
  const transactions = useTransactions();
  const farmers = useLoadFarmersToRedux();

  const isLoading =
    employees.isLoading ||
    suppliers.isLoading ||
    transactions.isLoading ||
    farmers.isLoading;

  React.useEffect(() => {
    if (!isLoading) {
      console.log('Global data fully loaded');
    }
  }, [isLoading]);

  return null;
}
