import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FarmerRequest, PaymentPlan, PaymentRecord, Farmer } from '@/lib/types';
import { format } from 'date-fns';
import { PrintableInvoice } from './printable-invoice';
import { PrintableReceipt } from './printable-receipt';
import { updateFarmerRequest } from '@/lib/db/services/farmer-requests';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Printer, Receipt, Calendar, CreditCard } from 'lucide-react';

interface RequestDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: FarmerRequest | null;
    farmer?: Farmer;
}

const PAYMENT_PLANS: PaymentPlan[] = ['Pay on spot', 'Monthly', '3 months', '6 months', '1 year'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function RequestDetailsDialog({ open, onOpenChange, request, farmer }: RequestDetailsDialogProps) {
    const { toast } = useToast();
    const invoiceRef = React.useRef<HTMLDivElement>(null);
    const receiptRef = React.useRef<HTMLDivElement>(null);

    const [isSaving, setIsSaving] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState<PaymentPlan | undefined>(request?.paymentPlan);

    // New Payment Form State
    const [showPaymentForm, setShowPaymentForm] = React.useState(false);
    const [amount, setAmount] = React.useState('');
    const [month, setMonth] = React.useState(MONTHS[new Date().getMonth()]);
    const [reference, setReference] = React.useState('');

    // Receipt Printing State
    const [printingPayment, setPrintingPayment] = React.useState<PaymentRecord | null>(null);

    React.useEffect(() => {
        if (open && request) {
            setSelectedPlan(request.paymentPlan);
            setShowPaymentForm(false);
            setAmount('');
            setReference('');
        }
    }, [open, request]);

    if (!request) return null;

    const totalPaid = request.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const balance = Math.max(0, request.grandTotal - totalPaid);

    const handleUpdatePlan = async () => {
        if (!selectedPlan || selectedPlan === request.paymentPlan) return;
        setIsSaving(true);
        try {
            await updateFarmerRequest(request.id, { paymentPlan: selectedPlan });
            toast({ title: 'Payment plan updated successfully.' });
        } catch (error: any) {
            toast({ title: 'Error updating payment plan', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddPayment = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast({ title: 'Please enter a valid amount', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const newPayment: PaymentRecord = {
                id: uuidv4(),
                amount: Number(amount),
                date: new Date().toISOString(),
                monthOfPayment: month,
                reference: reference || undefined
            };

            const updatedPayments = [...(request.payments || []), newPayment];

            // Auto update status if fully paid
            let newStatus = request.status;
            if (request.grandTotal - (totalPaid + newPayment.amount) <= 0) {
                newStatus = 'Approved'; // Or whatever denotes completion
            }

            await updateFarmerRequest(request.id, {
                payments: updatedPayments,
                status: newStatus
            });

            toast({ title: 'Payment added successfully' });
            setShowPaymentForm(false);
            setAmount('');
            setReference('');
        } catch (error: any) {
            toast({ title: 'Error adding payment', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrintInvoice = () => {
        if (invoiceRef.current) {
            // This is a simplified print trigger for browser. For robust styling support, libraries like react-to-print are often used.
            // Since we're sticking to native APIs and avoiding new heavy dependencies:
            const printContent = invoiceRef.current.innerHTML;
            const originalContent = document.body.innerHTML;

            document.body.innerHTML = printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); // Quick restore of React event listeners after destructive dom replacement
        }
    };

    const handlePrintReceipt = (payment: PaymentRecord) => {
        setPrintingPayment(payment);
        setTimeout(() => {
            if (receiptRef.current) {
                const printContent = receiptRef.current.innerHTML;
                const originalContent = document.body.innerHTML;

                document.body.innerHTML = printContent;
                window.print();
                document.body.innerHTML = originalContent;
                window.location.reload(); // Quick restore
            }
        }, 100);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row justify-between items-start">
                    <div>
                        <DialogTitle className="text-2xl font-bold">Request Details</DialogTitle>
                        <DialogDescription>
                            {format(new Date(request.requestDate || request.createdAt), 'dd MMMM yyyy')} • GH₵{request.grandTotal.toFixed(2)}
                        </DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print Invoice
                    </Button>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Items Requested */}
                    <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-3">Items Requested</h4>
                        <div className="space-y-2">
                            {request.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span>{item.quantity}x {item.productName} (@ GH₵{item.dynamicPrice})</span>
                                    <span className="font-medium">GH₵{item.total.toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-border flex justify-between font-bold">
                                <span>Grand Total</span>
                                <span>GH₵{request.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Plan & Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Payment Plan</Label>
                            <div className="flex gap-2">
                                <Select value={selectedPlan} onValueChange={(val) => setSelectedPlan(val as PaymentPlan)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_PLANS.map(plan => (
                                            <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedPlan !== request.paymentPlan && (
                                    <Button size="sm" onClick={handleUpdatePlan} disabled={isSaving}>Save</Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 p-3 bg-primary/10 rounded-lg text-center">
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Remaining Balance</div>
                            <div className="text-2xl font-bold text-primary">GH₵{balance.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Financial Ledger */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-muted-foreground" />
                                Payment Ledger
                            </h4>
                            {!showPaymentForm && balance > 0 && (
                                <Button size="sm" onClick={() => setShowPaymentForm(true)}>Record Payment</Button>
                            )}
                        </div>

                        {showPaymentForm && (
                            <div className="bg-card border rounded-lg p-4 mb-4 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h5 className="font-bold text-sm text-muted-foreground uppercase">New Payment</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount (GH₵)</Label>
                                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Month</Label>
                                        <Select value={month} onValueChange={setMonth}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map(m => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Reference Note (Optional)</Label>
                                        <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. Cash handed to agent" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                                    <Button onClick={handleAddPayment} disabled={isSaving || !amount}>Save Payment</Button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {!request.payments || request.payments.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                                    No payments recorded yet.
                                </div>
                            ) : (
                                request.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                                        <div>
                                            <div className="font-bold text-green-600">GH₵{payment.amount.toFixed(2)}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {format(new Date(payment.date), 'MMM dd, yyyy')} • {payment.monthOfPayment}
                                            </div>
                                            {payment.reference && <div className="text-xs mt-1 text-muted-foreground italic">"{payment.reference}"</div>}
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => handlePrintReceipt(payment)}>
                                            <Receipt className="w-4 h-4 mr-2" />
                                            Receipt
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Hidden printable components */}
                <div className="hidden">
                    <PrintableInvoice ref={invoiceRef} request={request} farmer={farmer} />
                    {printingPayment && <PrintableReceipt ref={receiptRef} request={request} payment={printingPayment} farmer={farmer} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
