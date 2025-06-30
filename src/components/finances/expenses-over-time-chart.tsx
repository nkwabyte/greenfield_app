
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Expense } from '@/lib/types';
import { format } from 'date-fns';

type ExpensesOverTimeChartProps = {
  expenses: Expense[];
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});


export function ExpensesOverTimeChart({ expenses }: ExpensesOverTimeChartProps) {
  const data = React.useMemo(() => {
    const monthlyTotals = expenses.reduce((acc, expense) => {
      const month = format(new Date(expense.date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyTotals)
      .map(([month, total]) => ({ month, total }))
      .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  }, [expenses]);

  const chartConfig = {
    total: {
      label: "Total Expenses",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Monthly Expenses</CardTitle>
        <CardDescription>Total expenses recorded per month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickFormatter={(value) => currencyFormatter.format(value).replace('$', '')[0] + 'K'} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(value as number)} />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
