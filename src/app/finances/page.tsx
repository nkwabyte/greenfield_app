'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi, Transaction, Employee } from '@/lib/types';
import { Wallet, TrendingUp, TrendingDown, PlusCircle } from 'lucide-react';
import { ExpensesByCategoryChart } from '@/components/finances/expenses-by-category-chart';
import { FinancialsOverTimeChart } from '@/components/finances/financials-over-time-chart';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/finances/transaction-columns';
import { AddEditTransactionDialog, type TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';
import { useToast } from '@/hooks/use-toast';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/lib/firebase/services/transactions';
import { getEmployees } from '@/lib/firebase/services/employees';
import { Skeleton } from '@/components/ui/skeleton';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function FinancesPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  const fetchAndSetData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [transactionData, employeeData] = await Promise.all([
        getTransactions(),
        getEmployees(),
      ]);
      setTransactions(transactionData);
      setEmployees(employeeData);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not retrieve financial data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchAndSetData();
  }, [fetchAndSetData]);

  const kpis: Kpi[] = React.useMemo(() => {
    const totalRevenue = transactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'Expense')
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
        await updateTransaction(editingTransaction.id, data);
        toast({ title: "Transaction Updated", description: `The transaction has been updated.` });
      } else {
        await addTransaction(data);
        toast({ title: "Transaction Added", description: `The transaction has been added.` });
      }
      fetchAndSetData();
    } catch (error) {
       toast({ title: "Save Failed", description: "An error occurred while saving the transaction.", variant: "destructive" });
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
     if (window.confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      try {
        await deleteTransaction(transactionId);
        toast({ title: "Transaction Deleted", description: "The transaction record has been removed." });
        fetchAndSetData();
      } catch (error) {
        toast({ title: "Delete Failed", description: "An error occurred while deleting the transaction.", variant: "destructive" });
      }
    }
  };
  
  const columns = React.useMemo(() => getColumns({ onEdit: handleOpenEditDialog, onDelete: handleDeleteTransaction }), []);

  return (
    <AppShell>
      <PageHeader 
        title="Financial Overview" 
        description="A summary of company income and expenses."
      >
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2" />
          Add Transaction
        </Button>
      </PageHeader>
      
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </> : kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {isLoading ? <Skeleton className="h-80" /> : <FinancialsOverTimeChart transactions={transactions} />}
          </div>
          <div className="lg:col-span-2">
            {isLoading ? <Skeleton className="h-80" /> : <ExpensesByCategoryChart transactions={transactions} />}
          </div>
        </div>

        <div>
          <DataTable
            columns={columns}
            data={transactions}
            filterColumnId="description"
            filterPlaceholder="Filter by description..."
            isLoading={isLoading}
          />
        </div>
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
