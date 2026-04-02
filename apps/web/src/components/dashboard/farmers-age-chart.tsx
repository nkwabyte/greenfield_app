'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Farmer } from '@/lib/types';

type FarmersAgeChartProps = {
    dataObj: Record<string, number> | undefined;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
                <p className="font-bold">{label}</p>
                <p>{`${payload[0].name}: ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

export function FarmersAgeChart({ dataObj }: FarmersAgeChartProps) {
    const data = React.useMemo(() => {
        if (!dataObj) return [];

        return Object.entries(dataObj)
            .map(([range, count]) => ({
                range,
                count
            }));
    }, [dataObj]);

    return (
        <Card className="shadow-md h-full">
            <CardHeader>
                <CardTitle className="font-headline">Age Distribution</CardTitle>
                <CardDescription>Farmers by age group.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="range"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                fontSize={12}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Farmers" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
