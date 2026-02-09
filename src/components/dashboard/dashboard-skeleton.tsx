'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
    return (
        <div className="flex-1 space-y-4 p-4 sm:p-6">
            {/* Page Header Skeleton */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <Skeleton className="h-8 w-[200px] mb-2" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-[120px]" />
                    <Skeleton className="h-10 w-[100px]" />
                </div>
            </div>

            {/* KPI Cards Skeleton */}
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

            {/* Charts Section Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <Skeleton className="h-6 w-[150px] mb-2" />
                        <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>

                {/* Side Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <Skeleton className="h-6 w-[120px] mb-2" />
                        <Skeleton className="h-4 w-[180px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Additional Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[140px] mb-2" />
                        <Skeleton className="h-4 w-[160px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[130px] mb-2" />
                        <Skeleton className="h-4 w-[170px]" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Table Skeleton */}
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-[150px] mb-2" />
                    <Skeleton className="h-4 w-[220px]" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-3 w-[150px]" />
                                </div>
                                <Skeleton className="h-8 w-[80px]" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
