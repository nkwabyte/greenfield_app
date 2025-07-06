import React from 'react';
import { AppShell } from '../app-shell';
import { PageHeader } from '../page-header';
import { Skeleton } from '../ui/skeleton';

const FullSkeletonUI = () => {
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

export default FullSkeletonUI