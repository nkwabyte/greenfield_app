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
} from 'lucide-react';
import { ExpensesByCategoryChart } from '@/components/finances/expenses-by-category-chart';
import { FinancialsOverTimeChart } from '@/components/finances/financials-over-time-chart';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/finances/transaction-columns';
import {
  AddEditTransactionDialog,
  type TransactionFormValues,
} from '@/components/finances/add-edit-transaction-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelector } from 'react-redux';
import { useTransactions } from '@/hooks/use-transaction';
import { RootState } from '@/lib/store/store';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
});

export default function FinancesPage() {
  const { toast } = useToast();
  const {
    data: transactions = [],
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const employees = useSelector((state: RootState) => state.employees.data);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  const kpis: Kpi[] = React.useMemo(() => {
    const totalRevenue = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return [
      { label: 'Total Revenue', value: currencyFormatter.format(totalRevenue), icon: TrendingUp },
      { label: 'Total Expenses', value: currencyFormatter.format(totalExpenses), icon: TrendingDown },
      { label: 'Net Income', value: currencyFormatter.format(netIncome), icon: Wallet },
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
        await updateTransaction({ id: editingTransaction.id, data });
        toast({ title: 'Transaction Updated', description: 'The transaction has been updated.' });
      } else {
        await addTransaction(data);
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

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        toast({ title: 'Transaction Deleted', description: 'Transaction has been removed.' });
      } catch (error) {
        toast({
          title: 'Delete Failed',
          description: 'An error occurred while deleting the transaction.',
          variant: 'destructive',
        });
      }
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

  return (
    <AppShell>
      <PageHeader title="Financial Overview" description="Track company income and expenses.">
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Transaction
        </Button>
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {isLoading ? <Skeleton className="h-80" /> : <FinancialsOverTimeChart transactions={transactions} />}
          </div>
          <div className="lg:col-span-2">
            {isLoading ? <Skeleton className="h-80" /> : <ExpensesByCategoryChart transactions={transactions} />}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          filterColumnId="description"
          filterPlaceholder="Filter by description..."
          isLoading={isLoading}
        />
      </div>

      <AddEditTransactionDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        transaction={editingTransaction}
        onSave={handleSaveTransaction}
        employees={employees}
      />
    </AppShell>
  );
}
