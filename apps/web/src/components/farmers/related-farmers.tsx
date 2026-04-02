'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    useFarmersPaginatedAndFiltered,
} from '@/hooks/useData';
import { DataTable } from '@/components/data-table';
import { FarmerFilters, type FarmerFiltersState } from './farmer-filters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Farmer } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

export function RelatedFarmers({ farmer }: { farmer: Farmer }) {
    const router = useRouter();

    // Initialize filters with current farmer's location
    const [filters, setFilters] = React.useState<FarmerFiltersState>({
        region: farmer.region || 'all',
        district: farmer.district || 'all',
        society: 'all',
        status: 'all',
        gender: 'all',
        minAge: '',
        maxAge: '',
        minFarmSize: '',
        maxFarmSize: '',
    });

    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Transform filters for the hook
    const queryFilters = React.useMemo(() => ({
        region: filters.region === 'all' ? undefined : filters.region,
        district: filters.district === 'all' ? undefined : filters.district,
        society: filters.society === 'all' ? undefined : filters.society,
        status: filters.status === 'all' ? undefined : (filters.status as 'Active' | 'Inactive'),
        minFarmSize: filters.minFarmSize ? Number(filters.minFarmSize) : undefined,
        maxFarmSize: filters.maxFarmSize ? Number(filters.maxFarmSize) : undefined,
    }), [filters]);

    // Fetch data based on filters
    const { data: farmersData, total: totalFarmers } = useFarmersPaginatedAndFiltered(
        pagination.pageIndex + 1,
        pagination.pageSize,
        queryFilters
    ) || { data: [], total: 0 };

    // Filter out the current farmer from the results (client-side for now, as API doesn't support exclude ID)
    // detailed filtering might reduce the page size slightly below the requested limit, which is acceptable for this view
    const filteredData = React.useMemo(() => {
        return farmersData ? farmersData.filter(f => f.id !== farmer.id) : [];
    }, [farmersData, farmer.id]);

    // Define columns for the related farmers table
    const columns: ColumnDef<Farmer>[] = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
        },
        {
            accessorKey: 'gender',
            header: 'Gender',
            cell: ({ row }) => <div>{row.getValue('gender') || 'N/A'}</div>,
        },
        {
            accessorKey: 'community',
            header: 'Community',
        },
        {
            accessorKey: 'society',
            header: 'Society',
        },
        {
            accessorKey: 'contact',
            header: 'Contact',
            cell: ({ row }) => <div>{row.getValue('contact') || 'N/A'}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return (
                    <Badge variant={status === 'Active' ? 'default' : 'secondary'}>
                        {status}
                    </Badge>
                );
            }
        }
    ];

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Related Farmers</CardTitle>
            </CardHeader>
            <CardContent>
                <FarmerFilters filters={filters} onFilterChange={(newFilters) => {
                    setFilters(newFilters);
                    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page on filter change
                }} />

                <DataTable
                    columns={columns}
                    data={filteredData}
                    filterColumnId="name"
                    filterPlaceholder="Search related farmers..."
                    isLoading={!farmersData}
                    pageCount={Math.ceil(totalFarmers / pagination.pageSize)}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    getRowId={(row) => row.id}
                    onRowClick={(row) => router.push(`/farmers/details?id=${row.id}`)}
                />
            </CardContent>
        </Card>
    );
}
