'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { FarmerGroup, Farmer, FarmerRequest } from '@/lib/types';
import { useProductOptions } from '@/hooks/useData';
import { addFarmerRequest } from '@/lib/db/services/farmer-requests';

const requestItemSchema = z.object({
    productId: z.string().min(1, { message: 'Product is required' }),
    productName: z.string(),
    quantity: z.number().positive(),
    dynamicPrice: z.number().positive(),
    total: z.number(),
});

const distributeSchema = z.object({
    seasonYear: z.string().min(4),
    items: z.array(requestItemSchema).min(1, { message: 'At least one item is required.' }),
    grandTotal: z.number(),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Delivered']),
    requestDate: z.date(),
    paymentPlan: z.enum([
        'Pay on spot',
        'Monthly',
        '3 months',
        '6 months',
        '1 year',
        'Complete payment before collection',
        'Upon harvest 50% & completion in subsequent months',
        'Make a deposit & complete in subsequent months',
        'Other'
    ]).optional(),
    depositPaid: z.coerce.number().optional(),
    otherPaymentPlan: z.string().optional(),
});

export type DistributeFormValues = z.infer<typeof distributeSchema>;

type DistributeProductsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: FarmerGroup | null;
    members: Farmer[] | undefined;
};

export function DistributeProductsDialog({ open, onOpenChange, group, members }: DistributeProductsDialogProps) {
    const products = useProductOptions();
    const { toast } = useToast();

    const form = useForm<DistributeFormValues>({
        // @ts-ignore
        resolver: zodResolver(distributeSchema),
        defaultValues: {
            seasonYear: new Date().getFullYear().toString(),
            items: [],
            grandTotal: 0,
            status: 'Delivered', // Default to delivered since it's a direct distribution
            requestDate: new Date(),
            paymentPlan: undefined,
            depositPaid: undefined,
            otherPaymentPlan: '',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                seasonYear: group?.seasonYear || new Date().getFullYear().toString(),
                items: [],
                grandTotal: 0,
                status: 'Delivered',
                requestDate: new Date(),
                paymentPlan: undefined,
                depositPaid: undefined,
                otherPaymentPlan: '',
            });
        }
    }, [open, form, group]);

    // Handle derived total values
    const watchedItems = form.watch('items');

    React.useEffect(() => {
        const total = watchedItems.reduce((acc, item) => acc + (item.quantity * item.dynamicPrice || 0), 0);
        form.setValue('grandTotal', total);

        // Update individual item totals
        watchedItems.forEach((item, index) => {
            const itemTotal = (item.quantity || 0) * (item.dynamicPrice || 0);
            if (item.total !== itemTotal) {
                form.setValue(`items.${index}.total`, itemTotal);
            }
        });
    }, [watchedItems, form]);

    const onSubmit = async (data: DistributeFormValues) => {
        if (!group || !members || members.length === 0) {
            toast({
                title: 'Cannot distribute',
                description: 'The group must have at least one member to distribute products.',
                variant: 'destructive',
            });
            return;
        }

        try {
            // Create a request for each farmer in the group
            await Promise.all(members.map(member => {
                const requestId = crypto.randomUUID();
                return addFarmerRequest({
                    farmerId: member.id,
                    groupId: group.id,
                    seasonYear: data.seasonYear,
                    items: data.items,
                    grandTotal: data.grandTotal,
                    status: data.status,
                    requestDate: data.requestDate.toISOString(),
                    paymentPlan: data.paymentPlan,
                    depositPaid: data.depositPaid,
                    otherPaymentPlan: data.otherPaymentPlan,
                }, requestId);
            }));

            toast({
                title: 'Products Distributed',
                description: `Successfully distributed products to ${members.length} members.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Distribution Failed',
                description: error.message ?? 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    };

    const handleProductSelect = (index: number, productId: string) => {
        const product = products?.find(p => p.id === productId);
        if (product) {
            form.setValue(`items.${index}.productName`, product.name);
            form.setValue(`items.${index}.dynamicPrice`, product.price);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto pb-10">
                <DialogHeader>
                    <DialogTitle>Distribute Products</DialogTitle>
                    <DialogDescription>
                        Assign agricultural inputs to all {members?.length || 0} members of <span className="font-semibold text-foreground">{group?.name}</span> simultaneously.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="seasonYear"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Season / Year</FormLabel>
                                        <Input placeholder="e.g. 2024" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Approved">Approved</SelectItem>
                                                <SelectItem value="Rejected">Rejected</SelectItem>
                                                <SelectItem value="Delivered">Delivered</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="requestDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end">
                                        <FormLabel>Distribution Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal',
                                                            !field.value && 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, 'PPP')
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="paymentPlan"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Payment Plan</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Payment Plan" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Pay on spot">Pay on spot</SelectItem>
                                                <SelectItem value="Monthly">Monthly</SelectItem>
                                                <SelectItem value="3 months">3 months</SelectItem>
                                                <SelectItem value="6 months">6 months</SelectItem>
                                                <SelectItem value="1 year">1 year</SelectItem>
                                                <SelectItem value="Complete payment before collection">Complete payment before collection</SelectItem>
                                                <SelectItem value="Upon harvest 50% &amp; completion in subsequent months">Upon harvest 50% &amp; completion in subsequent months</SelectItem>
                                                <SelectItem value="Make a deposit &amp; complete in subsequent months">Make a deposit &amp; complete in subsequent months</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.watch('paymentPlan') === 'Make a deposit & complete in subsequent months' && (
                                <FormField
                                    control={form.control as any}
                                    name="depositPaid"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Deposit Paid (₵)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="any" placeholder="e.g. 50" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {form.watch('paymentPlan') === 'Other' && (
                                <FormField
                                    control={form.control as any}
                                    name="otherPaymentPlan"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Specify Payment Plan</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Describe payment terms" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium">Distributed Items <span className="text-xs text-muted-foreground font-normal ml-2">(Per Member)</span></h4>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', productName: '', quantity: 1, dynamicPrice: 0, total: 0 })}>
                                    <PlusCircle className="h-3 w-3 mr-2" /> Add Item
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-end p-3 border rounded-md bg-muted/20">
                                    <FormField
                                        control={form.control as any}
                                        name={`items.${index}.productId`}
                                        render={({ field: selectField }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className="text-xs">Product</FormLabel>
                                                <Select
                                                    onValueChange={(val) => {
                                                        selectField.onChange(val);
                                                        handleProductSelect(index, val);
                                                    }}
                                                    value={selectField.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Input" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {products?.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control as any}
                                        name={`items.${index}.quantity`}
                                        render={({ field: inputField }) => (
                                            <FormItem className="w-24">
                                                <FormLabel className="text-xs">Qty</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        {...inputField}
                                                        onChange={e => inputField.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control as any}
                                        name={`items.${index}.dynamicPrice`}
                                        render={({ field: inputField }) => (
                                            <FormItem className="w-32">
                                                <FormLabel className="text-xs">Unit Price</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₵</span>
                                                        <Input
                                                            className="pl-6"
                                                            type="number"
                                                            step="any"
                                                            {...inputField}
                                                            onChange={e => inputField.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormItem className="w-32">
                                        <FormLabel className="text-xs">Total</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₵</span>
                                                <Input className="pl-6 bg-muted text-muted-foreground" readOnly value={form.watch(`items.${index}.total`)} />
                                            </div>
                                        </FormControl>
                                    </FormItem>

                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10 hover:bg-destructive/10" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center p-4 border border-dashed rounded-md text-sm text-muted-foreground">
                                    No items added yet. Click "Add Item" to begin.
                                </div>
                            )}
                        </div>

                        {fields.length > 0 && (
                            <div className="flex justify-end p-4 border rounded-md bg-primary/5">
                                <div className="text-right">
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Per Farmer Total</span>
                                    <p className="text-2xl font-bold font-mono">₵{form.watch('grandTotal').toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total for {members?.length || 0} members: ₵{(form.watch('grandTotal') * (members?.length || 0)).toFixed(2)}</p>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={!members || members.length === 0 || form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Distributing...' : 'Distribute Products'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
