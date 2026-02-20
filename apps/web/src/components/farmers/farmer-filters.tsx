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
import { X } from 'lucide-react';
import { CalendarDateRangePicker } from '@/components/dashboard/date-range-picker';
import { DateRange } from 'react-day-picker';
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
    gender: string;
    minAge: string;
    maxAge: string;
    dateRange?: DateRange;
};

export type FarmerFiltersProps = {
    filters: FarmerFiltersState;
    onFilterChange: (filters: FarmerFiltersState) => void;
};

export function FarmerFilters({ filters, onFilterChange }: FarmerFiltersProps) {
    const { region, district, society, community, status, minFarmSize, maxFarmSize, gender, minAge, maxAge, dateRange } = filters;

    const uniqueRegions = useUniqueRegions();
    const uniqueDistricts = useUniqueDistricts(region !== 'all' ? region : undefined);
    const uniqueSocieties = useUniqueSocieties(district !== 'all' ? district : undefined);
    const uniqueCommunities = useUniqueCommunities(society !== 'all' ? society : undefined);

    const handleFilterChange = (key: string, value: any) => {
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
            gender: 'all',
            minAge: '',
            maxAge: '',
            dateRange: undefined,
        });
    };

    const hasActiveFilters = region !== 'all' || district !== 'all' || society !== 'all' || community !== 'all' || status !== 'all' || minFarmSize || maxFarmSize || gender !== 'all' || minAge || maxAge || dateRange?.from;

    return (
        <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div>
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

                <div>
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

                <div>
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

                <div>
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

                <div>
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

                <div>
                    <Select value={gender} onValueChange={(val) => handleFilterChange('gender', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Genders" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Genders</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 items-center">
                    <Input
                        type="number"
                        placeholder="Min Age"
                        value={minAge}
                        onChange={(e) => handleFilterChange('minAge', e.target.value)}
                        className="min-w-0"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="number"
                        placeholder="Max Age"
                        value={maxAge}
                        onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                        className="min-w-0"
                    />
                </div>

                <div className="flex gap-2">
                    <Input
                        type="number"
                        placeholder="Min acres"
                        value={minFarmSize}
                        onChange={(e) => handleFilterChange('minFarmSize', e.target.value)}
                        className="min-w-0"
                    />
                </div>

                <div className="flex gap-2 items-center">
                    <CalendarDateRangePicker
                        date={dateRange}
                        onDateChange={(date) => handleFilterChange('dateRange', date)}
                    />
                    {hasActiveFilters && (
                        <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0 h-10 w-10">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
