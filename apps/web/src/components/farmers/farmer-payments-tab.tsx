'use client';

import * as React from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleDollarSign, Calendar, RotateCcw, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { updateFarmerRequest } from '@/lib/db/services/farmer-requests';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { format } from 'date-fns';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface FarmerPaymentsTabProps {
    farmerId: string;
}

interface SeasonBreakdown {
    year: string;
    totalOwed: number;
    totalPaid: number;
    outstanding: number;
    monthlyPayments: number[];
    expectedMonthlyAmount: number;
}

export function FarmerPaymentsTab({ farmerId }: FarmerPaymentsTabProps) {
    const requests = useLiveQuery(
        () => db.farmerRequests.where('farmerId').equals(farmerId).toArray(),
        [farmerId]
    );

    const { toast } = useToast();
    const [paymentToReverse, setPaymentToReverse] = React.useState<{
        requestId: string;
        paymentId: string;
        amount: number;
        month: string;
    } | null>(null);
    const [isReversingPayment, setIsReversingPayment] = React.useState(false);

    const currentYear = new Date().getFullYear().toString();
    const now = new Date();

    // ── Accurate financials across ALL seasons ──
    const financials = useMemo(() => {
        if (!requests || requests.length === 0) return { totalAmount: 0, totalPaid: 0, outstanding: 0 };
        const activeRequests = requests.filter(r => !r.deleted);
        const totalAmount = activeRequests.reduce((acc, req) => {
            const safeTotal = req.grandTotal > 0 ? req.grandTotal : req.items.reduce((s, item) => s + item.total, 0);
            return acc + safeTotal;
        }, 0);
        const totalPaid = activeRequests.reduce(
            (acc, req) => acc + (req.payments?.reduce((sum, p) => sum + p.amount, 0) || 0),
            0
        );
        return { totalAmount, totalPaid, outstanding: Math.max(0, totalAmount - totalPaid) };
    }, [requests]);

    // ── Per-season breakdowns ──
    // Show current season always; show past seasons only while they still have outstanding balance.
    const seasonBreakdowns = useMemo((): SeasonBreakdown[] => {
        if (!requests || requests.length === 0) return [];

        // Collect all distinct season years
        const allYears = Array.from(
            new Set(requests.filter(r => !r.deleted && r.seasonYear).map(r => r.seasonYear!))
        ).sort((a, b) => b.localeCompare(a)); // newest first

        return allYears
            .map((year): SeasonBreakdown => {
                const seasonRequests = requests.filter(r => r.seasonYear === year && !r.deleted);
                const totalOwed = seasonRequests.reduce((sum, req) => {
                    const safeTotal = req.grandTotal > 0 ? req.grandTotal : req.items.reduce((s, i) => s + i.total, 0);
                    return sum + safeTotal;
                }, 0);

                let totalPaid = 0;
                const monthlyPayments = new Array(12).fill(0);

                seasonRequests.forEach(req => {
                    (req.payments || []).forEach(payment => {
                        totalPaid += payment.amount;
                        const pd = new Date(payment.date);
                        if (pd.getFullYear().toString() === year) {
                            monthlyPayments[pd.getMonth()] += payment.amount;
                        }
                    });
                });

                return {
                    year,
                    totalOwed,
                    totalPaid,
                    outstanding: Math.max(0, totalOwed - totalPaid),
                    monthlyPayments,
                    expectedMonthlyAmount: totalOwed > 0 ? totalOwed / 12 : 0,
                };
            })
            // Keep current season always; only keep past seasons if there's still an outstanding balance
            .filter(s => s.year === currentYear || s.outstanding > 0);
    }, [requests, currentYear]);

    // ── Flatten all payment records, sorted newest first ──
    const allPaymentRecords = useMemo(() => {
        if (!requests) return [];
        const records: {
            requestId: string;
            seasonYear: string;
            paymentId: string;
            amount: number;
            date: string;
            month: string;
            reference?: string;
        }[] = [];
        requests.filter(r => !r.deleted).forEach(req => {
            (req.payments || []).forEach(p => {
                records.push({
                    requestId: req.id,
                    seasonYear: req.seasonYear || '—',
                    paymentId: p.id,
                    amount: p.amount,
                    date: p.date,
                    month: p.monthOfPayment,
                    reference: p.reference,
                });
            });
        });
        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [requests]);

    const handleReversePayment = async () => {
        if (!paymentToReverse || !requests) return;
        setIsReversingPayment(true);
        try {
            const req = requests.find(r => r.id === paymentToReverse.requestId);
            if (!req) throw new Error('Request not found');
            const updatedPayments = (req.payments || []).filter(p => p.id !== paymentToReverse.paymentId);
            await updateFarmerRequest(req.id, { payments: updatedPayments });
            toast({
                title: 'Payment reversed',
                description: `GH₵${paymentToReverse.amount.toFixed(2)} payment for ${paymentToReverse.month} has been reversed.`,
            });
        } catch (error: any) {
            toast({ title: 'Error reversing payment', description: error.message, variant: 'destructive' });
        } finally {
            setIsReversingPayment(false);
            setPaymentToReverse(null);
        }
    };

    if (!requests) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-64 bg-muted rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Financial summary KPI cards (all seasons) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Request Value</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">GH₵{financials.totalAmount.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all seasons</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">GH₵{financials.totalPaid.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{allPaymentRecords.length} payment{allPaymentRecords.length !== 1 ? 's' : ''} recorded</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">GH₵{financials.outstanding.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {financials.totalAmount > 0
                                ? `${Math.round((financials.totalPaid / financials.totalAmount) * 100)}% settled`
                                : 'No requests yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Per-season monthly breakdown tables ── */}
            {seasonBreakdowns.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                    No season data yet. Request products to see a payment breakdown.
                </div>
            )}

            {seasonBreakdowns.map(season => {
                const isCurrentSeason = season.year === currentYear;
                const isSettled = season.outstanding <= 0;

                return (
                    <Card key={season.year} className={`overflow-hidden shadow-sm ${isCurrentSeason ? 'border-orange-500/20' : 'border-amber-500/30'}`}>
                        <CardHeader className={`pb-4 border-b ${isCurrentSeason ? 'bg-orange-500/5' : 'bg-amber-500/5'}`}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className={`h-5 w-5 ${isCurrentSeason ? 'text-orange-500' : 'text-amber-600'}`} />
                                    {season.year} Season — Monthly Payment Breakdown
                                    {!isCurrentSeason && (
                                        <Badge variant="destructive" className="ml-2 text-xs">Outstanding</Badge>
                                    )}
                                    {isSettled && (
                                        <Badge className="ml-2 text-xs bg-emerald-500 hover:bg-emerald-600">Settled ✓</Badge>
                                    )}
                                </CardTitle>
                            </div>
                            <div className="flex flex-wrap gap-6 text-sm mt-1">
                                <span className="text-muted-foreground">Total Owed: <strong className="text-foreground">GH₵{season.totalOwed.toFixed(2)}</strong></span>
                                <span className="text-emerald-600">Paid: <strong>GH₵{season.totalPaid.toFixed(2)}</strong></span>
                                <span className={season.outstanding > 0 ? 'text-orange-500' : 'text-emerald-600'}>
                                    Balance: <strong>GH₵{season.outstanding.toFixed(2)}</strong>
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse min-w-[900px]">
                                    <thead>
                                        <tr className="bg-muted/40 border-b">
                                            <th className="py-2 px-3 text-left font-semibold text-muted-foreground border-r w-24 sticky left-0 bg-muted/40">Field</th>
                                            {MONTHS.map((m, i) => {
                                                const isCur = isCurrentSeason && now.getMonth() === i;
                                                return (
                                                    <th key={m} className={`py-2 px-2 text-center font-semibold border-r last:border-r-0 ${isCur ? 'bg-orange-500/10 text-orange-600' : 'text-muted-foreground'}`}>
                                                        {m}
                                                        {isCur && <span className="block mx-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                                                    </th>
                                                );
                                            })}
                                            <th className="py-2 px-3 text-center font-semibold text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Paid row */}
                                        <tr className="border-b hover:bg-muted/10">
                                            <td className="py-2 px-3 font-medium text-muted-foreground border-r sticky left-0 bg-background">Paid (GH₵)</td>
                                            {MONTHS.map((m, i) => {
                                                const paid = season.monthlyPayments[i];
                                                const expected = season.expectedMonthlyAmount;
                                                const isPast = isCurrentSeason ? i < now.getMonth() : true;
                                                let cellCls = 'text-muted-foreground';
                                                if (paid >= expected * 0.95) cellCls = 'text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/20';
                                                else if (paid > 0) cellCls = 'text-orange-600 font-semibold bg-orange-50 dark:bg-orange-950/20';
                                                else if (isPast && expected > 0) cellCls = 'text-destructive bg-red-50 dark:bg-red-950/20';
                                                return (
                                                    <td key={m} className={`py-2 px-2 text-center border-r last:border-r-0 ${cellCls}`}>
                                                        {paid > 0 ? paid.toFixed(2) : '—'}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2 px-3 text-center font-bold text-emerald-600">{season.totalPaid.toFixed(2)}</td>
                                        </tr>
                                        {/* Balance row */}
                                        <tr className="hover:bg-muted/10">
                                            <td className="py-2 px-3 font-medium text-muted-foreground border-r sticky left-0 bg-background">Balance (GH₵)</td>
                                            {MONTHS.map((m, i) => {
                                                const paid = season.monthlyPayments[i];
                                                const expected = season.expectedMonthlyAmount;
                                                const balance = Math.max(0, expected - paid);
                                                const isClear = expected > 0 && balance < expected * 0.05;
                                                return (
                                                    <td key={m} className={`py-2 px-2 text-center border-r last:border-r-0 ${isClear ? 'text-emerald-600' : balance > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                                        {isClear ? '✓' : balance > 0 ? balance.toFixed(2) : '—'}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-2 px-3 text-center font-bold text-orange-500">{season.outstanding.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-4 px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" /> Cleared</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300 inline-block" /> Partial</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" /> Missed</span>
                                {isCurrentSeason && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/10 border border-orange-400 inline-block" /> Current Month</span>}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {/* ── All Payment Records ── */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Receipt className="h-5 w-5 text-emerald-600" />
                        All Payment Records
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                        {allPaymentRecords.length} record{allPaymentRecords.length !== 1 ? 's' : ''}
                    </span>
                </CardHeader>
                <CardContent className="p-0">
                    {allPaymentRecords.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-sm">
                            No payments recorded yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">Date</th>
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">Month</th>
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">Season</th>
                                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">Amount (GH₵)</th>
                                        <th className="py-3 px-4 text-left font-medium text-muted-foreground">Reference</th>
                                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPaymentRecords.map((record) => (
                                        <tr key={record.paymentId} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                                {format(new Date(record.date), 'dd MMM yyyy')}
                                            </td>
                                            <td className="py-3 px-4 font-medium">{record.month}</td>
                                            <td className="py-3 px-4">
                                                <Badge variant="outline" className="text-xs">{record.seasonYear}</Badge>
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                                GH₵{record.amount.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground italic text-xs">
                                                {record.reference || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                                    onClick={() => setPaymentToReverse({
                                                        requestId: record.requestId,
                                                        paymentId: record.paymentId,
                                                        amount: record.amount,
                                                        month: record.month,
                                                    })}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                                    Reverse
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!paymentToReverse}
                onOpenChange={(open) => !open && setPaymentToReverse(null)}
                title="Reverse Payment"
                description={`Are you sure you want to reverse this GH₵${paymentToReverse?.amount.toFixed(2)} payment for ${paymentToReverse?.month}? This will remove the payment record and adjust the farmer's balance.`}
                confirmText={isReversingPayment ? 'Reversing...' : 'Yes, Reverse It'}
                onConfirm={handleReversePayment}
            />
        </div>
    );
}
