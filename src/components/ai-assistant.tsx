'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from './ui/button';
import { Bot, Lightbulb, UserCheck, BarChart } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';
import type { Farmer } from '@/lib/types';

type AiAssistantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmers: Farmer[];
};

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export function AiAssistant({ open, onOpenChange, farmers }: AiAssistantProps) {
  const [kpiInsights, setKpiInsights] = React.useState<any>(null);
  const [kpiLoading, setKpiLoading] = React.useState<LoadingState>('idle');

  const [decisions, setDecisions] = React.useState<any>(null);
  const [decisionsLoading, setDecisionsLoading] = React.useState<LoadingState>('idle');

  const [persona, setPersona] = React.useState<any>(null);
  const [personaLoading, setPersonaLoading] = React.useState<LoadingState>('idle');

  const getFarmerDataSummary = React.useCallback(() => {
    const total = farmers.length;
    const regions = farmers.reduce((acc, f) => {
      if (f.region) {
        acc[f.region] = (acc[f.region] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return `Total farmers: ${total}. Distribution by region: ${JSON.stringify(regions)}. A sample of farmers: ${JSON.stringify(farmers.slice(0, 3))}`;
  }, [farmers]);

  const handleSummarizeKpis = async () => {
    setKpiLoading('loading');
    try {
      const regionalCounts = farmers.reduce((acc, f) => {
        if (f.region) {
          acc[f.region] = (acc[f.region] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const male = farmers.filter(f => f.gender === 'Male').length;
      const female = farmers.filter(f => f.gender === 'Female').length;
      const totalWithGender = male + female;

      const response = await fetch('/api/ai/summarize-kpis', {
        method: 'POST',
        body: JSON.stringify({
          totalFarmers: farmers.length,
          regionalCounts,
          genderRatios: {
            male: totalWithGender > 0 ? (male / totalWithGender) * 100 : 0,
            female: totalWithGender > 0 ? (female / totalWithGender) * 100 : 0,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch summary');
      const result = await response.json();
      setKpiInsights(result);
      setKpiLoading('success');
    } catch (e) {
      setKpiLoading('error');
    }
  };

  const handleSuggestDecisions = async () => {
    setDecisionsLoading('loading');
    try {
      const response = await fetch('/api/ai/suggest-business-decisions', {
        method: 'POST',
        body: JSON.stringify({
          farmerDataSummary: getFarmerDataSummary(),
          inventoryDataSummary: 'Inventory data is not available at the moment. Focus on farmer data.',
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch decisions');
      const result = await response.json();
      setDecisions(result);
      setDecisionsLoading('success');
    } catch (e) {
      setDecisionsLoading('error');
    }
  };

  const handleGeneratePersona = async () => {
    setPersonaLoading('loading');
    try {
      const response = await fetch('/api/ai/generate-farmer-persona', {
        method: 'POST',
        body: JSON.stringify({
          farmerDataSummary: getFarmerDataSummary(),
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch persona');
      const result = await response.json();
      setPersona(result);
      setPersonaLoading('success');
    } catch (e) {
      setPersonaLoading('error');
    }
  };

  const renderContent = (
    loading: LoadingState,
    data: any,
    generator: () => void,
    idleText: string,
    resultRenderer: () => React.ReactNode
  ) => {
    if (loading === 'loading') {
      return (
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }
    if (loading === 'success' && data) {
      return <div className="pt-4">{resultRenderer()}</div>;
    }
    if (loading === 'error') {
      return <p className="pt-4 text-destructive">Could not generate insights. Please try again.</p>;
    }
    return (
      <div className="flex flex-col items-center justify-center space-y-4 pt-8 text-center">
        <p className="text-muted-foreground">{idleText}</p>
        <Button onClick={generator}>Generate Now</Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
            <Bot /> AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get real-time business insights and analytics from your data.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="kpi" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kpi">
              <BarChart className="mr-2 h-4 w-4" />KPI Insights
            </TabsTrigger>
            <TabsTrigger value="decisions">
              <Lightbulb className="mr-2 h-4 w-4" />Suggestions
            </TabsTrigger>
            <TabsTrigger value="persona">
              <UserCheck className="mr-2 h-4 w-4" />Persona
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kpi" className="min-h-[200px]">
            {renderContent(
              kpiLoading,
              kpiInsights,
              handleSummarizeKpis,
              'Summarize key performance indicators to quickly understand trends.',
              () => (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h4 className="font-semibold">Summary</h4>
                      <p className="text-sm text-muted-foreground">{kpiInsights?.summary}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Recommendations</h4>
                      <p className="text-sm text-muted-foreground">{kpiInsights?.recommendations}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
          <TabsContent value="decisions" className="min-h-[200px]">
            {renderContent(
              decisionsLoading,
              decisions,
              handleSuggestDecisions,
              'Get data-driven business decisions for optimization.',
              () => (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{decisions?.suggestedDecisions}</p>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
          <TabsContent value="persona" className="min-h-[200px]">
            {renderContent(
              personaLoading,
              persona,
              handleGeneratePersona,
              'Generate a representative farmer persona from your CRM data.',
              () => (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h4 className="font-semibold">{persona?.personaName}</h4>
                      <p className="text-sm text-muted-foreground">{persona?.personaDescription}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
