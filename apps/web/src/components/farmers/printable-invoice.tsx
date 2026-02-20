import * as React from 'react';
import { Farmer, FarmerRequest, FarmerGroup } from '@/lib/types';
import { format } from 'date-fns';

interface PrintableInvoiceProps {
    request: FarmerRequest;
    farmer?: Farmer;
    group?: FarmerGroup;
}

export const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
    ({ request, farmer, group }, ref) => {
        const totalPaid = request.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const balance = Math.max(0, request.grandTotal - totalPaid);

        return (
            <div ref={ref} className="hidden print:block p-8 bg-white text-black min-h-screen font-sans">
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">GREENFIELD</h1>
                        <p className="text-sm text-gray-500">Agro Inputs Distribution</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">INVOICE</h2>
                        <p className="text-sm"><span className="font-semibold">Invoice No:</span> INV-{request.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm"><span className="font-semibold">Date:</span> {format(new Date(request.requestDate || request.createdAt), 'dd MMM yyyy')}</p>
                        <p className="text-sm"><span className="font-semibold">Payment Plan:</span> {request.paymentPlan || 'Not specified'}</p>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-bold text-lg">{farmer?.name || 'Unknown Farmer'}</p>
                            {farmer?.contact && <p className="text-gray-600">Phone: {farmer.contact}</p>}
                        </div>
                        <div className="text-right">
                            {group?.name && <p className="text-gray-600"><span className="font-medium">Society/Group:</span> {group.name}</p>}
                            {farmer?.district && <p className="text-gray-600"><span className="font-medium">District:</span> {farmer.district}</p>}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="py-3 px-4 text-left font-semibold text-gray-700">Description</th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700">Quantity</th>
                            <th className="py-3 px-4 text-right font-semibold text-gray-700">Unit Price (GH₵)</th>
                            <th className="py-3 px-4 text-right font-semibold text-gray-700">Amount (GH₵)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="py-3 px-4 text-gray-800">{item.productName}</td>
                                <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{item.dynamicPrice.toFixed(2)}</td>
                                <td className="py-3 px-4 text-right font-medium text-gray-800">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-600 font-medium">Subtotal</span>
                            <span className="font-medium">GH₵{request.grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-4 border-b pb-2">
                            <span className="text-gray-600 font-medium">Total Paid</span>
                            <span className="text-green-600 font-medium">- GH₵{totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-lg font-bold text-gray-900">Amount Due</span>
                            <span className="text-lg font-bold text-gray-900">GH₵{balance.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t text-center text-sm text-gray-500">
                    <p>Thank you for your business!</p>
                    <p>Please make all payments according to your signed agreement under the {request.paymentPlan || 'assigned'} plan.</p>
                </div>
            </div>
        );
    }
);
PrintableInvoice.displayName = 'PrintableInvoice';
