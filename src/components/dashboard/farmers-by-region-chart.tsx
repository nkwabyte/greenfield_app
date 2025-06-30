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
  farmers: Farmer[];
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


export function FarmersByRegionChart({ farmers }: FarmersByRegionChartProps) {
  const data = React.useMemo(() => {
    const regionCounts = farmers.reduce((acc, farmer) => {
      if (farmer.region) {
        acc[farmer.region] = (acc[farmer.region] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(regionCounts).map(([region, count]) => ({
      region,
      count,
    }));
  }, [farmers]);

  const chartConfig = {
    count: {
      label: "Farmers",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Farmers by Region</CardTitle>
        <CardDescription>Distribution of farmers across operational regions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
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
            <Bar dataKey="count" name="Farmers" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
