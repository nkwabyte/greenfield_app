'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import type { Farmer } from '@/lib/types';
import type { ChartConfig } from '@/components/ui/chart';

type FarmersByGenderChartProps = {
  farmers: Farmer[];
};

const CustomTooltip = ({ active, payload, totalFarmers }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0];
        const percentage = totalFarmers > 0 ? (Number(item.value) / totalFarmers * 100).toFixed(0) : 0;
        return (
            <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
                <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: item.payload.fill}} />
                        <div>{item.name}</div>
                    </div>
                    <div className="font-medium">{item.value} ({percentage}%)</div>
                </div>
            </div>
        );
    }
    return null;
};

export function FarmersByGenderChart({ farmers }: FarmersByGenderChartProps) {
  const totalFarmers = farmers.length;
  
  const data = React.useMemo(() => {
    const genderCounts = farmers.reduce((acc, farmer) => {
      const gender = farmer.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(genderCounts).map(([gender, count], index) => ({
      name: gender,
      value: count,
      fill: `hsl(var(--chart-${index + 1}))`,
    }));
  }, [farmers]);

  const chartConfig = data.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Gender Distribution</CardTitle>
        <CardDescription>A breakdown of farmers by gender.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ChartContainer config={chartConfig} className="h-64 w-full max-w-xs">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<CustomTooltip totalFarmers={totalFarmers} />}
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
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalFarmers.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-muted-foreground"
                        >
                          Farmers
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
