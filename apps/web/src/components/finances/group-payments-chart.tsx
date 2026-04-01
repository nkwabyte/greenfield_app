'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartLegend,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { GroupFinancialRow } from '@/hooks/useData';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
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
                        <span className="capitalize">
                            {item.name}: {currencyFormatter.format(item.value as number)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const chartConfig: ChartConfig = {
    totalPaid: {
        label: 'Paid',
        color: 'hsl(var(--chart-1))',
    },
    outstanding: {
        label: 'Outstanding',
        color: 'hsl(var(--chart-2))',
    },
};

export function GroupPaymentsChart({ groups }: { groups: GroupFinancialRow[] }) {
    const data = React.useMemo(() => {
        return groups.map((g) => ({
            name: g.groupName.length > 15 ? g.groupName.slice(0, 15) + '…' : g.groupName,
            totalPaid: g.totalPaid,
            outstanding: g.outstanding,
        }));
    }, [groups]);

    if (data.length === 0) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline">Payments by Group</CardTitle>
                    <CardDescription>No group data available.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline">Payments by Group</CardTitle>
                <CardDescription>Paid vs. outstanding balance per farmer group.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                    <BarChart data={data} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                            fontSize={11}
                        />
                        <YAxis tickFormatter={(v) => '₵' + (v / 1000).toFixed(0) + 'K'} />
                        <ChartTooltip
                            cursor={false}
                            content={<CustomTooltip chartConfig={chartConfig} />}
                        />
                        <ChartLegend />
                        <Bar
                            dataKey="totalPaid"
                            name="Paid"
                            fill="hsl(var(--chart-1))"
                            stackId="stack"
                            radius={[0, 0, 0, 0]}
                        />
                        <Bar
                            dataKey="outstanding"
                            name="Outstanding"
                            fill="hsl(var(--chart-2))"
                            stackId="stack"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
