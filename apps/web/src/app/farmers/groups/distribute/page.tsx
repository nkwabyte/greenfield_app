'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, PlusCircle, Trash2, ArrowLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { db } from '@/lib/db/schema';
import { useProductOptions } from '@/hooks/useData';
import { addFarmerRequest } from '@/lib/db/services/farmer-requests';
import Link from 'next/link';

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
    distributeToAll: z.boolean().default(false),
    selectedFarmers: z.array(z.string()).default([]),
}).refine(data => {
    // If not distributing to all, they must select at least one farmer
    if (!data.distributeToAll && data.selectedFarmers.length === 0) {
        return false;
    }
    return true;
}, {
    message: "You must select at least one farmer.",
    path: ["selectedFarmers"]
});

export type DistributeFormValues = z.infer<typeof distributeSchema>;

export default function DistributeProductsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <DistributeProductsContent />
        </React.Suspense>
    );
}

function DistributeProductsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id') || '';
    const preselectId = searchParams.get('preselect');

    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = React.useState('');

    const group = useLiveQuery(() => db.farmerGroups.get(id), [id]);
    const members = useLiveQuery(() => db.farmers.where('groupId').equals(id).toArray(), [id]);
    const products = useProductOptions();

    // Create options for season years (e.g. from 2 years ago up to 7 years in the future)
    const currentYear = new Date().getFullYear();
    const yearOptions = React.useMemo(() => {
        return Array.from({ length: 10 }, (_, i) => (currentYear - 2 + i).toString());
    }, [currentYear]);

    const form = useForm<DistributeFormValues>({
        // @ts-ignore
        resolver: zodResolver(distributeSchema),
        defaultValues: {
            seasonYear: new Date().getFullYear().toString(),
            items: [],
            grandTotal: 0,
            status: 'Delivered',
            requestDate: new Date(),
            paymentPlan: undefined,
            depositPaid: undefined,
            otherPaymentPlan: '',
            distributeToAll: false,
            selectedFarmers: preselectId ? [preselectId] : [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    React.useEffect(() => {
        if (group && !form.getValues('seasonYear')) {
            form.setValue('seasonYear', group.seasonYear || new Date().getFullYear().toString());
        }
    }, [group, form]);

    const watchedItems = form.watch('items');
    const distributeToAll = form.watch('distributeToAll');
    const selectedFarmers = form.watch('selectedFarmers');

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

    // Compute grand total synchronously for instant UI updates
    const exactGrandTotal = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.dynamicPrice || 0)), 0);

    const activeMembers = members || [];
    const filteredMembers = activeMembers.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const onSubmit = async (data: DistributeFormValues) => {
        if (!group) return;

        let targetFarmers = activeMembers;
        if (!data.distributeToAll) {
            targetFarmers = activeMembers.filter(m => data.selectedFarmers.includes(m.id));
        }

        if (targetFarmers.length === 0) {
            toast({
                title: 'Cannot distribute',
                description: 'You must select at least one member to distribute products.',
                variant: 'destructive',
            });
            return;
        }

        try {
            await Promise.all(targetFarmers.map(member => {
                const requestId = crypto.randomUUID();
                const now = new Date();
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                // Re-calculate the grand total exactly before submission!
                const finalGrandTotal = data.items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.dynamicPrice || 0)), 0);

                let initialPayments = [];
                if (data.paymentPlan === 'Pay on spot') {
                    initialPayments.push({
                        id: crypto.randomUUID(),
                        amount: finalGrandTotal,
                        date: data.requestDate.toISOString(),
                        monthOfPayment: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                        reference: 'Paid on spot'
                    });
                } else if (data.depositPaid && data.depositPaid > 0) {
                    initialPayments.push({
                        id: crypto.randomUUID(),
                        amount: data.depositPaid,
                        date: data.requestDate.toISOString(),
                        monthOfPayment: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
                        reference: 'Initial deposit'
                    });
                }

                return addFarmerRequest({
                    farmerId: member.id,
                    groupId: group.id,
                    seasonYear: data.seasonYear,
                    items: data.items.map(item => ({
                        ...item,
                        total: (item.quantity || 0) * (item.dynamicPrice || 0)
                    })),
                    grandTotal: finalGrandTotal,
                    status: data.status,
                    requestDate: data.requestDate.toISOString(),
                    paymentPlan: data.paymentPlan,
                    depositPaid: data.depositPaid,
                    otherPaymentPlan: data.otherPaymentPlan,
                    payments: initialPayments,
                }, requestId);
            }));

            toast({
                title: 'Products Distributed',
                description: `Successfully distributed products to ${targetFarmers.length} members.`,
            });
            router.push(`/farmers/groups/details?id=${id}`);
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

    if (!group || !members) {
        return (
            <AppShell>
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppShell>
        );
    }

    const toggleFarmerSelection = (farmerId: string, checked: boolean) => {
        const current = form.getValues('selectedFarmers');
        if (checked) {
            form.setValue('selectedFarmers', [...current, farmerId]);
        } else {
            form.setValue('selectedFarmers', current.filter(id => id !== farmerId));
        }
    };

    const toggleAllFiltered = (checked: boolean) => {
        const current = form.getValues('selectedFarmers');
        if (checked) {
            const newSelections = Array.from(new Set([...current, ...filteredMembers.map(m => m.id)]));
            form.setValue('selectedFarmers', newSelections);
        } else {
            const filteredIds = new Set(filteredMembers.map(m => m.id));
            form.setValue('selectedFarmers', current.filter(id => !filteredIds.has(id)));
        }
    };

    const allFilteredSelected = filteredMembers.length > 0 && filteredMembers.every(m => selectedFarmers.includes(m.id));
    const recipientCount = distributeToAll ? activeMembers.length : selectedFarmers.length;

    return (
        <AppShell>
            <div className="mb-4">
                <Link href={`/farmers/groups/details?id=${id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Group Details
                </Link>
            </div>

            <PageHeader
                title="Distribute Products"
                description={`Assign agricultural inputs to members of ${group.name}.`}
            />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8 mt-6 max-w-5xl">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column: Recipients Selection */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card rounded-xl border p-5 shadow-sm">
                                <h3 className="font-semibold text-lg mb-4">Select Recipients</h3>

                                <FormField
                                    control={form.control as any}
                                    name="distributeToAll"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm mb-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">All Members</FormLabel>
                                                <FormDescription>
                                                    Distribute to all {activeMembers.length} members
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {!distributeToAll && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search members..."
                                                className="pl-9"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>

                                        <div className="border rounded-md overflow-hidden flex flex-col h-[300px]">
                                            <div className="flex items-center p-3 border-b bg-muted/30">
                                                <Checkbox
                                                    id="select-all"
                                                    checked={allFilteredSelected}
                                                    onCheckedChange={(checked) => toggleAllFiltered(checked as boolean)}
                                                />
                                                <Label htmlFor="select-all" className="ml-3 font-medium cursor-pointer">
                                                    Select All
                                                </Label>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                                {filteredMembers.length === 0 ? (
                                                    <p className="text-center text-sm text-muted-foreground p-4">No members found</p>
                                                ) : (
                                                    filteredMembers.map((member) => (
                                                        <div key={member.id} className="flex items-center p-2 hover:bg-muted/50 rounded-md">
                                                            <Checkbox
                                                                id={`member-${member.id}`}
                                                                checked={selectedFarmers.includes(member.id)}
                                                                onCheckedChange={(checked) => toggleFarmerSelection(member.id, checked as boolean)}
                                                            />
                                                            <div className="ml-3 flex flex-col flex-1">
                                                                <Label htmlFor={`member-${member.id}`} className="cursor-pointer text-sm">
                                                                    {member.name}
                                                                </Label>
                                                                {member.contact && (
                                                                    <span className="text-xs text-muted-foreground leading-none mt-1">
                                                                        {member.contact}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        {form.formState.errors.selectedFarmers && (
                                            <p className="text-sm font-medium text-destructive">
                                                {form.formState.errors.selectedFarmers.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Distribution Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card rounded-xl border p-6 shadow-sm">
                                <h3 className="font-semibold text-lg mb-4">Distribution Details</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <FormField
                                        control={form.control as any}
                                        name="seasonYear"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Season / Year</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Year" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {yearOptions.map(year => (
                                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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

                                    <FormField
                                        control={form.control as any}
                                        name="paymentPlan"
                                        render={({ field }) => (
                                            <FormItem>
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
                                                <FormItem className="col-span-1 md:col-span-2">
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
                                                <FormItem className="col-span-1 md:col-span-2">
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

                                {/* Items Section */}
                                <div className="space-y-4 border-t pt-6">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-medium">Distributed Items <span className="text-xs text-muted-foreground font-normal ml-2">(Per Member)</span></h4>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', productName: '', quantity: 1, dynamicPrice: 0, total: 0 })}>
                                            <PlusCircle className="h-3 w-3 mr-2" /> Add Item
                                        </Button>
                                    </div>

                                    {form.formState.errors.items?.root && (
                                        <p className="text-sm font-medium text-destructive">
                                            {form.formState.errors.items.root.message}
                                        </p>
                                    )}

                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-3 items-end p-4 border rounded-md bg-muted/10 w-full overflow-x-auto">
                                            <FormField
                                                control={form.control as any}
                                                name={`items.${index}.productId`}
                                                render={({ field: selectField }) => (
                                                    <FormItem className="min-w-[150px] flex-1">
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
                                                    <FormItem className="w-[80px]">
                                                        <FormLabel className="text-xs">Qty</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                {...inputField}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                                    inputField.onChange(val);
                                                                    const price = form.getValues(`items.${index}.dynamicPrice`) || 0;
                                                                    form.setValue(`items.${index}.total`, val * price);
                                                                }}
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
                                                    <FormItem className="w-[110px]">
                                                        <FormLabel className="text-xs">Unit Price</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₵</span>
                                                                <Input
                                                                    className="pl-6"
                                                                    type="number"
                                                                    step="any"
                                                                    {...inputField}
                                                                    onChange={e => {
                                                                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                                                                        inputField.onChange(val);
                                                                        const qty = form.getValues(`items.${index}.quantity`) || 0;
                                                                        form.setValue(`items.${index}.total`, qty * val);
                                                                    }}
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormItem className="w-[110px]">
                                                <FormLabel className="text-xs">Total</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">₵</span>
                                                        <Input className="pl-6 bg-muted text-muted-foreground" readOnly value={((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.dynamicPrice`) || 0)).toFixed(2)} />
                                                    </div>
                                                </FormControl>
                                            </FormItem>

                                            <Button type="button" variant="ghost" size="icon" className="text-destructive h-10 w-10 shrink-0 hover:bg-destructive/10" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    {fields.length === 0 && (
                                        <div className="text-center p-8 border border-dashed rounded-md text-sm text-muted-foreground bg-muted/5">
                                            No items added yet. Click "Add Item" to begin distribution.
                                        </div>
                                    )}

                                    {fields.length > 0 && (
                                        <div className="flex justify-between items-center p-6 border rounded-xl bg-orange-500/5 mt-6 border-orange-500/20">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Distributing to</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{recipientCount} farmer{recipientCount !== 1 ? 's' : ''} in {group.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Value</span>
                                                <p className="text-3xl font-bold font-mono text-foreground mt-1">₵{(exactGrandTotal * recipientCount).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <Button type="button" variant="outline" onClick={() => router.push(`/farmers/groups/details?id=${id}`)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={recipientCount === 0 || form.formState.isSubmitting || fields.length === 0}
                                    className="min-w-[150px]"
                                >
                                    {form.formState.isSubmitting ? 'Distributing...' : 'Confirm Distribution'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </Form>
        </AppShell>
    );
}
