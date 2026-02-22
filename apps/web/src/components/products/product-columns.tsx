'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Product, Supplier } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
});

const getStockStatus = (quantity: number): { label: string, variant: 'default' | 'secondary' | 'destructive' } => {
  if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' };
  if (quantity < 10) return { label: 'Low Stock', variant: 'secondary' };
  return { label: 'In Stock', variant: 'default' };
};

export const getColumns = ({ onEdit, onDelete, suppliers }: { onEdit: (product: Product) => void, onDelete: (id: string) => void, suppliers: Pick<Supplier, 'id' | 'name'>[] }): ColumnDef<Product>[] => [
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
    header: () => <div className="text-center">Quantity</div>,
    cell: ({ row }) => {
      const quantity = row.getValue('quantity') as number;
      const status = getStockStatus(quantity);

      const variantClasses = {
        'In Stock': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
        'Low Stock': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
        'Out of Stock': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
      };

      return (
        <div className="text-center flex flex-col items-center gap-1">
          <span className="font-medium">{quantity}</span>
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', variantClasses[status.label as keyof typeof variantClasses])}
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
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const router = useRouter();
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
            <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(product)}>Edit Product</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(product.id)}>Delete Product</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
