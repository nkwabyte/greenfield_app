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
    FormDescription,
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
import type { FarmerRequest, Farmer, FarmerGroup, Product } from '@/lib/types';
import { useFarmers, useFarmerGroups, useProducts } from '@/hooks/useData';

const requestItemSchema = z.object({
    productId: z.string().min(1, { message: 'Product is required' }),
    productName: z.string(),
    quantity: z.number().positive(),
    dynamicPrice: z.number().positive(),
    total: z.number(),
});

const requestSchema = z.object({
    farmerId: z.string().min(1, { message: 'Farmer is required.' }),
    groupId: z.string().optional(),
    seasonYear: z.string().min(4),
    items: z.array(requestItemSchema).min(1, { message: 'At least one item is required.' }),
    grandTotal: z.number(),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Delivered']),
    requestDate: z.date(),
});

export type RequestFormValues = z.infer<typeof requestSchema>;

type AddEditRequestDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: FarmerRequest | null;
    onSave: (data: RequestFormValues) => void;
};

export function AddEditRequestDialog({ open, onOpenChange, request, onSave }: AddEditRequestDialogProps) {
    const farmers = useFarmers();
    const groups = useFarmerGroups();
    const products = useProducts();

    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            farmerId: '',
            groupId: undefined,
            seasonYear: new Date().getFullYear().toString(),
            items: [],
            grandTotal: 0,
            status: 'Pending',
            requestDate: new Date(),
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    React.useEffect(() => {
        if (open && request) {
            form.reset({
                farmerId: request.farmerId,
                groupId: request.groupId || undefined,
                seasonYear: request.seasonYear,
                items: request.items,
                grandTotal: request.grandTotal,
                status: request.status,
                requestDate: new Date(request.requestDate),
            });
        } else if (open) {
            form.reset({
                farmerId: '',
                groupId: undefined,
                seasonYear: new Date().getFullYear().toString(),
                items: [],
                grandTotal: 0,
                status: 'Pending',
                requestDate: new Date(),
            });
        }
    }, [request, form, open]);

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

    const handleSubmit = (data: RequestFormValues) => {
        onSave(data);
        onOpenChange(false);
    };

    const handleProductSelect = (index: number, productId: string) => {
        const product = products?.find(p => p.id === productId);
        if (product) {
            form.setValue(`items.${index}.productName`, product.name);
            // You could also set a default price here if products had a price field
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{request ? 'Edit Farmer Request' : 'Create Farmer Request'}</DialogTitle>
                    <DialogDescription>
                        {request ? 'Update the details for this resource request.' : 'Submit a new request for agricultural inputs on behalf of a farmer.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="farmerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Farmer</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Farmer" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {farmers?.map(f => (
                                                    <SelectItem key={f.id} value={f.id}>{f.name} {f.contact && `(${f.contact})`}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="groupId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Farmer Group (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="No Group Selected" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">None</SelectItem>
                                                {groups?.map(g => (
                                                    <SelectItem key={g.id} value={g.id}>{g.name} ({g.seasonYear})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
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
                                control={form.control}
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
                                control={form.control}
                                name="requestDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col justify-end">
                                        <FormLabel>Request Date</FormLabel>
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

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-medium">Requested Items</h4>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', productName: '', quantity: 1, dynamicPrice: 0, total: 0 })}>
                                    <PlusCircle className="h-3 w-3 mr-2" /> Add Item
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-end p-3 border rounded-md bg-muted/20">
                                    <FormField
                                        control={form.control}
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
                                        control={form.control}
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
                                        control={form.control}
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
                                    No items added yet. Click "Add Item" to begin tracking products.
                                </div>
                            )}
                        </div>

                        {fields.length > 0 && (
                            <div className="flex justify-end p-4 border rounded-md bg-primary/5">
                                <div className="text-right">
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Grand Total</span>
                                    <p className="text-2xl font-bold font-mono">₵{form.watch('grandTotal').toFixed(2)}</p>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Request</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
