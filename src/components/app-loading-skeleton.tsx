'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function AppLoadingSkeleton() {
    return (
        <div className="flex min-h-screen flex-col">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-6 w-[150px]" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1">
                {/* Sidebar Skeleton */}
                <aside className="hidden md:block w-64 border-r bg-background">
                    <div className="p-4 space-y-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-2">
                                <Skeleton className="h-5 w-5 rounded" />
                                <Skeleton className="h-4 w-[120px]" />
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Dashboard Content Skeleton */}
                <main className="flex-1 p-4 sm:p-6 space-y-4">
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-8 w-[200px] mb-2" />
                            <Skeleton className="h-4 w-[300px]" />
                        </div>
                        <Skeleton className="h-10 w-[120px]" />
                    </div>

                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-4 w-4 rounded" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-[80px] mb-2" />
                                    <Skeleton className="h-3 w-[120px]" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-[150px] mb-2" />
                                <Skeleton className="h-4 w-[200px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[250px] w-full" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-[150px] mb-2" />
                                <Skeleton className="h-4 w-[200px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-[250px] w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}

export function SimpleLoadingSkeleton() {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center gap-4">
            <Image src="/logo.svg" width={120} height={120} alt="Greenfield CRM logo" className="animate-pulse" />
            <div className="space-y-2 text-center">
                <Skeleton className="h-6 w-[200px] mx-auto" />
                <Skeleton className="h-4 w-[150px] mx-auto" />
            </div>
        </div>
    );
}
