'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi, Farmer } from '@/lib/types';
import { Users, MapPin, BarChart2, Bot, Calendar as CalendarIcon, Download, Package, DollarSign } from 'lucide-react';
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
import { useRegionCounts, useFarmSizeStats, useAgeStats, useRegionGenderStats, useAllTimeRequestFinancials, useFarmerRequestsCount } from '@/hooks/useData';
import { db } from '@/lib/db/schema';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import Link from 'next/link';

export default function DashboardPage() {
  // Default range: Last 30 days
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");

  const regionCounts = useRegionCounts();
  const farmSizeStats = useFarmSizeStats();
  const ageStats = useAgeStats();
  const regionGenderStats = useRegionGenderStats();

  const recentFarmers = useLiveQuery(() =>
    db.farmers.orderBy('createdAt').reverse().limit(10).toArray()
    , []);

  // For KPIs
  const totalFarmers = useLiveQuery(() => db.farmers.count());
  const activeFarmersCount = useLiveQuery(() => db.farmers.where('status').equals('Active').count());
  const newFarmersCount = useLiveQuery(() => {
    if (!dateRange?.from || !dateRange?.to) return db.farmers.count();
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);
    return db.farmers.where('createdAt').between(dateRange.from.toISOString(), end.toISOString(), true, true).count();
  }, [dateRange?.from, dateRange?.to]);

  const allTimeFinancials = useAllTimeRequestFinancials();
  const farmerRequestsCount = useFarmerRequestsCount();

  // Derived unique regions for dropdown
  const uniqueRegions = React.useMemo(() => {
    if (!regionCounts) return [];
    return Object.keys(regionCounts).filter(r => r !== 'Unknown' && r !== 'N/A').sort();
  }, [regionCounts]);

  const kpis: Kpi[] = React.useMemo(() => {
    let maleFarmers = 0;
    let femaleFarmers = 0;

    if (regionGenderStats) {
      if (selectedRegion !== 'all' && regionGenderStats[selectedRegion]) {
        maleFarmers = regionGenderStats[selectedRegion]['Male'] || 0;
        femaleFarmers = regionGenderStats[selectedRegion]['Female'] || 0;
      } else {
        // aggregate all
        Object.values(regionGenderStats).forEach(r => {
          maleFarmers += r['Male'] || 0;
          femaleFarmers += r['Female'] || 0;
        });
      }
    }

    const genderRatio = femaleFarmers > 0 ? `${(maleFarmers / femaleFarmers).toFixed(1)}:1 M/F` : 'N/A';

    return [
      {
        label: 'New Farmers',
        value: (newFarmersCount || 0).toString(),
        icon: Users,
      },
      {
        label: 'Active Farmers',
        value: (activeFarmersCount || 0).toString(),
        icon: Users,
        change: 'Total DB Active'
      },
      {
        label: 'Gender Ratio',
        value: genderRatio,
        icon: BarChart2
      },
      {
        label: 'Regions Covered',
        value: uniqueRegions.length.toString(),
        icon: MapPin,
      },
      {
        label: 'Total Inputs Requested',
        value: (farmerRequestsCount || 0).toLocaleString(),
        icon: Package,
      },
      {
        label: 'Total Loan Value',
        value: `¢${(allTimeFinancials?.totalOwed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: DollarSign,
      },
      {
        label: 'Total Deposit Paid',
        value: `¢${(allTimeFinancials?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: DollarSign,
        change: 'Collected',
        changeType: 'positive'
      },
      {
        label: 'Outstanding Balance',
        value: `¢${(allTimeFinancials?.outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: DollarSign,
        change: 'Pending',
        changeType: 'negative'
      },
      {
        label: 'Female Farmers',
        value: femaleFarmers.toLocaleString(),
        icon: Users,
        change: selectedRegion === 'all' ? 'Across all regions' : `In ${selectedRegion}`
      },
      {
        label: 'Male Farmers',
        value: maleFarmers.toLocaleString(),
        icon: Users,
        change: selectedRegion === 'all' ? 'Across all regions' : `In ${selectedRegion}`
      }
    ];
  }, [newFarmersCount, activeFarmersCount, regionGenderStats, selectedRegion, uniqueRegions.length, farmerRequestsCount, allTimeFinancials]);

  const handleExport = async () => {
    // Run full query on demand to save memory
    let collection: any = db.farmers.toCollection();
    if (selectedRegion !== 'all') {
      collection = db.farmers.where('region').equals(selectedRegion);
    }
    const exportData = await collection.toArray() as Farmer[];

    if (exportData.length === 0) return;

    const headers = ['ID', 'Name', 'Region', 'District', 'Status', 'Join Date'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(f => [
        f.id,
        `"${f.name}"`,
        f.region,
        f.district,
        f.status,
        f.createdAt
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
  if (totalFarmers === undefined) {
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-[160px]">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Export</span>
            </Button>
            <Link href="/ai-insights" className="flex-1 sm:flex-none">
              <Button className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white">
                <Bot className="mr-2 h-4 w-4 text-white" />
                <span className="hidden xs:inline">AI Insights</span>
                <span className="xs:hidden">Insights</span>
              </Button>
            </Link>
          </div>
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
            <FarmersByRegionChart dataObj={regionCounts} />
          </div>
          <div className="lg:col-span-2">
            <FarmersAgeChart dataObj={ageStats} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FarmersByGenderChart dataObj={regionGenderStats} />
          <FarmSizeChart dataObj={farmSizeStats} />
        </div>

        <div>
          <RecentFarmersTable farmers={recentFarmers || []} />
        </div>
      </div>

      {/* AiAssistant usage removed */}
    </AppShell>
  );
}
