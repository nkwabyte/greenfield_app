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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckCircle2,
    XCircle,
    Download,
    Loader2,
    Users,
    AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────
type CreationResult = {
    email: string;
    name: string;
    password: string;
    status: 'success' | 'error';
    error?: string;
};

type BulkAddEmployeesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: (count: number) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a plausible display name from an email address */
function nameFromEmail(email: string): string {
    const local = email.split('@')[0];
    // Replace dots / underscores / hyphens with spaces, then title-case
    return local
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generate a strong random password (12 chars, alphanumeric + special) */
function generatePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}

/** Trigger a CSV file download in the browser */
function downloadCSV(results: CreationResult[]) {
    const header = 'Name,Email,Password,Status';
    const rows = results.map((r) =>
        `"${r.name}","${r.email}","${r.status === 'success' ? r.password : ''}","${r.status}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BulkAddEmployeesDialog({
    open,
    onOpenChange,
    onComplete,
}: BulkAddEmployeesDialogProps) {
    const [emailInput, setEmailInput] = React.useState('');
    const [defaultRole, setDefaultRole] = React.useState<'Manager' | 'Field Agent' | 'Accountant' | 'Support'>('Field Agent');
    const [phase, setPhase] = React.useState<'input' | 'processing' | 'done'>('input');
    const [results, setResults] = React.useState<CreationResult[]>([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const parsedEmails = React.useMemo(() => {
        return emailInput
            .split(/[\n,;]+/)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
            // deduplicate
            .filter((e, i, arr) => arr.indexOf(e) === i);
    }, [emailInput]);

    const invalidEmails = React.useMemo(() => {
        return emailInput
            .split(/[\n,;]+/)
            .map((e) => e.trim())
            .filter((e) => e.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    }, [emailInput]);

    const handleStart = async () => {
        if (parsedEmails.length === 0) return;

        setPhase('processing');
        setResults([]);
        setCurrentIndex(0);

        const { addEmployee } = await import('@/lib/db/services/employees');
        const collected: CreationResult[] = [];

        for (let i = 0; i < parsedEmails.length; i++) {
            const email = parsedEmails[i];
            const name = nameFromEmail(email);
            const password = generatePassword();

            setCurrentIndex(i + 1);

            try {
                // Call the existing addEmployee service — we override the generated
                // password by passing our own through the form values shape.
                // addEmployee generates its own password internally, so we call
                // createEmployeeAuth directly to use our password.
                const { createEmployeeAuth } = await import('@/lib/supabase/admin-auth');
                const authUid = await createEmployeeAuth(email, password);

                // Save to Dexie
                const { db } = await import('@/lib/db/schema');
                const { syncService } = await import('@/lib/db/sync');
                const now = new Date().toISOString();
                await db.employees.add({
                    id: authUid,
                    name,
                    email,
                    role: defaultRole,
                    salary: 0,
                    startDate: now,
                    status: 'Active',
                    isVerified: true,
                    createdAt: now,
                    updatedAt: now,
                });
                await syncService.addToQueue('employee', 'create', authUid, { name, email, role: defaultRole, salary: 0 });

                collected.push({ email, name, password, status: 'success' });
            } catch (err: any) {
                const rawMsg: string = err?.message ?? 'Unknown error';
                const friendlyMsg = rawMsg.toLowerCase().includes('already registered') || rawMsg.toLowerCase().includes('already exists')
                    ? 'Already exists — skipped'
                    : rawMsg;
                collected.push({
                    email,
                    name,
                    password: '',
                    status: 'error',
                    error: friendlyMsg,
                });
            }

            setResults([...collected]);
        }

        setPhase('done');
        const successCount = collected.filter((r) => r.status === 'success').length;
        onComplete?.(successCount);
    };

    const handleClose = () => {
        if (phase === 'processing') return; // prevent close while running
        setEmailInput('');
        setPhase('input');
        setResults([]);
        setCurrentIndex(0);
        onOpenChange(false);
    };

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
    const progress = parsedEmails.length > 0 ? Math.round((currentIndex / parsedEmails.length) * 100) : 0;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto pb-8">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-primary/10 p-2">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Bulk Add Employees</DialogTitle>
                            <DialogDescription>
                                Paste employee emails — one per line. The system generates a name and password for each.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* ── INPUT PHASE ── */}
                {phase === 'input' && (
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="emails">Email Addresses</Label>
                            <Textarea
                                id="emails"
                                placeholder={`alice@greenfield.com\nbob@greenfield.com\ncharlie@greenfield.com`}
                                className="h-44 font-mono text-sm resize-none"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Separate with new lines, commas, or semicolons. Duplicates are removed automatically.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Default Role</Label>
                            <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as any)}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Field Agent">Field Agent</SelectItem>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Accountant">Accountant</SelectItem>
                                    <SelectItem value="Support">Support</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preview */}
                        {parsedEmails.length > 0 && (
                            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                                <span className="font-medium text-foreground">{parsedEmails.length}</span>
                                <span className="text-muted-foreground"> valid email{parsedEmails.length !== 1 ? 's' : ''} ready to be created</span>
                                {invalidEmails.length > 0 && (
                                    <div className="mt-1 flex items-center gap-1.5 text-amber-600 text-xs">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        {invalidEmails.length} invalid email{invalidEmails.length !== 1 ? 's' : ''} will be skipped
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── PROCESSING PHASE ── */}
                {phase === 'processing' && (
                    <div className="space-y-5 py-4">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                                Creating accounts… ({currentIndex} / {parsedEmails.length})
                            </span>
                        </div>
                        <Progress value={progress} className="h-2" />

                        <ScrollArea className="h-52 rounded-md border p-2">
                            <div className="space-y-1.5">
                                {results.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm px-1">
                                        {r.status === 'success'
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            : <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                        }
                                        <span className="flex-1 truncate font-mono text-xs">{r.email}</span>
                                        {r.status === 'error' && (
                                            <span className="text-destructive text-xs truncate max-w-[200px]">{r.error}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* ── DONE PHASE ── */}
                {phase === 'done' && (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span><span className="font-semibold">{successCount}</span> created</span>
                            </div>
                            {errorCount > 0 && (
                                <div className="flex items-center gap-2 text-sm">
                                    <XCircle className="h-4 w-4 text-destructive" />
                                    <span><span className="font-semibold">{errorCount}</span> failed</span>
                                </div>
                            )}
                        </div>

                        <ScrollArea className="h-60 rounded-md border">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-muted border-b">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Name</th>
                                        <th className="px-3 py-2 text-left font-medium">Email</th>
                                        <th className="px-3 py-2 text-left font-medium">Password</th>
                                        <th className="px-3 py-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {results.map((r, i) => (
                                        <tr key={i} className={r.status === 'error' ? 'bg-destructive/5' : ''}>
                                            <td className="px-3 py-2 font-medium truncate max-w-[120px]">{r.name}</td>
                                            <td className="px-3 py-2 font-mono truncate max-w-[160px]">{r.email}</td>
                                            <td className="px-3 py-2 font-mono text-emerald-600 dark:text-emerald-400">
                                                {r.status === 'success' ? r.password : '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {r.status === 'success'
                                                    ? <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-xs">Created</Badge>
                                                    : <Badge variant="destructive" className="text-xs">{r.error?.slice(0, 30)}</Badge>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollArea>

                        <p className="text-xs text-muted-foreground">
                            Download the CSV and share credentials with each employee securely. Passwords will not be shown again.
                        </p>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    {phase === 'input' && (
                        <>
                            <Button variant="outline" onClick={handleClose}>Cancel</Button>
                            <Button
                                onClick={handleStart}
                                disabled={parsedEmails.length === 0}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Create {parsedEmails.length > 0 ? parsedEmails.length : ''} Account{parsedEmails.length !== 1 ? 's' : ''}
                            </Button>
                        </>
                    )}

                    {phase === 'processing' && (
                        <Button disabled variant="outline">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing…
                        </Button>
                    )}

                    {phase === 'done' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => downloadCSV(results.filter(r => r.status === 'success'))}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download Credentials CSV
                            </Button>
                            <Button onClick={handleClose}>Done</Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
