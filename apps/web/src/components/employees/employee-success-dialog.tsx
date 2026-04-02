'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type EmployeeSuccessDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeData: {
        name: string;
        email: string;
        password: string;
    } | null;
};

export function EmployeeSuccessDialog({ open, onOpenChange, employeeData }: EmployeeSuccessDialogProps) {
    const [copiedPassword, setCopiedPassword] = useState(false);
    const [copiedAll, setCopiedAll] = useState(false);

    if (!employeeData) return null;

    const copyPassword = () => {
        navigator.clipboard.writeText(employeeData.password);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
    };

    const copyAll = () => {
        const text = `Employee Account Created!\n\nEmail: ${employeeData.email}\nPassword: ${employeeData.password}`;
        navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-col items-center">
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-3 mb-2">
                        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <DialogTitle className="text-xl">Employee Account Created!</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        The account for <span className="font-semibold text-foreground">{employeeData.name}</span> has been successfully established.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm font-medium">
                            {employeeData.email}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Generated Password</label>
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 font-mono text-lg">
                            <span className="flex-1 tracking-wider text-emerald-600 dark:text-emerald-400">{employeeData.password}</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyPassword}
                                className="h-8 w-8 p-0"
                            >
                                {copiedPassword ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground px-4">
                        Please share these credentials with the employee securely. This password will not be shown again.
                    </p>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2">
                    <Button onClick={copyAll} variant="outline" className="w-full">
                        {copiedAll ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied Details
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy All Credentials
                            </>
                        )}
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="w-full">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
