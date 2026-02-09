'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi } from '@/lib/types';
import { Users, MapPin, BarChart2, Bot, Calendar as CalendarIcon, Download } from 'lucide-react';
// Removed duplicate import
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const FarmersByRegionChart = dynamic(() => import('@/components/dashboard/farmers-by-region-chart').then(mod => mod.FarmersByRegionChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});
const FarmersAgeChart = dynamic(() => import('@/components/dashboard/farmers-age-chart').then(mod => mod.FarmersAgeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});
const FarmersByGenderChart = dynamic(() => import('@/components/dashboard/farmers-by-gender-chart').then(mod => mod.FarmersByGenderChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});
const FarmSizeChart = dynamic(() => import('@/components/dashboard/farm-size-chart').then(mod => mod.FarmSizeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />
});
import { RecentFarmersTable } from '@/components/dashboard/recent-farmers-table';
// Removed AiAssistant import
import { CalendarDateRangePicker } from '@/components/dashboard/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// NEW: Import filtered hooks
import { useFarmersByDateRange } from '@/hooks/useData';
import Link from 'next/link';

export default function DashboardPage() {
  // Removed isAiAssistantOpen state

  // Default range: Last 30 days
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");

  // Fetch data based on filtered date range
  const dateFilteredFarmers = useFarmersByDateRange(dateRange);

  // Apply Region Filter
  const filteredFarmers = React.useMemo(() => {
    if (!dateFilteredFarmers) return undefined;
    if (selectedRegion === "all") return dateFilteredFarmers;
    return dateFilteredFarmers.filter(f => f.region === selectedRegion);
  }, [dateFilteredFarmers, selectedRegion]);

  // Derived unique regions for dropdown
  const uniqueRegions = React.useMemo(() => {
    if (!dateFilteredFarmers) return [];
    return Array.from(new Set(dateFilteredFarmers.map(f => f.region).filter((r): r is string => !!r))).sort();
  }, [dateFilteredFarmers]);

  const kpis: Kpi[] = React.useMemo(() => {
    if (!filteredFarmers) return [];

    // KPIs based on the SELECTED range & region
    const activeFarmers = filteredFarmers.filter((f) => f.status === 'Active').length;
    const regions = new Set(filteredFarmers.map((f) => f.region).filter(Boolean)).size;
    const maleFarmers = filteredFarmers.filter((f) => f.gender === 'Male').length;
    const femaleFarmers = filteredFarmers.filter((f) => f.gender === 'Female').length;
    const genderRatio = femaleFarmers > 0 ? `${(maleFarmers / femaleFarmers).toFixed(1)}:1 M/F` : 'N/A';

    return [
      {
        label: 'New Farmers', // Changed label to reflect range
        value: filteredFarmers.length.toString(),
        icon: Users
      },
      {
        label: 'Active (In Range)',
        value: activeFarmers.toString(),
        icon: Users,
        change: selectedRegion === 'all' ? `${regions} Regions` : selectedRegion
      },
      {
        label: 'Gender Ratio',
        value: genderRatio,
        icon: BarChart2
      },
    ];
  }, [filteredFarmers, selectedRegion]);

  const handleExport = () => {
    // Basic CSV export of filtered data
    if (!filteredFarmers) return;

    const headers = ['ID', 'Name', 'Region', 'District', 'Status', 'Join Date'];
    const csvContent = [
      headers.join(','),
      ...filteredFarmers.map(f => [
        f.id,
        `"${f.name}"`,
        f.region,
        f.district,
        f.status,
        f.joinDate || f.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `farmers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading state while data loads
  if (filteredFarmers === undefined) {
    return (
      <AppShell>
        <PageHeader
          title="Dashboard"
          description="An overview of your agricultural network."
        >
          <div className="flex items-center gap-2">
            <Button disabled variant="outline"><CalendarIcon className="mr-2 h-4 w-4" /> Loading...</Button>
          </div>
        </PageHeader>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="An overview of your agricultural network."
      >
        <div className="flex items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {uniqueRegions.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <CalendarDateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/ai-insights">
            <Button className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white">
              <Bot className="mr-2 text-white" />
              AI Insights
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FarmersByRegionChart farmers={filteredFarmers} />
          </div>
          <div className="lg:col-span-2">
            <FarmersAgeChart farmers={filteredFarmers} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FarmersByGenderChart farmers={filteredFarmers} />
          <FarmSizeChart farmers={filteredFarmers} />
        </div>

        <div>
          <RecentFarmersTable farmers={filteredFarmers} />
        </div>
      </div>

      {/* AiAssistant usage removed */}
    </AppShell>
  );
}
