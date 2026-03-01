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
import { cn } from '@/lib/utils';

export const getColumns = ({
  onEdit,
  onDelete,
  onArchive,
  societyToGroupName = {},
}: {
  onEdit: (farmer: Farmer) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  societyToGroupName?: Record<string, string>;
}): ColumnDef<Farmer>[] => [
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
        const locationParts = [farmer.society, farmer.district, farmer.region].filter(Boolean);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{locationParts.slice(0, 2).join(', ')}</span>
            <span className="text-sm text-muted-foreground">{farmer.region}</span>
          </div>
        );
      }
    },
    {
      id: 'group',
      header: 'Group',
      cell: ({ row }) => {
        const society = row.original.society;
        const groupName = society ? societyToGroupName[society] : undefined;
        return groupName ? (
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {groupName}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: 'cropsGrown',
      header: 'Crops',
      cell: ({ row }) => {
        const crops = row.getValue('cropsGrown') as string[] | string | undefined;

        // Handle different data formats
        let count = 0;
        if (Array.isArray(crops)) {
          count = crops.length;
        } else if (typeof crops === 'string' && crops.trim()) {
          // Handle comma-separated string
          count = crops.split(',').filter(c => c.trim()).length;
        }

        return (
          <Badge variant={count === 0 ? "secondary" : "outline"} className="font-medium">
            {count} {count === 1 ? 'crop' : 'crops'}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as 'Active' | 'Inactive' | undefined;
        const displayStatus = status || 'Unknown';

        const variantClasses = {
          'Active': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
          'Inactive': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
          'Unknown': 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30',
        };

        return (
          <Badge
            variant="outline"
            className={cn("font-medium", variantClasses[displayStatus])}
          >
            {displayStatus}
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
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(farmer.id)}>
                  Archive Farmer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(farmer.id)}>Delete Farmer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
