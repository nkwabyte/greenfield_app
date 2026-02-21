'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import type { Farmer } from '@/lib/types';

type FarmersByRegionChartProps = {
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


export function FarmersByRegionChart({ dataObj }: FarmersByRegionChartProps) {
  const data = React.useMemo(() => {
    if (!dataObj) return [];

    return Object.entries(dataObj)
      .map(([region, count]) => ({
        region,
        count,
      }))
      .sort((a, b) => {
        if (a.region === 'N/A') return 1;
        if (b.region === 'N/A') return -1;
        return b.count - a.count; // Sort by count descending for others
      });
  }, [dataObj]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Farmers by Region</CardTitle>
        <CardDescription>Distribution of farmers across operational regions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-64 w-full">
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="region"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis />
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            <Bar dataKey="count" name="Farmers" fill="hsl(var(--chart-1))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
