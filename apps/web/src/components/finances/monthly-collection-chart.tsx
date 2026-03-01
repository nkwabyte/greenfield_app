'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 text-xs bg-background border rounded-lg shadow-lg grid gap-1.5">
                <p className="font-bold">{label}</p>
                {payload.map((item: any) => (
                    <div key={item.dataKey} className="flex items-center gap-2">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}: {currencyFormatter.format(item.value as number)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const chartConfig: ChartConfig = {
    collected: {
        label: 'Collected',
        color: 'hsl(var(--chart-1))',
    },
};

interface MonthlyCollectionChartProps {
    monthlyPayments: { month: string; amount: number }[];
}

export function MonthlyCollectionChart({ monthlyPayments }: MonthlyCollectionChartProps) {
    const data = React.useMemo(() => {
        return monthlyPayments
            .map((mp) => ({ month: mp.month, collected: mp.amount }))
            .sort((a, b) => {
                // Sort by year-month for proper chronological order
                const parseMonthYear = (s: string) => {
                    const parts = s.split(' ');
                    const monthNames = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December',
                    ];
                    const mi = monthNames.indexOf(parts[0]);
                    const yr = parseInt(parts[1]) || 0;
                    return yr * 12 + mi;
                };
                return parseMonthYear(a.month) - parseMonthYear(b.month);
            });
    }, [monthlyPayments]);

    if (data.length === 0) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline">Monthly Collections</CardTitle>
                    <CardDescription>No payment data available.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline">Monthly Collections</CardTitle>
                <CardDescription>Payment collections over time across all groups.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <AreaChart data={data} accessibilityLayer>
                        <defs>
                            <linearGradient id="fillCollected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={11}
                        />
                        <YAxis tickFormatter={(v) => '₵' + (v / 1000).toFixed(0) + 'K'} />
                        <ChartTooltip cursor={false} content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="collected"
                            name="Collected"
                            stroke="hsl(var(--chart-1))"
                            fill="url(#fillCollected)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
