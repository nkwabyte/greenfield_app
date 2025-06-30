
'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { mockExpenses, mockEmployees } from '@/lib/mock-data';
import type { Kpi, Expense } from '@/lib/types';
import { Wallet, Receipt, TrendingUp } from 'lucide-react';
import { ExpensesByCategoryChart } from '@/components/finances/expenses-by-category-chart';
import { RecentExpensesTable } from '@/components/finances/recent-expenses-table';
import { ExpensesOverTimeChart } from '@/components/finances/expenses-over-time-chart';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function FinancesPage() {
  const [expenses, setExpenses] = React.useState<Expense[]>(mockExpenses);

  const kpis: Kpi[] = React.useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalTransactions = expenses.length;
    const avgTransaction = totalTransactions > 0 ? totalExpenses / totalTransactions : 0;
    
    return [
      { label: 'Total Expenses', value: currencyFormatter.format(totalExpenses), icon: Wallet },
      { label: 'Total Transactions', value: totalTransactions.toString(), icon: Receipt },
      { label: 'Avg. Transaction', value: currencyFormatter.format(avgTransaction), icon: TrendingUp },
    ];
  }, [expenses]);

  return (
    <AppShell>
      <PageHeader 
        title="Financial Overview" 
        description="A summary of company expenses and financial health."
      />
      
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ExpensesOverTimeChart expenses={expenses} />
          </div>
          <div className="lg:col-span-2">
            <ExpensesByCategoryChart expenses={expenses} />
          </div>
        </div>

        <div>
          <RecentExpensesTable expenses={expenses} />
        </div>
      </div>
    </AppShell>
  );
}
