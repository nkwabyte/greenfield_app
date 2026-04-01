'use client';

import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Search, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductsBySupplier } from '@/hooks/useData';
import type { Product } from '@/lib/types';

const columns: ColumnDef<Product>[] = [
    {
        accessorKey: 'name',
        header: 'Product Name',
        cell: ({ row }) => (
            <div className="font-medium">{row.getValue('name')}</div>
        ),
    },
    {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => {
            const category = row.getValue('category') as string;
            const colorMap: Record<string, string> = {
                Seeds: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                Fertilizers: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                Pesticides: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                Equipment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                Other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
            };
            return (
                <Badge variant="outline" className={colorMap[category] || colorMap.Other}>
                    {category}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'quantity',
        header: 'Stock',
        cell: ({ row }) => {
            const qty = row.getValue('quantity') as number;
            const isLow = qty < 10;
            return (
                <div className={`font-medium flex items-center gap-1.5 ${isLow ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                    {qty} units
                </div>
            );
        },
    },
    {
        accessorKey: 'price',
        header: 'Unit Price',
        cell: ({ row }) => {
            const price = parseFloat(row.getValue('price'));
            return <div className="font-medium">GH₵ {price.toFixed(2)}</div>;
        },
    },
    {
        id: 'totalValue',
        header: 'Total Value',
        cell: ({ row }) => {
            const price = parseFloat(row.original.price as any);
            const qty = row.original.quantity;
            return <div className="font-semibold">GH₵ {(price * qty).toFixed(2)}</div>;
        },
    },
];

type SupplierProductsProps = {
    supplierId: string;
};

export function SupplierProducts({ supplierId }: SupplierProductsProps) {
    const products = useProductsBySupplier(supplierId);
    const [globalFilter, setGlobalFilter] = React.useState('');

    const table = useReactTable({
        data: products ?? [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
    });

    if (products === undefined) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        );
    }

    const totalValue = (products ?? []).reduce((sum, p) => sum + p.price * p.quantity, 0);
    const lowStockCount = (products ?? []).filter(p => p.quantity < 10).length;

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Products Supplied
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {products.length} product{products.length !== 1 ? 's' : ''} • Total value: GH₵ {totalValue.toFixed(2)}
                            {lowStockCount > 0 && (
                                <span className="text-red-600 dark:text-red-400 ml-2">
                                    • {lowStockCount} low stock
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mb-3 opacity-40" />
                        <p className="text-lg font-medium">No products yet</p>
                        <p className="text-sm">Products assigned to this supplier will appear here.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.length ? (
                                    table.getRowModel().rows.map(row => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map(cell => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No matching products found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
