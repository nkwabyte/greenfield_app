'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Farmer } from '@/lib/types';

type FarmersByGenderChartProps = {
  farmers: Farmer[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-background border rounded-lg shadow-lg">
        <p className="font-bold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
            <span>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function FarmersByGenderChart({ farmers }: FarmersByGenderChartProps) {
  const data = React.useMemo(() => {
    // Group by region and gender
    const regionGenderMap: Record<string, Record<string, number>> = {};

    farmers.forEach(farmer => {
      const region = farmer.region || 'N/A';
      const gender = farmer.gender || 'Unknown';

      if (!regionGenderMap[region]) {
        regionGenderMap[region] = {};
      }
      regionGenderMap[region][gender] = (regionGenderMap[region][gender] || 0) + 1;
    });

    // Convert to array format for recharts
    return Object.entries(regionGenderMap)
      .map(([region, genders]) => ({
        region,
        Male: genders['Male'] || 0,
        Female: genders['Female'] || 0,
        Other: genders['Other'] || 0,
        Unknown: genders['Unknown'] || 0,
      }))
      .sort((a, b) => {
        if (a.region === 'N/A') return 1;
        if (b.region === 'N/A') return -1;
        return (b.Male + b.Female + b.Other + b.Unknown) - (a.Male + a.Female + a.Other + a.Unknown);
      });
  }, [farmers]);

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle className="font-headline">Gender by Region</CardTitle>
        <CardDescription>Gender distribution across regions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="region"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
              />
              <Bar dataKey="Male" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Female" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Other" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Unknown" stackId="a" fill="#6b7280" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
