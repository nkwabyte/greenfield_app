'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Farmer } from '@/lib/types';

type FarmSizeChartProps = {
    dataObj: Record<string, number> | undefined;
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
                <p className="font-bold">{payload[0].name}</p>
                <p>{`Farmers: ${payload[0].value}`}</p>
                <p>{`Share: ${(payload[0].percent * 100).toFixed(1)}%`}</p>
            </div>
        );
    }
    return null;
};

export function FarmSizeChart({ dataObj }: FarmSizeChartProps) {
    const data = React.useMemo(() => {
        if (!dataObj) return [];

        return Object.entries(dataObj)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0); // Hide empty buckets
    }, [dataObj]);

    // HSL colors (Chart 1-5 + Primary)
    // Distinct colors for better contrast
    const COLORS = [
        '#10b981', // Emerald (Small)
        '#3b82f6', // Blue (Medium)
        '#8b5cf6', // Violet (Large)
        '#f59e0b', // Amber (Estates)
    ];

    return (
        <Card className="shadow-md h-full">
            <CardHeader>
                <CardTitle className="font-headline">Farm Sizes</CardTitle>
                <CardDescription>Breakdown by farm acreage.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
