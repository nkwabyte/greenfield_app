'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { ArrowLeft, Edit, Mail, Calendar, DollarSign, Briefcase, User } from 'lucide-react';
import { AddEditEmployeeDialog, type EmployeeFormValues } from '@/components/employees/add-edit-employee-dialog';
import { updateEmployee as updateEmployeeService } from '@/lib/db/services/employees';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { toast } = useToast();
    const { id } = React.use(params);
    const employee = useEmployee(id);
    const [isEditOpen, setIsEditOpen] = React.useState(false);

    if (employee === undefined) {
        return (
            <AppShell>
                <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </AppShell>
        );
    }

    if (employee === null) {
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <h2 className="text-2xl font-bold">Employee not found</h2>
                    <Button variant="link" onClick={() => router.back()}>Go back</Button>
                </div>
            </AppShell>
        );
    }

    const handleSave = async (data: EmployeeFormValues) => {
        try {
            await updateEmployeeService(employee.id, data);
            toast({ title: "Updated", description: "Employee details updated successfully." });
            setIsEditOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update employee.", variant: "destructive" });
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    return (
        <AppShell>
            <div className="space-y-6 pb-10">
                <Button variant="ghost" className="-ml-4 w-fit" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
                        <div className="flex items-center text-muted-foreground mt-1">
                            <Mail className="mr-2 h-4 w-4" />
                            {employee.email}
                        </div>
                    </div>
                    <Button onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Employee Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Status</span>
                                <div>
                                    <Badge variant={employee.status === 'Active' ? 'default' : employee.status === 'On Leave' ? 'secondary' : 'destructive'}>
                                        {employee.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Role</span>
                                <div className="font-medium flex items-center">
                                    <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {employee.role}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Salary</span>
                                <div className="font-medium flex items-center">
                                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {currencyFormatter.format(employee.salary)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Start Date</span>
                                <div className="font-medium flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {new Date(employee.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                                <div className="font-medium">
                                    {formatDistanceToNow(new Date(employee.updatedAt), { addSuffix: true })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats / Performance Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                                <User className="h-12 w-12 mb-4 opacity-20" />
                                <p>Performance metrics coming soon...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <AddEditEmployeeDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    employee={employee}
                    onSave={handleSave}
                />
            </div>
        </AppShell>
    );
}
