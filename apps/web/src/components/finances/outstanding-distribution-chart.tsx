'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { GroupFinancialRow } from '@/hooks/useData';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        return (
            <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
                <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.fill }} />
                        <div>{item.name}</div>
                    </div>
                    <div className="font-medium">{currencyFormatter.format(item.value as number)}</div>
                </div>
            </div>
        );
    }
    return null;
};

export function OutstandingDistributionChart({ groups }: { groups: GroupFinancialRow[] }) {
    const { data, total } = React.useMemo(() => {
        const withOutstanding = groups
            .filter((g) => g.outstanding > 0)
            .map((g, idx) => ({
                name: g.groupName,
                value: g.outstanding,
                fill: `hsl(var(--chart-${(idx % 5) + 1}))`,
            }));
        const total = withOutstanding.reduce((s, d) => s + d.value, 0);
        return { data: withOutstanding, total };
    }, [groups]);

    const chartConfig = data.reduce((acc, item) => {
        acc[item.name] = { label: item.name, color: item.fill };
        return acc;
    }, {} as ChartConfig);

    if (data.length === 0) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline">Outstanding Distribution</CardTitle>
                    <CardDescription>No outstanding balances across groups.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline">Outstanding Distribution</CardTitle>
                <CardDescription>Share of outstanding balances by group.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <ChartContainer config={chartConfig} className="h-64 w-full max-w-xs">
                    <PieChart>
                        <ChartTooltip cursor={false} content={<CustomTooltip />} />
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                        return (
                                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                                    {currencyFormatter.format(total)}
                                                </tspan>
                                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 15} className="fill-muted-foreground text-sm">
                                                    Outstanding
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
