
'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';

type ExpensesByCategoryChartProps = {
  transactions: Transaction[];
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
});

export function ExpensesByCategoryChart({ transactions }: ExpensesByCategoryChartProps) {
  const expenses = transactions.filter(t => t.type === 'Expense');
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const data = React.useMemo(() => {
    const categoryTotals = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals).map(([category, total], index) => ({
      name: category,
      value: total,
      fill: `hsl(var(--chart-${index + 1}))`,
    }));
  }, [expenses]);

  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as any);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Expenses by Category</CardTitle>
        <CardDescription>A breakdown of spending by category.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ChartContainer config={chartConfig} className="h-64 w-full max-w-xs">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => currencyFormatter.format(value as number)}
                hideLabel 
              />}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
               <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {currencyFormatter.format(totalExpenses)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-muted-foreground text-sm"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
