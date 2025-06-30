
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Product, Supplier } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const getStockStatus = (quantity: number): { label: string, variant: 'default' | 'secondary' | 'destructive' } => {
  if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' };
  if (quantity < 10) return { label: 'Low Stock', variant: 'secondary' };
  return { label: 'In Stock', variant: 'default' };
};

export const getColumns = ({ onEdit, suppliers }: { onEdit: (product: Product) => void, suppliers: Supplier[] }): ColumnDef<Product>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Product Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const product = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">{product.id}</span>
            </div>
        )
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('category')}</Badge>,
  },
  {
    accessorKey: 'supplierId',
    header: 'Supplier',
    cell: ({ row }) => {
        const supplierId = row.getValue('supplierId') as string;
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier ? supplier.name : 'Unknown';
    }
  },
  {
    accessorKey: 'quantity',
    header: () => <div className="text-right">Quantity</div>,
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number;
      const status = getStockStatus(quantity);
      return (
        <div className="text-right flex flex-col items-end">
          <span>{quantity}</span>
          <Badge 
            variant={status.variant} 
            className={cn('text-xs', {
              'bg-primary/20 text-primary-foreground': status.label === 'In Stock',
              'bg-yellow-500/20 text-yellow-700': status.label === 'Low Stock',
              'bg-destructive/20': status.label === 'Out of Stock'
            })}
          >
            {status.label}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'price',
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const price = row.getValue('price') as number;
      return <div className="text-right">{currencyFormatter.format(price)}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const product = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(product)}>Edit Product</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Delete Product</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
