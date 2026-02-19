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
import type { Farmer } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type RecentFarmersTableProps = {
  farmers: Farmer[];
};

export function RecentFarmersTable({ farmers }: RecentFarmersTableProps) {
  const recentFarmers = [...farmers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline">Recent Additions</CardTitle>
        <CardDescription>The latest farmers to join the network.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Region</TableHead>
              <TableHead className="hidden md:table-cell">Date Added</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentFarmers.map((farmer) => (
              <TableRow key={farmer.id}>
                <TableCell>
                  <div className="font-medium">{farmer.name}</div>
                  <div className="text-sm text-muted-foreground">{farmer.id}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{farmer.region || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {farmer.createdAt ? format(new Date(farmer.createdAt), 'PPP') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const status = farmer.status as 'Active' | 'Inactive' | undefined;
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
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
