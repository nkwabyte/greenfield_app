'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { GroupPaymentsChart } from '@/components/finances/group-payments-chart';
import { OutstandingDistributionChart } from '@/components/finances/outstanding-distribution-chart';
import { MonthlyCollectionChart } from '@/components/finances/monthly-collection-chart';
import { useGroupFinancialSummary, type GroupFinancialRow } from '@/hooks/useData';
import { useRequireRole } from '@/hooks/use-role-guard';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertCircle, BarChart3, CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const SEASON_START_YEAR = 2020;

function getSeasonYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear; y >= SEASON_START_YEAR; y--) {
        years.push(y.toString());
    }
    return years;
}

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
});

export default function FinanceGroupsPage() {
    const { allowed } = useRequireRole(['Admin'], { allowJobTitles: ['Administrative Member'] });
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const router = useRouter();

    const summary = useGroupFinancialSummary(selectedYear);

    const yearOptions = useMemo(() => getSeasonYearOptions(), []);

    if (!allowed) return null;

    if (summary === undefined) {
        return (
            <AppShell>
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppShell>
        );
    }

    const { groups, totals, monthlyPayments } = summary;

    return (
        <AppShell>
            <div className="mb-4">
                <Link href="/finances" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Finances
                </Link>
            </div>

            <PageHeader
                title="Group Financials"
                description="Financial breakdown across farmer groups for the selected season year."
            >
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-30">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {yearOptions.map((yr) => (
                                <SelectItem key={yr} value={yr}>
                                    {yr}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <KpiCard
                    label="Total Owed"
                    value={currencyFormatter.format(totals.totalOwed)}
                    icon={DollarSign}
                    change={`${groups.length} group${groups.length !== 1 ? 's' : ''}`}
                />
                <KpiCard
                    label="Total Paid"
                    value={currencyFormatter.format(totals.totalPaid)}
                    icon={TrendingUp}
                    change={`${totals.percentCollected.toFixed(1)}% collected`}
                />
                <KpiCard
                    label="Outstanding"
                    value={currencyFormatter.format(totals.outstanding)}
                    icon={AlertCircle}
                />
                <KpiCard
                    label="Total Requests"
                    value={totals.totalRequests.toString()}
                    icon={BarChart3}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <GroupPaymentsChart groups={groups} />
                <OutstandingDistributionChart groups={groups} />
            </div>
            <div className="mt-6">
                <MonthlyCollectionChart monthlyPayments={monthlyPayments} />
            </div>

            {/* Group Breakdown Table */}
            <div className="bg-card rounded-xl border overflow-hidden mt-8">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Group Breakdown</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Click a group to view its detailed requests and payments.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead className="text-right">Requests</TableHead>
                                <TableHead className="text-right">Total Owed</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-right">Outstanding</TableHead>
                                <TableHead className="text-right">Collection %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                                        No group data for {selectedYear}.
                                    </TableCell>
                                </TableRow>
                            )}
                            {groups.map((g) => (
                                <TableRow
                                    key={g.groupId}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/farmers/groups/details?id=${g.groupId}`)}
                                >
                                    <TableCell className="font-medium">{g.groupName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{g.region}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{g.district}</TableCell>
                                    <TableCell className="text-right">{g.totalRequests}</TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(g.totalOwed)}</TableCell>
                                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                        {currencyFormatter.format(g.totalPaid)}
                                    </TableCell>
                                    <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
                                        {currencyFormatter.format(g.outstanding)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={g.percentCollected >= 80 ? 'default' : g.percentCollected >= 40 ? 'secondary' : 'destructive'}
                                            className="text-xs"
                                        >
                                            {g.percentCollected.toFixed(0)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppShell>
    );
}
