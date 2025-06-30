
'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { mockTransactions, mockEmployees } from '@/lib/mock-data';
import type { Kpi, Transaction } from '@/lib/types';
import { Wallet, TrendingUp, TrendingDown, PlusCircle } from 'lucide-react';
import { ExpensesByCategoryChart } from '@/components/finances/expenses-by-category-chart';
import { FinancialsOverTimeChart } from '@/components/finances/financials-over-time-chart';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { getColumns } from '@/components/finances/transaction-columns';
import { AddEditTransactionDialog, type TransactionFormValues } from '@/components/finances/add-edit-transaction-dialog';
import { useToast } from '@/hooks/use-toast';


const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function FinancesPage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = React.useState<Transaction[]>(() =>
    mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );
  
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

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
  
  const handleSaveTransaction = (data: TransactionFormValues) => {
    const now = new Date().toISOString();
    
    if (editingTransaction) {
      // Edit mode
      const updatedTransactions = transactions.map(t => 
        t.id === editingTransaction.id 
          ? { ...editingTransaction, ...data, date: data.date.toISOString(), updatedAt: now } 
          : t
      );
      setTransactions(updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({ title: "Transaction Updated", description: `The transaction has been updated.` });
    } else {
      // Add mode
      const newTransaction: Transaction = {
        id: `TRN${Date.now()}`,
        ...data,
        date: data.date.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({ title: "Transaction Added", description: `The transaction has been added.` });
    }
  };
  
  const columns = React.useMemo(() => getColumns({ onEdit: handleOpenEditDialog }), []);

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
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FinancialsOverTimeChart transactions={transactions} />
          </div>
          <div className="lg:col-span-2">
            <ExpensesByCategoryChart transactions={transactions} />
          </div>
        </div>

        <div>
          <DataTable
            columns={columns}
            data={transactions}
            filterColumnId="description"
            filterPlaceholder="Filter by description..."
          />
        </div>
      </div>
      
      <AddEditTransactionDialog
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        transaction={editingTransaction}
        onSave={handleSaveTransaction}
        employees={mockEmployees}
      />
    </AppShell>
  );
}
