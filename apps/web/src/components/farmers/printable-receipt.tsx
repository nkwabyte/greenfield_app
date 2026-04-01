import * as React from 'react';
import { Farmer, FarmerRequest, FarmerGroup, PaymentRecord } from '@/lib/types';
import { format } from 'date-fns';

interface PrintableReceiptProps {
    request: FarmerRequest;
    payment: PaymentRecord;
    farmer?: Farmer;
    group?: FarmerGroup;
}

export const PrintableReceipt = React.forwardRef<HTMLDivElement, PrintableReceiptProps>(
    ({ request, payment, farmer, group }, ref) => {
        const totalPaid = request.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const balance = Math.max(0, request.grandTotal - totalPaid);

        return (
            <div ref={ref} className="hidden print:flex flex-col p-8 bg-white text-black min-h-screen font-sans border-2 border-gray-200">
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-gray-300 pb-6 mb-8 mt-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Greenfield Logo" className="h-24 w-auto object-contain" />
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-1">Receipt No</p>
                        <p className="text-xl font-bold text-gray-900">RC-{payment.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-500 mt-2">{format(new Date(payment.date), 'dd MMMM yyyy')}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Received From</h3>
                        <p className="font-bold text-xl text-gray-900 mb-1">{farmer?.name || 'Unknown Farmer'}</p>
                        {farmer?.contact && <p className="text-gray-600 mb-1">{farmer.contact}</p>}
                        {group?.name && <p className="text-gray-600">{group.name} Society</p>}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Details</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Month</span>
                                <span className="font-medium text-gray-900">{payment.monthOfPayment}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Plan</span>
                                <span className="font-medium text-gray-900">{request.paymentPlan || 'N/A'}</span>
                            </div>
                            {payment.reference && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Reference</span>
                                    <span className="font-medium text-gray-900">{payment.reference}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Amount Highlight */}
                <div className="flex justify-center mb-12">
                    <div className="text-center py-8 px-16 border-4 border-gray-100 rounded-3xl bg-gray-50 bg-opacity-50">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Amount Received</p>
                        <h2 className="text-5xl font-black text-green-600">GH₵{payment.amount.toFixed(2)}</h2>
                    </div>
                </div>

                {/* Account Summary */}
                <div className="mt-8 border-t border-gray-200 pt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary For Request INV-{request.id.slice(0, 8).toUpperCase()}</h3>

                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Invoice Amount</span>
                        <span className="font-medium text-gray-900">GH₵{request.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Payments to Date</span>
                        <span className="font-medium text-gray-900">GH₵{totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 mt-2 bg-gray-50 px-4 rounded-lg">
                        <span className="font-bold text-gray-900">Remaining Balance</span>
                        <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            GH₵{balance.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Footer Signature */}
                <div className="mt-auto flex justify-between items-end pt-16">
                    <div className="text-center w-64">
                        <div className="border-b border-gray-400 mb-2 h-8"></div>
                        <p className="text-sm text-gray-500">Authorized Signature</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400">Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
                        <p className="text-xs text-gray-400 font-medium mt-1">Thank you for your business!</p>
                    </div>
                </div>
            </div>
        );
    }
);
PrintableReceipt.displayName = 'PrintableReceipt';
