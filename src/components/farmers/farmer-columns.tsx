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
import type { Farmer } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';

export const getColumns = ({ onEdit, onDelete }: { onEdit: (farmer: Farmer) => void, onDelete: (id: string) => void }): ColumnDef<Farmer>[] => [
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
        Farmer
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const farmer = row.original;
      return (
        <div className="flex flex-col">
            <span className="font-medium">{farmer.name}</span>
            <span className="text-sm text-muted-foreground">{farmer.contact || 'No contact'}</span>
        </div>
      );
    },
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const farmer = row.original;
      const locationParts = [farmer.community, farmer.district, farmer.region].filter(Boolean);
      return (
        <div className="flex flex-col">
            <span className="font-medium">{locationParts.slice(0, 2).join(', ')}</span>
            <span className="text-sm text-muted-foreground">{farmer.region}</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'cropsGrown',
    header: 'Crops',
    cell: ({ row }) => {
        const crops = row.getValue('cropsGrown') as string[] | undefined;
        if (!crops || crops.length === 0) return <span className="text-muted-foreground">N/A</span>;
        return (
            <div className="flex flex-wrap gap-1 max-w-xs">
                {crops.slice(0, 2).map(crop => (
                    <Badge key={crop} variant="outline">{crop}</Badge>
                ))}
                {crops.length > 2 && <Badge variant="secondary">+{crops.length - 2}</Badge>}
            </div>
        )
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as 'Active' | 'Inactive' | undefined;
      return (
        <Badge variant={status === 'Active' ? 'default' : 'secondary'} className={status === 'Active' ? 'bg-primary/20 text-primary-foreground' : ''}>
          {status || 'Unknown'}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'farmSize',
    header: () => <div className="text-right">Farm Size</div>,
    cell: ({ row }) => {
      const amount = row.getValue('farmSize') as number | undefined;
      return <div className="text-right font-medium">{amount ? `${amount} acres` : 'N/A'}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const farmer = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(farmer)}>Edit Farmer</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(farmer.id)}
            >
              Copy Farmer ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(farmer.id)}>Delete Farmer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
