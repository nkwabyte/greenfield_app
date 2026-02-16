'use client';

import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import {
    useUniqueRegions,
    useUniqueDistricts,
    useUniqueSocieties,
    useUniqueCommunities,
} from '@/hooks/useData';

export type FarmerFiltersState = {
    region: string;
    district: string;
    society: string;
    community: string;
    status: string;
    minFarmSize: string;
    maxFarmSize: string;
};

export type FarmerFiltersProps = {
    filters: FarmerFiltersState;
    onFilterChange: (filters: FarmerFiltersState) => void;
};

export function FarmerFilters({ filters, onFilterChange }: FarmerFiltersProps) {
    const { region, district, society, community, status, minFarmSize, maxFarmSize } = filters;

    const uniqueRegions = useUniqueRegions();
    const uniqueDistricts = useUniqueDistricts(region !== 'all' ? region : undefined);
    const uniqueSocieties = useUniqueSocieties(district !== 'all' ? district : undefined);
    const uniqueCommunities = useUniqueCommunities(society !== 'all' ? society : undefined);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value };
        if (key === 'region') {
            newFilters.district = 'all';
            newFilters.society = 'all';
            newFilters.community = 'all';
        } else if (key === 'district') {
            newFilters.society = 'all';
            newFilters.community = 'all';
        } else if (key === 'society') {
            newFilters.community = 'all';
        }
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        onFilterChange({
            region: 'all',
            district: 'all',
            society: 'all',
            community: 'all',
            status: 'all',
            minFarmSize: '',
            maxFarmSize: '',
        });
    };

    const hasActiveFilters = region !== 'all' || district !== 'all' || society !== 'all' || community !== 'all' || status !== 'all' || minFarmSize || maxFarmSize;

    return (
        <div className="space-y-4 mb-6 p-4 border rounded-md bg-card">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Filters</h3>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 lg:px-3">
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={region} onValueChange={(val) => handleFilterChange('region', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Regions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            {uniqueRegions?.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>District</Label>
                    <Select value={district} onValueChange={(val) => handleFilterChange('district', val)} disabled={region === 'all'}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Districts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Districts</SelectItem>
                            {uniqueDistricts?.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Society</Label>
                    <Select value={society} onValueChange={(val) => handleFilterChange('society', val)} disabled={district === 'all'}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Societies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Societies</SelectItem>
                            {uniqueSocieties?.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Community</Label>
                    <Select value={community} onValueChange={(val) => handleFilterChange('community', val)} disabled={society === 'all'}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Communities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Communities</SelectItem>
                            {uniqueCommunities?.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(val) => handleFilterChange('status', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Min Farm Size</Label>
                    <Input
                        type="number"
                        placeholder="Acres"
                        value={minFarmSize}
                        onChange={(e) => handleFilterChange('minFarmSize', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
