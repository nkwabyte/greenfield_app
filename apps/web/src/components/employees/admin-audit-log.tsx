'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Search, ChevronDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AuditLog {
    id: string;
    admin_id: string;
    action: string;
    target_user_id: string;
    target_email: string;
    changes: Record<string, any>;
    created_at: string;
    admin_name?: string;
}

export function AdminAuditLog() {
    const [logs, setLogs] = React.useState<AuditLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterAction, setFilterAction] = React.useState<string | null>(null);

    React.useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/audit-logs');

            if (!response.ok) {
                console.error('Failed to fetch audit logs:', response.statusText);
                return;
            }

            const { data } = await response.json();
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.target_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = !filterAction || log.action === filterAction;

        return matchesSearch && matchesAction;
    });

    const actionColors: Record<string, string> = {
        update_role: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
        reset_password: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
        set_status: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
    };

    const actionLabels: Record<string, string> = {
        update_role: 'Role Updated',
        reset_password: 'Password Reset',
        set_status: 'Status Changed',
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Admin Action Log
                </CardTitle>
                <CardDescription>Track all administrative actions performed on employees</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by email or admin name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="min-w-40">
                                {filterAction ? actionLabels[filterAction] : 'All Actions'}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setFilterAction(null)}>
                                All Actions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterAction('update_role')}>
                                Role Updated
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterAction('reset_password')}>
                                Password Reset
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterAction('set_status')}>
                                Status Changed
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
                        Refresh
                    </Button>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Admin</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target Employee</TableHead>
                                <TableHead>Changes</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Loading audit logs...
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No audit logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium">{log.admin_name}</TableCell>
                                        <TableCell>
                                            <Badge className={actionColors[log.action] || 'bg-gray-100'}>
                                                {actionLabels[log.action] || log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{log.target_email}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {log.changes && typeof log.changes === 'object' ? (
                                                <div className="max-w-xs">
                                                    {Object.entries(log.changes).map(([key, value]) => (
                                                        <div key={key} className="text-xs">
                                                            {key}: {String(value)}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <p className="text-xs text-muted-foreground">
                    Showing {filteredLogs.length} of {logs.length} actions
                </p>
            </CardContent>
        </Card>
    );
}
