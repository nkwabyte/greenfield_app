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
  loading: () => <Skeleton className="h-75 w-full" />
});
const FarmersAgeChart = dynamic(() => import('@/components/dashboard/farmers-age-chart').then(mod => mod.FarmersAgeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-75 w-full" />
});
const FarmersByGenderChart = dynamic(() => import('@/components/dashboard/farmers-by-gender-chart').then(mod => mod.FarmersByGenderChart), {
  ssr: false,
  loading: () => <Skeleton className="h-75 w-full" />
});
const FarmSizeChart = dynamic(() => import('@/components/dashboard/farm-size-chart').then(mod => mod.FarmSizeChart), {
  ssr: false,
  loading: () => <Skeleton className="h-75 w-full" />
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

import { useRegionCounts, useFarmSizeStats, useAgeStats, useRegionGenderStats, useAllTimeRequestFinancials, useFarmerRequestsCount, useFieldAgentDistricts, useFarmersByDistricts, useDistrictScopedRequestFinancials, useDistrictScopedRequestCount } from '@/hooks/useData';
import { NoDistrictAssigned } from '@/components/common/no-district-assigned';
import { db } from '@/lib/db/schema';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import Link from 'next/link';
import { GHANA_REGIONS_AND_DISTRICTS } from '@/lib/data/ghana-regions-districts';

export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'Admin';
  const isFieldAgent = user?.role === 'Field Agent';

  // Default range: Last 30 days
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");

  // District restriction for field agents.
  // undefined = still loading from IndexedDB; [] = no districts assigned; [...] = has districts.
  const allowedDistricts = useFieldAgentDistricts();
  // Fetch live farmers for field agents; null = skip (admin uses cache).
  // When allowedDistricts is undefined (loading), pass null so we wait for the spinner.
  const districtFarmers = useFarmersByDistricts(
    isFieldAgent ? (allowedDistricts ?? null) : null
  );

  // Cached stats hooks (always called — used for admins)
  const cachedRegionCounts = useRegionCounts();
  const cachedFarmSizeStats = useFarmSizeStats();
  const cachedAgeStats = useAgeStats();
  const cachedRegionGenderStats = useRegionGenderStats();

  // Admin count hooks (always called)
  const adminTotalFarmers = useLiveQuery(() => db.farmers.filter(f => !f.isArchived).count());
  const adminActiveFarmers = useLiveQuery(() => db.farmers.where('status').equals('Active').count());
  const adminNewFarmers = useLiveQuery(() => {
    if (!dateRange?.from || !dateRange?.to) return db.farmers.filter(f => !f.isArchived).count();
    const end = new Date(dateRange.to);
    end.setHours(23, 59, 59, 999);
    return db.farmers.where('createdAt').between(dateRange.from.toISOString(), end.toISOString(), true, true).count();
  }, [dateRange?.from, dateRange?.to]);
  const adminRecentFarmers = useLiveQuery(() =>
    db.farmers.orderBy('createdAt').reverse().limit(10).toArray(), []);

  // Compute stats from district farmers for field agents
  const fieldAgentStats = React.useMemo(() => {
    if (!isFieldAgent || !districtFarmers || districtFarmers.length === 0) return null;
    const byRegion: Record<string, number> = {};
    const byGender: Record<string, number> = {};
    const byRegionGender: Record<string, Record<string, number>> = {};
    const byFarmSize: Record<string, number> = {
      'Small (< 2 acres)': 0, 'Medium (2-5 acres)': 0,
      'Large (5-10 acres)': 0, 'Estates (> 10 acres)': 0,
    };
    const byAge: Record<string, number> = {
      '18-25': 0, '26-35': 0, '36-45': 0, '46-60': 0, '60+': 0,
    };

    for (const f of districtFarmers) {
      const r = f.region || 'Unknown';
      byRegion[r] = (byRegion[r] || 0) + 1;

      const g = f.gender || 'Unknown';
      byGender[g] = (byGender[g] || 0) + 1;
      if (!byRegionGender[r]) byRegionGender[r] = {};
      byRegionGender[r][g] = (byRegionGender[r][g] || 0) + 1;

      const size = f.farmSize;
      if (size !== undefined) {
        if (size < 2) byFarmSize['Small (< 2 acres)']++;
        else if (size < 5) byFarmSize['Medium (2-5 acres)']++;
        else if (size < 10) byFarmSize['Large (5-10 acres)']++;
        else byFarmSize['Estates (> 10 acres)']++;
      }
      const age = f.age;
      if (age !== undefined) {
        if (age >= 18 && age <= 25) byAge['18-25']++;
        else if (age <= 35) byAge['26-35']++;
        else if (age <= 45) byAge['36-45']++;
        else if (age <= 60) byAge['46-60']++;
        else byAge['60+']++;
      }
    }

    const from = dateRange?.from;
    const to = dateRange?.to;
    const endOfDay = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : undefined;
    const newCount = from && endOfDay
      ? districtFarmers.filter(f => f.createdAt >= from.toISOString() && f.createdAt <= endOfDay.toISOString()).length
      : districtFarmers.length;

    return {
      total: districtFarmers.length,
      active: districtFarmers.filter(f => f.status === 'Active').length,
      newCount,
      recentFarmers: [...districtFarmers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
      byRegion, byGender, byRegionGender, byFarmSize, byAge,
    };
  }, [isFieldAgent, districtFarmers, dateRange?.from, dateRange?.to]);

  // Resolved values — field agent computed or admin cached
  const regionCounts = isFieldAgent ? (fieldAgentStats?.byRegion ?? {}) : (cachedRegionCounts ?? {});
  const farmSizeStats = isFieldAgent ? (fieldAgentStats?.byFarmSize ?? {}) : (cachedFarmSizeStats ?? {});
  const ageStats = isFieldAgent ? (fieldAgentStats?.byAge ?? {}) : (cachedAgeStats ?? {});
  const regionGenderStats = isFieldAgent ? (fieldAgentStats?.byRegionGender ?? {}) : (cachedRegionGenderStats ?? {});
  const totalFarmers = isFieldAgent ? (fieldAgentStats?.total ?? 0) : (adminTotalFarmers ?? 0);
  const activeFarmersCount = isFieldAgent ? (fieldAgentStats?.active ?? 0) : (adminActiveFarmers ?? 0);
  const newFarmersCount = isFieldAgent ? (fieldAgentStats?.newCount ?? 0) : (adminNewFarmers ?? 0);
  const recentFarmers = isFieldAgent ? (fieldAgentStats?.recentFarmers ?? []) : (adminRecentFarmers ?? []);

  // Financials — scoped to assigned districts for field agents, global for admins/managers.
  // null = all data (admin); undefined-resolving-to-null = wait for districts to load.
  const scopedDistricts = isFieldAgent ? (allowedDistricts ?? null) : null;
  const scopedFinancials = useDistrictScopedRequestFinancials(isFieldAgent ? scopedDistricts : null);
  const adminFinancials = useAllTimeRequestFinancials();
  const allTimeFinancials = isFieldAgent ? scopedFinancials : adminFinancials;

  const scopedRequestCount = useDistrictScopedRequestCount(isFieldAgent ? scopedDistricts : null);
  const adminRequestCount = useFarmerRequestsCount();
  const farmerRequestsCount = isFieldAgent ? scopedRequestCount : adminRequestCount;

  // Derived unique regions for dropdown (uses actual farmer data)
  const uniqueRegions = React.useMemo(() => {
    if (!regionCounts) return [];
    return Object.keys(regionCounts).filter(r => r !== 'Unknown' && r !== 'N/A').sort();
  }, [regionCounts]);

  // For field agents: count distinct regions from assigned districts, not from farmer records.
  // This ensures "Regions Covered" shows 2 even if no farmers are registered in one of the regions yet.
  const agentRegionCount = React.useMemo(() => {
    if (!isFieldAgent || !allowedDistricts || allowedDistricts.length === 0) return null;
    const regions = new Set<string>();
    for (const [region, districts] of Object.entries(GHANA_REGIONS_AND_DISTRICTS)) {
      if ((districts as string[]).some(d => allowedDistricts.includes(d))) {
        regions.add(region);
      }
    }
    return regions.size;
  }, [isFieldAgent, allowedDistricts]);

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
        value: (agentRegionCount !== null ? agentRegionCount : uniqueRegions.length).toString(),
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
  const isDataLoading = isFieldAgent ? districtFarmers === undefined : adminTotalFarmers === undefined;

  // Field agent with no districts: show the gate (only after loading resolves).
  if (isFieldAgent && allowedDistricts !== undefined && allowedDistricts.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Dashboard" description="An overview of your agricultural network." />
        <NoDistrictAssigned />
      </AppShell>
    );
  }

  if (isDataLoading) {
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
            <SelectTrigger className="w-full sm:w-40">
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
            {isAdmin && (
              <Link href="/ai-insights" className="flex-1 sm:flex-none">
                <Button className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] text-white">
                  <Bot className="mr-2 h-4 w-4 text-white" />
                  <span className="hidden xs:inline">AI Insights</span>
                  <span className="xs:hidden">Insights</span>
                </Button>
              </Link>
            )}
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
