'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { AiAssistant } from '@/components/ai-assistant';
import { useFarmers } from '@/hooks/useData';
import { Skeleton } from '@/components/ui/skeleton';

export default function AiInsightsPage() {
    const farmers = useFarmers();

    if (!farmers) {
        return (
            <AppShell>
                <PageHeader
                    title="AI Insights"
                    description="Get real-time business insights and analytics from your data."
                />
                <div className="p-6 space-y-4">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                title="AI Insights"
                description="Get real-time business insights and analytics from your data."
            />
            <div className="p-6 h-[calc(100vh-10rem)]">
                <AiAssistant farmers={farmers} />
            </div>
        </AppShell>
    );
}
