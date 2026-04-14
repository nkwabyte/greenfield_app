'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { useRequireRole } from '@/hooks/use-role-guard';
import { AdminAuditLog } from '@/components/employees/admin-audit-log';
import { CocaoDistrictsManagement } from '@/components/admin/cocoa-districts-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Users, Clock } from 'lucide-react';

interface Stats {
    totalEmployees: number;
    adminUsers: number;
    recentActions: number;
}

export default function AdminDashboardPage() {
    const { allowed } = useRequireRole(['Admin']);
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = React.useState(true);

    React.useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const response = await fetch('/api/admin/stats');
            if (!response.ok) {
                console.error('Failed to fetch stats:', response.statusText);
                return;
            }
            const { data } = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    if (!allowed) return null;

    return (
        <AppShell>
            <div className="space-y-6 pb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Manage administrative actions and audit logs</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Total Employees
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {statsLoading ? '-' : stats?.totalEmployees ?? 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Managed employees</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                Admin Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {statsLoading ? '-' : stats?.adminUsers ?? 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Administrators</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Recent Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {statsLoading ? '-' : stats?.recentActions ?? 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Last 24 hours</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Cocoa Districts Management */}
                <CocaoDistrictsManagement />

                {/* Audit Log */}
                <AdminAuditLog />
            </div>
        </AppShell>
    );
}
