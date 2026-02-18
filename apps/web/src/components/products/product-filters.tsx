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
import { X, Search } from 'lucide-react';
import { useUniqueProductCategories } from '@/hooks/useData';

export type ProductFiltersState = {
    search: string;
    category: string;
    stockStatus: string;
};

export type ProductFiltersProps = {
    filters: ProductFiltersState;
    onFilterChange: (filters: ProductFiltersState) => void;
};

export function ProductFilters({ filters, onFilterChange }: ProductFiltersProps) {
    const { search, category, stockStatus } = filters;
    const categories = useUniqueProductCategories() ?? [];

    const handleChange = (key: keyof ProductFiltersState, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFilterChange({ search: '', category: 'all', stockStatus: 'all' });
    };

    const hasActiveFilters = search !== '' || category !== 'all' || stockStatus !== 'all';

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => handleChange('search', e.target.value)}
                    className="pl-8"
                />
            </div>

            {/* Category */}
            <Select value={category} onValueChange={(val) => handleChange('category', val)}>
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Stock Status */}
            <Select value={stockStatus} onValueChange={(val) => handleChange('stockStatus', val)}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
            </Select>

            {/* Clear */}
            {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                    <X className="mr-1.5 h-4 w-4" />
                    Clear
                </Button>
            )}
        </div>
    );
}
