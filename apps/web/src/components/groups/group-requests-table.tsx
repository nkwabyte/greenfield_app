'use client';

import * as React from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { updateFarmerRequest } from '@/lib/db/services/farmer-requests';
import { useToast } from '@/hooks/use-toast';
import { useFarmerNameMap } from '@/hooks/useData';
import { EditableNumberCell } from '@/components/ui/editable-cell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    TableFooter,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, Search, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import type { FarmerRequest, PaymentRecord } from '@/lib/types';

const currencyFormatter = new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
});

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

interface FlattenedRow {
    requestId: string;
    farmerId: string;
    farmerName: string;
    itemIndex: number;
    productName: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    // Request-level
    grandTotal: number;
    totalPaid: number;
    outstanding: number;
    status: string;
    payments: PaymentRecord[];
    isFirstItemOfRequest: boolean;
    requestItemCount: number;
    request: FarmerRequest;
}

interface GroupRequestsTableProps {
    groupId: string;
}

export function GroupRequestsTable({ groupId }: GroupRequestsTableProps) {
    const { toast } = useToast();
    const nameMap = useFarmerNameMap();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedRequests, setExpandedRequests] = React.useState<Set<string>>(new Set());
    const [paymentDialogRequest, setPaymentDialogRequest] = React.useState<FarmerRequest | null>(null);

    const requests = useLiveQuery(
        () => db.farmerRequests.where('groupId').equals(groupId).toArray(),
        [groupId]
    );

    const flattenedRows = React.useMemo(() => {
        if (!requests || !nameMap) return [];

        let rows: FlattenedRow[] = [];
        for (const req of requests) {
            if (req.deleted) continue;
            const farmerName = nameMap.get(req.farmerId) || 'Unknown Farmer';
            const totalPaid = req.payments?.reduce((s, p) => s + p.amount, 0) || 0;
            const outstanding = Math.max(0, req.grandTotal - totalPaid);

            req.items.forEach((item, idx) => {
                rows.push({
                    requestId: req.id,
                    farmerId: req.farmerId,
                    farmerName,
                    itemIndex: idx,
                    productName: item.productName,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.dynamicPrice,
                    itemTotal: item.total,
                    grandTotal: req.grandTotal,
                    totalPaid,
                    outstanding,
                    status: req.status,
                    payments: req.payments || [],
                    isFirstItemOfRequest: idx === 0,
                    requestItemCount: req.items.length,
                    request: req,
                });
            });
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter(
                (r) =>
                    r.farmerName.toLowerCase().includes(q) ||
                    r.productName.toLowerCase().includes(q)
            );
        }

        // Sort by farmer name then by request
        rows.sort((a, b) => {
            const nameCmp = a.farmerName.localeCompare(b.farmerName);
            if (nameCmp !== 0) return nameCmp;
            if (a.requestId !== b.requestId) return a.requestId.localeCompare(b.requestId);
            return a.itemIndex - b.itemIndex;
        });

        return rows;
    }, [requests, nameMap, searchQuery]);

    // Summary totals
    const totals = React.useMemo(() => {
        if (!requests) return { owed: 0, paid: 0, outstanding: 0 };
        const seen = new Set<string>();
        let owed = 0;
        let paid = 0;

        for (const req of requests) {
            if (req.deleted || seen.has(req.id)) continue;
            seen.add(req.id);
            owed += req.grandTotal;
            paid += req.payments?.reduce((s, p) => s + p.amount, 0) || 0;
        }

        return { owed, paid, outstanding: Math.max(0, owed - paid) };
    }, [requests]);

    const toggleExpanded = (requestId: string) => {
        setExpandedRequests((prev) => {
            const next = new Set(prev);
            if (next.has(requestId)) {
                next.delete(requestId);
            } else {
                next.add(requestId);
            }
            return next;
        });
    };

    // ─── Inline edit handlers ──────────────────────────────────────────
    const handleUpdateQuantity = async (row: FlattenedRow, newQuantity: number) => {
        try {
            const req = row.request;
            const updatedItems = [...req.items];
            updatedItems[row.itemIndex] = {
                ...updatedItems[row.itemIndex],
                quantity: newQuantity,
                total: newQuantity * updatedItems[row.itemIndex].dynamicPrice,
            };
            const newGrandTotal = updatedItems.reduce((s, i) => s + i.total, 0);

            await updateFarmerRequest(req.id, { items: updatedItems, grandTotal: newGrandTotal });
            toast({ title: 'Quantity updated' });
        } catch (e: any) {
            toast({ title: 'Error updating quantity', description: e.message, variant: 'destructive' });
        }
    };

    const handleUpdatePrice = async (row: FlattenedRow, newPrice: number) => {
        try {
            const req = row.request;
            const updatedItems = [...req.items];
            updatedItems[row.itemIndex] = {
                ...updatedItems[row.itemIndex],
                dynamicPrice: newPrice,
                total: updatedItems[row.itemIndex].quantity * newPrice,
            };
            const newGrandTotal = updatedItems.reduce((s, i) => s + i.total, 0);

            await updateFarmerRequest(req.id, { items: updatedItems, grandTotal: newGrandTotal });
            toast({ title: 'Price updated' });
        } catch (e: any) {
            toast({ title: 'Error updating price', description: e.message, variant: 'destructive' });
        }
    };

    // Group rows by requestId for rendering
    const groupedRows = React.useMemo(() => {
        const map = new Map<string, FlattenedRow[]>();
        for (const row of flattenedRows) {
            const existing = map.get(row.requestId) || [];
            existing.push(row);
            map.set(row.requestId, existing);
        }
        return map;
    }, [flattenedRows]);

    if (requests === undefined || nameMap === undefined) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                No requests found for this group.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by farmer or product..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Farmer</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Item Total</TableHead>
                            <TableHead className="text-right">Request Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from(groupedRows.entries()).map(([requestId, items]) => {
                            const first = items[0];
                            const isExpanded = expandedRequests.has(requestId);
                            const hasMultipleItems = items.length > 1;

                            return (
                                <React.Fragment key={requestId}>
                                    {/* Primary row (first item) */}
                                    <TableRow className="group hover:bg-muted/50">
                                        <TableCell className="px-2">
                                            {hasMultipleItems && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => toggleExpanded(requestId)}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{first.farmerName}</TableCell>
                                        <TableCell>
                                            {first.productName}
                                            {hasMultipleItems && !isExpanded && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    (+{items.length - 1} more)
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditableNumberCell
                                                value={first.quantity}
                                                onSave={(v) => handleUpdateQuantity(first, v)}
                                                min={1}
                                                step={1}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EditableNumberCell
                                                value={first.unitPrice}
                                                onSave={(v) => handleUpdatePrice(first, v)}
                                                min={0}
                                                step={0.01}
                                                formatDisplay={(v) => currencyFormatter.format(v)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {currencyFormatter.format(first.itemTotal)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {currencyFormatter.format(first.grandTotal)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-emerald-600 dark:text-emerald-400">
                                            {currencyFormatter.format(first.totalPaid)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium text-orange-600 dark:text-orange-400">
                                            {currencyFormatter.format(first.outstanding)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={first.status} />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                title="Add Payment"
                                                onClick={() => setPaymentDialogRequest(first.request)}
                                            >
                                                <Receipt className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded rows (additional items) */}
                                    {isExpanded &&
                                        items.slice(1).map((row) => (
                                            <TableRow key={`${requestId}-${row.itemIndex}`} className="bg-muted/30">
                                                <TableCell />
                                                <TableCell />
                                                <TableCell className="text-sm">{row.productName}</TableCell>
                                                <TableCell className="text-right">
                                                    <EditableNumberCell
                                                        value={row.quantity}
                                                        onSave={(v) => handleUpdateQuantity(row, v)}
                                                        min={1}
                                                        step={1}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <EditableNumberCell
                                                        value={row.unitPrice}
                                                        onSave={(v) => handleUpdatePrice(row, v)}
                                                        min={0}
                                                        step={0.01}
                                                        formatDisplay={(v) => currencyFormatter.format(v)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {currencyFormatter.format(row.itemTotal)}
                                                </TableCell>
                                                <TableCell colSpan={5} />
                                            </TableRow>
                                        ))}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="font-semibold">
                            <TableCell colSpan={6} className="text-right">
                                Group Totals
                            </TableCell>
                            <TableCell className="text-right">
                                {currencyFormatter.format(totals.owed)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                                {currencyFormatter.format(totals.paid)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 dark:text-orange-400">
                                {currencyFormatter.format(totals.outstanding)}
                            </TableCell>
                            <TableCell colSpan={2} />
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Payment Dialog */}
            <AddPaymentDialog
                request={paymentDialogRequest}
                onClose={() => setPaymentDialogRequest(null)}
            />
        </div>
    );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const variant =
        status === 'Delivered'
            ? 'default'
            : status === 'Approved'
              ? 'secondary'
              : status === 'Rejected'
                ? 'destructive'
                : 'outline';

    return <Badge variant={variant} className="text-xs">{status}</Badge>;
}

// ─── Add Payment Dialog ────────────────────────────────────────────────────────
function AddPaymentDialog({
    request,
    onClose,
}: {
    request: FarmerRequest | null;
    onClose: () => void;
}) {
    const { toast } = useToast();
    const [amount, setAmount] = React.useState('');
    const [month, setMonth] = React.useState(
        MONTHS[new Date().getMonth()] + ' ' + new Date().getFullYear()
    );
    const [reference, setReference] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (request) {
            setAmount('');
            setReference('');
            setMonth(MONTHS[new Date().getMonth()] + ' ' + new Date().getFullYear());
        }
    }, [request]);

    if (!request) return null;

    const totalPaid = request.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const balance = Math.max(0, request.grandTotal - totalPaid);

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast({ title: 'Enter a valid amount', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const newPayment: PaymentRecord = {
                id: uuidv4(),
                amount: parsedAmount,
                date: new Date().toISOString(),
                monthOfPayment: month,
                reference: reference || undefined,
            };

            const updatedPayments = [...(request.payments || []), newPayment];

            await updateFarmerRequest(request.id, {
                payments: updatedPayments,
            });

            toast({ title: 'Payment recorded successfully' });
            onClose();
        } catch (e: any) {
            toast({ title: 'Error recording payment', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Payment</DialogTitle>
                    <DialogDescription>
                        Balance: {currencyFormatter.format(balance)} of {currencyFormatter.format(request.grandTotal)}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Amount (GHS)</label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Month of Payment</label>
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((m) => {
                                    const currentYear = new Date().getFullYear();
                                    return [currentYear - 1, currentYear, currentYear + 1].map((y) => (
                                        <SelectItem key={`${m} ${y}`} value={`${m} ${y}`}>
                                            {m} {y}
                                        </SelectItem>
                                    ));
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium">Reference (optional)</label>
                        <Input
                            type="text"
                            placeholder="e.g. receipt number"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </div>

                    {/* Existing payments summary */}
                    {request.payments && request.payments.length > 0 && (
                        <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-2">Previous Payments</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {request.payments.map((p) => (
                                    <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                                        <span>{p.monthOfPayment}</span>
                                        <span>{currencyFormatter.format(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Record Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
