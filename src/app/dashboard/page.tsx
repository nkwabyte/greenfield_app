'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi, Farmer } from '@/lib/types';
import { Users, MapPin, BarChart2, Bot } from 'lucide-react';
import { FarmersByRegionChart } from '@/components/dashboard/farmers-by-region-chart';
import { FarmersByGenderChart } from '@/components/dashboard/farmers-by-gender-chart';
import { RecentFarmersTable } from '@/components/dashboard/recent-farmers-table';
import { AiAssistant } from '@/components/ai-assistant';
import { getFirebaseFarmers } from '@/lib/firebase/services/farmers';
import { Skeleton } from '@/components/ui/skeleton';
import { localDb } from '@/lib/db/local-db';

export default function DashboardPage() {
  const [farmers, setFarmers] = React.useState<Farmer[]>([]);
const [isLoading, setIsLoading] = React.useState(true);
const [isAiAssistantOpen, setIsAiAssistantOpen] = React.useState(false);

React.useEffect(() => {
  const fetchLocalFarmers = async () => {
    try {
      const localFarmers = await localDb.farmers.toArray();
      setFarmers(localFarmers);
    } catch (error) {
      console.error("Failed to fetch farmers from local DB:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const syncWithFirebase = async () => {
    if (!navigator.onLine) return;

    try {
      const cloudFarmers = await getFirebaseFarmers();

      // Optionally update your local DB with fresh cloud data
      for (const farmer of cloudFarmers) {
        await localDb.farmers.put({ ...farmer, synced: 1 });
      }

      const updatedFarmers = await localDb.farmers.toArray();
      setFarmers(updatedFarmers);
    } catch (error) {
      console.warn("Firebase sync failed:", error);
    }
  };

  syncWithFirebase();

  fetchLocalFarmers();
}, []);


  const kpis: Kpi[] = React.useMemo(() => {
    if (isLoading) return [];
    const activeFarmers = farmers.filter(f => f.status === 'Active').length;
    const regions = new Set(farmers.map(f => f.region).filter(Boolean)).size;
    const maleFarmers = farmers.filter(f => f.gender === 'Male').length;
    const femaleFarmers = farmers.filter(f => f.gender === 'Female').length;
    const genderRatio = femaleFarmers > 0 ? `${(maleFarmers / femaleFarmers).toFixed(1)}:1 M/F` : 'N/A';

    return [
      { label: 'Total Farmers', value: activeFarmers.toString(), icon: Users },
      { label: 'Regions Covered', value: regions.toString(), icon: MapPin },
      { label: 'Gender Ratio', value: genderRatio, icon: BarChart2 },
    ];
  }, [farmers, isLoading]);

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader 
          title="Dashboard" 
          description="An overview of your agricultural network."
        />
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Skeleton className="h-80 lg:col-span-3" />
            <Skeleton className="h-80 lg:col-span-2" />
          </div>
          <div>
            <Skeleton className="h-96" />
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
        <Button onClick={() => setIsAiAssistantOpen(true)}>
          <Bot className="mr-2"/>
          AI Insights
        </Button>
      </PageHeader>
      
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map(kpi => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <FarmersByRegionChart farmers={farmers} />
          </div>
          <div className="lg:col-span-2">
            <FarmersByGenderChart farmers={farmers} />
          </div>
        </div>

        <div>
          <RecentFarmersTable farmers={farmers} />
        </div>
      </div>
      <AiAssistant open={isAiAssistantOpen} onOpenChange={setIsAiAssistantOpen} farmers={farmers} />
    </AppShell>
  );
}
