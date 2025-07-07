'use client';

import * as React from 'react';
import { useDispatch } from 'react-redux';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import type { Kpi } from '@/lib/types';
import { Users, MapPin, BarChart2, Bot } from 'lucide-react';
import { FarmersByRegionChart } from '@/components/dashboard/farmers-by-region-chart';
import { FarmersByGenderChart } from '@/components/dashboard/farmers-by-gender-chart';
import { RecentFarmersTable } from '@/components/dashboard/recent-farmers-table';
import { AiAssistant } from '@/components/ai-assistant';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

export default function DashboardPage() {
  const [isAiAssistantOpen, setIsAiAssistantOpen] = React.useState(false);
  const farmers = useSelector((state: RootState) => state.farmers.data);

  const kpis: Kpi[] = React.useMemo(() => {
    if (farmers.length === 0) return [];
    const activeFarmers = farmers.filter((f) => f.status === 'Active').length;
    const regions = new Set(farmers.map((f) => f.region).filter(Boolean)).size;
    const maleFarmers = farmers.filter((f) => f.gender === 'Male').length;
    const femaleFarmers = farmers.filter((f) => f.gender === 'Female').length;
    const genderRatio = femaleFarmers > 0 ? `${(maleFarmers / femaleFarmers).toFixed(1)}:1 M/F` : 'N/A';

    return [
      { label: 'Total Farmers', value: activeFarmers.toString(), icon: Users },
      { label: 'Regions Covered', value: regions.toString(), icon: MapPin },
      { label: 'Gender Ratio', value: genderRatio, icon: BarChart2 },
    ];
  }, [farmers]);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="An overview of your agricultural network."
      >
        <Button onClick={() => setIsAiAssistantOpen(true)}>
          <Bot className="mr-2" />
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

      <AiAssistant 
        open={isAiAssistantOpen}
        onOpenChange={setIsAiAssistantOpen} 
        farmers={farmers}
      />
    </AppShell>
  );
}
