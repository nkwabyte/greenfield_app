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

export type EmployeeFiltersState = {
    role: string;
    status: string;
    search: string;
};

export type EmployeeFiltersProps = {
    filters: EmployeeFiltersState;
    onFilterChange: (filters: EmployeeFiltersState) => void;
};

export function EmployeeFilters({ filters, onFilterChange }: EmployeeFiltersProps) {
    const { role, status, search } = filters;

    const handleFilterChange = (key: keyof EmployeeFiltersState, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFilterChange({
            role: 'all',
            status: 'all',
            search: '',
        });
    };

    const hasActiveFilters = role !== 'all' || status !== 'all' || search !== '';

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex-1 min-w-[200px]">
                <Input
                    placeholder="Search name or email..."
                    value={search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
            </div>

            <Select value={role} onValueChange={(val) => handleFilterChange('role', val)}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Field Agent">Field Agent</SelectItem>
                    <SelectItem value="Accountant">Accountant</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                </SelectContent>
            </Select>

            <Select value={status} onValueChange={(val) => handleFilterChange('status', val)}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
            </Select>

            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="mr-1.5 h-4 w-4" />
                    Clear
                </Button>
            )}
        </div>
    );
}
