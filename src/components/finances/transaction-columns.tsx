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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const getColumns = ({ onEdit, onDelete }: { onEdit: (transaction: Transaction) => void, onDelete: (id: string) => void }): ColumnDef<Transaction>[] => [
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
    accessorKey: 'description',
    header: 'Description',
     cell: ({ row }) => {
      const transaction = row.original;
      return (
        <div className="flex flex-col">
            <span className="font-medium">{transaction.description}</span>
            <span className="text-sm text-muted-foreground">{transaction.id}</span>
        </div>
      );
    },
  },
   {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
        const type = row.getValue('type') as Transaction['type'];
        const isIncome = type === 'Income';
        return (
            <Badge variant={isIncome ? 'default' : 'destructive'} className={cn('border-transparent', isIncome ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive')}>
                {type}
            </Badge>
        )
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <Badge variant="outline">{row.getValue('category')}</Badge>,
  },
   {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue('date') as string;
      return <div>{format(new Date(date), 'PPP')}</div>
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number;
      const type = row.original.type;
      return <div className={cn("text-right font-medium", type === 'Income' ? 'text-primary' : 'text-destructive')}>{currencyFormatter.format(amount)}</div>;
    },
  },
  {
    accessorKey: 'employeeName',
    header: 'Employee',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const transaction = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(transaction)}>Edit Transaction</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(transaction.id)}>Delete Transaction</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
