'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import type { ChartConfig } from '@/components/ui/chart';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload, label, chartConfig }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 text-xs bg-background border rounded-lg shadow-lg grid gap-1.5">
                <p className="font-bold">{label}</p>
                {payload.map((item: any) => (
                    <div key={item.dataKey} className="flex items-center gap-2">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: chartConfig[item.dataKey]?.color }}
                        />
                        <span className="capitalize">{item.name}: {currencyFormatter.format(item.value as number)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};


export function FinancialsOverTimeChart({ transactions }: { transactions: Transaction[] }) {
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

  const chartConfig: ChartConfig = {
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
              content={<CustomTooltip chartConfig={chartConfig} />}
            />
            <ChartLegend />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" radius={4} />
            <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--chart-2))" radius={4} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
