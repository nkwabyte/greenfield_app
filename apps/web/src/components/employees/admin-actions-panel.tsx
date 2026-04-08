'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Key, Power, UserCheck, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateEmployeeRole, resetEmployeePassword, setEmployeeStatus } from '@/lib/supabase/admin-auth';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/supabase/services/activity-log';
import type { Employee } from '@/lib/types';
import { ResetPasswordDialog } from './reset-password-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const ROLES = [
    'Admin',
    'General Manager',
    'Operational Manager',
    'Project Coordinator',
    'Finance Manager',
    'Administrative Member',
    'Field Agent'
];

interface AdminActionsPanelProps {
    employee: Employee;
    onUpdateComplete: () => void;
    adminName: string;
}

export function AdminActionsPanel({ employee, onUpdateComplete, adminName }: AdminActionsPanelProps) {
    const { toast } = useToast();
    const [isUpdatingOption, setIsUpdatingOption] = React.useState(false);
    
    // Role state
    const [selectedRole, setSelectedRole] = React.useState(employee.role);

    // Password reset state
    const [resetPwOpen, setResetPwOpen] = React.useState(false);
    const [tempPassword, setTempPassword] = React.useState('');
    const [isResetPwConfirmOpen, setIsResetPwConfirmOpen] = React.useState(false);

    // Suspend / Activate
    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = React.useState(false);
    const isSuspended = employee.status === 'Terminated';
    const targetStatus = isSuspended ? 'Active' : 'Disabled';

    // Promote / Revoke helper
    const isAdmin = employee.role === 'Admin';
    const [isPromoteConfirmOpen, setIsPromoteConfirmOpen] = React.useState(false);

    const handleRoleChange = async () => {
        if (selectedRole === employee.role) return;
        setIsUpdatingOption(true);
        try {
            await updateEmployeeRole(employee.id, selectedRole);
            logActivity({
                action: 'update',
                entityType: 'employee',
                entityId: employee.id,
                entityName: employee.name,
                metadata: { details: `Changed role from ${employee.role} to ${selectedRole}` }
            });
            toast({ title: 'Role Updated', description: `Role successfully updated to ${selectedRole}.` });
            onUpdateComplete();
        } catch (error: any) {
            toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUpdatingOption(false);
        }
    };

    const handlePromoteAdmin = async () => {
        setIsUpdatingOption(true);
        try {
            const newRole = isAdmin ? 'Field Agent' : 'Admin';
            await updateEmployeeRole(employee.id, newRole);
            setSelectedRole(newRole as Employee['role']);
            logActivity({
                action: 'update',
                entityType: 'employee',
                entityId: employee.id,
                entityName: employee.name,
                metadata: { details: isAdmin ? `Admin rights revoked by ${adminName}` : `Promoted to Admin by ${adminName}` }
            });
            toast({ title: 'Success', description: isAdmin ? 'Admin rights revoked.' : 'Promoted to Admin.' });
            setIsPromoteConfirmOpen(false);
            onUpdateComplete();
        } catch (error: any) {
            toast({ title: 'Action Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUpdatingOption(false);
        }
    };

    const handleResetPassword = async () => {
        setIsUpdatingOption(true);
        try {
            const newPassword = await resetEmployeePassword(employee.id);
            setTempPassword(newPassword);
            logActivity({
                action: 'update',
                entityType: 'employee',
                entityId: employee.id,
                entityName: employee.name,
                metadata: { details: `Password was reset by an administrator (${adminName}).` }
            });
            setIsResetPwConfirmOpen(false);
            setResetPwOpen(true);
        } catch (error: any) {
            toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUpdatingOption(false);
        }
    };

    const handleToggleStatus = async () => {
        setIsUpdatingOption(true);
        try {
            await setEmployeeStatus(employee.id, targetStatus);
            logActivity({
                action: 'update',
                entityType: 'employee',
                entityId: employee.id,
                entityName: employee.name,
                metadata: { details: `Status changed to ${targetStatus} by ${adminName}.` }
            });
            toast({ title: 'Status Updated', description: `Account is now ${targetStatus}.` });
            setIsStatusConfirmOpen(false);
            onUpdateComplete();
        } catch (error: any) {
            toast({ title: 'Action Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsUpdatingOption(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-indigo-200 dark:border-indigo-900">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900">
                    <CardTitle className="text-indigo-700 dark:text-indigo-400 flex items-center text-lg">
                        <Shield className="mr-2 h-5 w-5" />
                        Admin Management
                    </CardTitle>
                    <CardDescription>
                        Advanced administrative actions and role management.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* Role Management */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium leading-none">Job Role & Position</h4>
                        <p className="text-sm text-muted-foreground">Change the functional role of this employee within the organization.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Select value={selectedRole} onValueChange={(val: any) => setSelectedRole(val)}>
                                <SelectTrigger className="w-full sm:w-[240px]">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button 
                                variant="outline" 
                                onClick={handleRoleChange} 
                                disabled={selectedRole === employee.role || isUpdatingOption}
                            >
                                Update Role
                            </Button>
                        </div>
                    </div>

                    <div className="h-px bg-border my-4" />

                    {/* Authentication Actions */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium leading-none">Authentication & Access</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Button 
                                variant="outline" 
                                className="w-full justify-start" 
                                onClick={() => setIsResetPwConfirmOpen(true)}
                                disabled={isUpdatingOption}
                            >
                                <Key className="mr-2 h-4 w-4 text-emerald-600" />
                                Reset Password
                            </Button>

                            <Button 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => setIsPromoteConfirmOpen(true)}
                                disabled={isUpdatingOption}
                            >
                                {isAdmin ? (
                                    <>
                                        <Shield className="mr-2 h-4 w-4 text-amber-600" />
                                        Revoke Admin Rights
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="mr-2 h-4 w-4 text-indigo-600" />
                                        Promote to Admin
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center text-lg">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible or critical actions related to this employee.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-4">
                        <div>
                            <h4 className="text-sm font-medium">{isSuspended ? 'Reactivate Account' : 'Suspend Account'}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isSuspended 
                                    ? 'Restore login access and mark employee active.' 
                                    : 'Prevent this employee from logging in immediately.'}
                            </p>
                        </div>
                        <Button 
                            variant={isSuspended ? "outline" : "destructive"} 
                            className="whitespace-nowrap"
                            onClick={() => setIsStatusConfirmOpen(true)}
                            disabled={isUpdatingOption}
                        >
                            <Power className="mr-2 h-4 w-4" />
                            {isSuspended ? 'Reactivate Access' : 'Suspend Access'}
                        </Button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                        <div>
                            <h4 className="text-sm font-medium text-destructive">Delete Employee</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                Permanently remove all records for this employee.
                            </p>
                        </div>
                        <Button 
                            variant="destructive" 
                            className="whitespace-nowrap bg-destructive hover:bg-destructive/90"
                            onClick={() => {
                                // Provide a global way if they really want, usually parent handles delete
                                // Just a placeholder button logic, use the one from parent page.
                            }}
                            id="trigger-delete-employee"
                            disabled={isUpdatingOption}
                        >
                            Delete Employee
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ResetPasswordDialog 
                open={resetPwOpen} 
                onOpenChange={setResetPwOpen} 
                password={tempPassword} 
                employeeName={employee.name} 
            />

            <ConfirmDialog
                open={isResetPwConfirmOpen}
                onOpenChange={setIsResetPwConfirmOpen}
                title="Reset Employee Password"
                description={`Are you sure you want to reset the password for ${employee.name}? A new temporary password will be generated and their current sessions may be invalidated.`}
                onConfirm={handleResetPassword}
            />

            <ConfirmDialog
                open={isStatusConfirmOpen}
                onOpenChange={setIsStatusConfirmOpen}
                title={isSuspended ? "Reactivate Account" : "Suspend Account"}
                description={isSuspended 
                    ? `Are you sure you want to restore access for ${employee.name}? They will be able to log in again.` 
                    : `Are you sure you want to suspend ${employee.name}? Their current sessions will be invalidated and they won't be able to log in.`}
                onConfirm={handleToggleStatus}
            />

            <ConfirmDialog
                open={isPromoteConfirmOpen}
                onOpenChange={setIsPromoteConfirmOpen}
                title={isAdmin ? "Revoke Admin Rights" : "Promote to Admin"}
                description={isAdmin
                    ? `Are you sure you want to remove Admin privileges from ${employee.name}?`
                    : `Are you sure you want to grant Admin privileges to ${employee.name}? This gives them full access to all system settings and employee management.`}
                onConfirm={handlePromoteAdmin}
            />
        </div>
    );
}
