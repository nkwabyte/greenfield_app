'use client';

import React from 'react';
import { useEmployees } from '@/hooks/use-employees';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useTransactions } from '@/hooks/use-transaction';
import { useLoadFarmersToRedux } from '@/hooks/use-load-farmers';
import { useAuth } from '@/hooks/use-auth';

export function AppInitializer() {
  /// Initialize authentication state
  // This hook will check if the user is authenticated and set the auth state accordingly
  useAuth();
  /// Trigger hooks to load data into Redux store
  // These hooks will automatically fetch data and populate the Redux store
  useEmployees();
  useSuppliers();
  useTransactions();
  useLoadFarmersToRedux();

  return null;
}
