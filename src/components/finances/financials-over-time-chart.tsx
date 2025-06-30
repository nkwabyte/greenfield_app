
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type FinancialsOverTimeChartProps = {
  transactions: Transaction[];
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});


export function FinancialsOverTimeChart({ transactions }: FinancialsOverTimeChartProps) {
  const data = React.useMemo(() => {
    const monthlyTotals = transactions.reduce((acc, transaction) => {
      const month = format(new Date(transaction.date), 'MMM yyyy');
      if (!acc[month]) {
          acc[month] = { month, income: 0, expenses: 0 };
      }
      if (transaction.type === 'Income') {
        acc[month].income += transaction.amount;
      } else {
        acc[month].expenses += transaction.amount;
      }
      return acc;
    }, {} as Record<string, { month: string; income: number; expenses: number; }>);

    return Object.values(monthlyTotals)
      .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  }, [transactions]);

  const chartConfig = {
    income: {
      label: "Income",
      color: "hsl(var(--chart-1))",
    },
    expenses: {
        label: "Expenses",
        color: "hsl(var(--chart-2))",
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Monthly Financials</CardTitle>
        <CardDescription>Total income vs. expenses per month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ComposedChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickFormatter={(value) => '$' + (value as number / 1000) + 'K'} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value, name) => (
                <div className="flex items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{
                        backgroundColor: name === 'income' ? chartConfig.income.color : chartConfig.expenses.color,
                      }}
                    />
                    <span className="capitalize">{name}: {currencyFormatter.format(value as number)}</span>
                </div>
              )} />}
            />
            <ChartLegend />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
