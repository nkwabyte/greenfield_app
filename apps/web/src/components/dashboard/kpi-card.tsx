import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Kpi } from '@/lib/types';

export function KpiCard({ label, value, icon: Icon, change }: Kpi) {
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-slate-400/90">
          {label}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        {change && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
