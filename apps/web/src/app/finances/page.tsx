'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi, Transaction } from '@/lib/types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  UsersRound,
  AlertCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ExpensesByCategoryChart = dynamic(() => import('@/components/finances/expenses-by-category-chart').then(mod => mod.ExpensesByCategoryChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
const FinancialsOverTimeChart = dynamic(() => import('@/components/finances/financials-over-time-chart').then(mod => mod.FinancialsOverTimeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
const GroupPaymentsChart = dynamic(() => import('@/components/finances/group-payments-chart').then(mod => mod.GroupPaymentsChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
const OutstandingDistributionChart = dynamic(() => import('@/components/finances/outstanding-distribution-chart').then(mod => mod.OutstandingDistributionChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
const MonthlyCollectionChart = dynamic(() => import('@/components/finances/monthly-collection-chart').then(mod => mod.MonthlyCollectionChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full" />
});
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/finances/transaction-columns';
import {
  AddEditTransactionDialog,
  type TransactionFormValues,
} from '@/components/finances/add-edit-transaction-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeOptions, useTransactionsPaginated, useAllTimeRequestFinancials, useGroupFinancialSummary } from '@/hooks/useData';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRequireRole } from '@/hooks/use-role-guard';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
});

export default function FinancesPage() {
  const { allowed } = useRequireRole(['Admin']);
  const { toast } = useToast();

  // Pagination State
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 100,
  });

  // Dexie Hooks — must all be called before any early return
  const result = useTransactionsPaginated(pagination.pageIndex + 1, pagination.pageSize);
  const transactions = result?.data ?? [];
  const totalCount = result?.total ?? 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const isLoading = !result;

  const employees = useEmployeeOptions();
  const requestFinancials = useAllTimeRequestFinancials();
  const currentYear = new Date().getFullYear().toString();
  const summary = useGroupFinancialSummary(currentYear);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const kpis: Kpi[] = React.useMemo(() => {
    // Note: This calculation is now only for the CURRENT PAGE of transactions.
    // Ideally, we should use aggregation hooks (useTotalIncome, useTotalExpenses) for accurate KPIs across all data.
    const totalRevenue = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return [
      { label: 'Total Revenue (Page)', value: currencyFormatter.format(totalRevenue), icon: TrendingUp },
      { label: 'Total Expenses (Page)', value: currencyFormatter.format(totalExpenses), icon: TrendingDown },
      { label: 'Net Income (Page)', value: currencyFormatter.format(netIncome), icon: Wallet },
    ];
  }, [transactions]);

  const handleOpenAddDialog = () => {
    setEditingTransaction(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsAddEditDialogOpen(true);
  };

  const handleSaveTransaction = async (data: TransactionFormValues) => {
    try {
      if (editingTransaction) {
        const { updateTransaction } = await import('@/lib/db/services/transactions');
        await updateTransaction(editingTransaction.id, data);
        toast({ title: 'Transaction Updated', description: 'The transaction has been updated.' });
      } else {
        const { addTransaction } = await import('@/lib/db/services/transactions');
        await addTransaction(data, crypto.randomUUID());
        toast({ title: 'Transaction Added', description: 'The transaction has been added.' });
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'An error occurred while saving the transaction.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactionToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    try {
      const { deleteTransaction } = await import('@/lib/db/services/transactions');
      await deleteTransaction(transactionToDelete);
      toast({ title: 'Transaction Deleted', description: 'Transaction has been removed.' });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'An error occurred while deleting the transaction.',
        variant: 'destructive',
      });
    } finally {
      setTransactionToDelete(null);
    }
  };

  const columns = React.useMemo(
    () =>
      getColumns({
        onEdit: handleOpenEditDialog,
        onDelete: handleDeleteTransaction,
      }),
    []
  );

  if (!allowed) return null;

  return (
    <AppShell>
      <PageHeader title="Financial Overview" description="Track company income and expenses.">
        <div className="flex gap-3 items-center">
          <Link href="/finances/groups">
            <Button variant="outline">
              <UsersRound className="mr-2 h-4 w-4" />
              Group Financials
            </Button>
          </Link>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)
          )}
        </div>

        {/* Farmer Request Revenue / Outstanding */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Farmer Request Revenue"
            value={currencyFormatter.format(requestFinancials?.totalOwed ?? 0)}
            icon={UsersRound}
            change={`${currencyFormatter.format(requestFinancials?.totalPaid ?? 0)} collected`}
          />
          <KpiCard
            label="Outstanding Receivables"
            value={currencyFormatter.format(requestFinancials?.outstanding ?? 0)}
            icon={AlertCircle}
          />
          <Link
            href="/finances/groups"
            className="group block p-6 bg-card rounded-xl border shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Financials</span>
              <UsersRound className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">View Breakdown →</p>
            <p className="text-xs text-muted-foreground mt-1">
              Detailed revenue, payments &amp; charts by farmer group and season year.
            </p>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {isLoading ? <Skeleton className="h-80" /> : <FinancialsOverTimeChart transactions={transactions} />}
          </div>
          <div className="lg:col-span-2">
            {isLoading ? <Skeleton className="h-80" /> : <ExpensesByCategoryChart transactions={transactions} />}
          </div>
        </div>

        {summary && summary.groups.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GroupPaymentsChart groups={summary.groups} />
              <OutstandingDistributionChart groups={summary.groups} />
            </div>
            <div>
              <MonthlyCollectionChart monthlyPayments={summary.monthlyPayments} />
            </div>
          </>
        )}

        <DataTable
          columns={columns}
          data={transactions}
          filterColumnId="description"
          filterPlaceholder="Filter by description..."
          isLoading={isLoading}
          // Pagination Props
          pageCount={totalPages}
          pagination={pagination}
          onPaginationChange={setPagination}
        />
      </div>

      <AddEditTransactionDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        transaction={editingTransaction}
        onSave={handleSaveTransaction}
        employees={employees || []}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        onConfirm={confirmDeleteTransaction}
      />
    </AppShell>
  );
}
