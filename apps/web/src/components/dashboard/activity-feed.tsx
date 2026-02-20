'use client';

import * as React from 'react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { ActivityLog, ActivityEntityType } from '@/lib/supabase/services/activity-log';
import {
    Users, Briefcase, Package, Truck, Landmark,
    Layers, FileText, RefreshCw, AlertCircle,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITY_ICONS: Record<ActivityEntityType, React.FC<{ className?: string }>> = {
    farmer: (p) => <Users     {...p} />,
    employee: (p) => <Briefcase {...p} />,
    product: (p) => <Package   {...p} />,
    supplier: (p) => <Truck     {...p} />,
    transaction: (p) => <Landmark  {...p} />,
    farmer_group: (p) => <Layers    {...p} />,
    farmer_request: (p) => <FileText  {...p} />,
};

const ENTITY_LABELS: Record<ActivityEntityType, string> = {
    farmer: 'Farmer',
    employee: 'Employee',
    product: 'Product',
    supplier: 'Supplier',
    transaction: 'Transaction',
    farmer_group: 'Group',
    farmer_request: 'Request',
};

const ACTION_COLORS: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ACTION_PAST: Record<string, string> = {
    create: 'added',
    update: 'updated',
    delete: 'removed',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// ─── Single Row ───────────────────────────────────────────────────────────────

function ActivityRow({ log }: { log: ActivityLog }) {
    const Icon = ENTITY_ICONS[log.entity_type as ActivityEntityType] ?? (() => null);
    const entityLabel = ENTITY_LABELS[log.entity_type as ActivityEntityType] ?? log.entity_type;
    const actionLabel = ACTION_PAST[log.action] ?? log.action;
    const badgeClass = ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground';

    return (
        <div className="flex items-start gap-3 py-3 border-b last:border-0 group">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                    <span className="font-medium">{log.user_name}</span>
                    {' '}{actionLabel}{' '}
                    <span className="text-muted-foreground">{entityLabel.toLowerCase()}</span>
                    {' '}
                    <span className="font-medium truncate">&ldquo;{log.entity_name}&rdquo;</span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                        {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{log.user_role}</Badge>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ActivityFeedProps {
    /** Limit number of entries shown. Default 20. */
    limit?: number;
    /** If true, show logs from all users (Admin only — RLS enforces this automatically). */
    showAll?: boolean;
    className?: string;
}

export function ActivityFeed({ limit = 20, showAll = false, className }: ActivityFeedProps) {
    const user = useSelector((state: RootState) => state.auth.user);
    const isAdmin = user?.role === 'Admin';

    // Employees always see only their own (RLS). Admins can optionally see all.
    const { logs, isLoading, error, refresh } = useActivityLog({
        limit,
        days: 30,
        userId: isAdmin && showAll ? undefined : user?.uid,
        refreshInterval: 60_000,
    });

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
                    <CardDescription className="text-xs">
                        {isAdmin && showAll ? 'All users · ' : 'Your activity · '}
                        last 30 days
                    </CardDescription>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={refresh}
                    title="Refresh"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </CardHeader>

            <CardContent className="p-0 px-4 pb-4">
                {isLoading && (
                    <div className="space-y-3 pt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-2.5 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex items-center gap-2 py-6 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {!isLoading && !error && logs.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No activity in the last 30 days.
                    </p>
                )}

                {!isLoading && !error && logs.length > 0 && (
                    <ScrollArea className="max-h-[400px] pr-1">
                        {logs.map(log => (
                            <ActivityRow key={log.id} log={log} />
                        ))}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
