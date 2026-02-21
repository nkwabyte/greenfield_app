'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { FarmerGroup, Farmer } from '@/lib/types';
import { useFarmerOptions } from '@/hooks/useData';
import { useFarmers } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { useVirtualizer } from '@tanstack/react-virtual';

const groupSchema = z.object({
    name: z.string().min(1, { message: 'Group name is required.' }),
    description: z.string().optional(),
    seasonYear: z.string().min(4, { message: 'Season year is required.' }),
    farmerIds: z.array(z.string()),
});

export type GroupFormValues = z.infer<typeof groupSchema>;

type AddEditGroupDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: FarmerGroup | null;
    onSave: (data: GroupFormValues) => void;
};

export function AddEditGroupDialog({ open, onOpenChange, group, onSave }: AddEditGroupDialogProps) {
    const farmers = useFarmerOptions();
    const [search, setSearch] = React.useState('');

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
        defaultValues: {
            name: '',
            description: '',
            seasonYear: new Date().getFullYear().toString(),
            farmerIds: [],
        },
    });

    React.useEffect(() => {
        if (open && group) {
            form.reset({
                name: group.name,
                description: group.description || '',
                seasonYear: group.seasonYear,
                farmerIds: group.farmerIds || [],
            });
        } else if (open) {
            form.reset({
                name: '',
                description: '',
                seasonYear: new Date().getFullYear().toString(),
                farmerIds: [],
            });
        }
        setSearch('');
    }, [group, form, open]);

    const handleSubmit = (data: GroupFormValues) => {
        onSave(data);
        onOpenChange(false);
    };

    const filteredFarmers = React.useMemo(() => {
        if (!farmers) return [];
        if (!search) return farmers;
        return farmers.filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            (f.contact && f.contact.includes(search))
        );
    }, [farmers, search]);

    const toggleFarmer = (farmerId: string) => {
        const current = new Set(form.getValues('farmerIds'));
        if (current.has(farmerId)) {
            current.delete(farmerId);
        } else {
            current.add(farmerId);
        }
        form.setValue('farmerIds', Array.from(current), { shouldValidate: true, shouldDirty: true });
    };

    const selectedCount = form.watch('farmerIds').length;

    const parentRef = React.useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredFarmers.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 5,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{group ? 'Edit Farmer Group' : 'Create Farmer Group'}</DialogTitle>
                    <DialogDescription>
                        {group ? 'Update the details for this group.' : 'Organize farmers into seasonal groups.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 gap-y-4 py-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Group Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Premium Cocoa Group A" {...field} />
                                        </FormControl>
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
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Year" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Array.from({ length: 5 }).map((_, i) => {
                                                    const year = (new Date().getFullYear() - 1 + i).toString();
                                                    return <SelectItem key={year} value={year}>{year}</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brief notes about this group..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-3 mt-2">
                            <div className="flex justify-between items-center">
                                <FormLabel>Assign Farmers <Badge variant="secondary" className="ml-2">{selectedCount} Selected</Badge></FormLabel>
                            </div>
                            <Input
                                placeholder="Search farmers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <div ref={parentRef} className="h-48 overflow-y-auto border rounded-md p-2 relative">
                                {filteredFarmers.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">No farmers found</div>
                                ) : (
                                    <div
                                        style={{
                                            height: `${rowVirtualizer.getTotalSize()}px`,
                                            width: '100%',
                                            position: 'relative',
                                        }}
                                    >
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const farmer = filteredFarmers[virtualRow.index];
                                            return (
                                                <div
                                                    key={farmer.id}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: `${virtualRow.size}px`,
                                                        transform: `translateY(${virtualRow.start}px)`,
                                                    }}
                                                    className="p-1"
                                                >
                                                    <div className="flex w-full items-start space-x-2 rounded-md border p-2 bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                                                        onClick={() => toggleFarmer(farmer.id)}>
                                                        <Checkbox
                                                            checked={form.watch('farmerIds').includes(farmer.id)}
                                                            onCheckedChange={() => toggleFarmer(farmer.id)}
                                                            className="mt-0.5 pointer-events-none"
                                                        />
                                                        <div className="space-y-1 leading-none pointer-events-none">
                                                            <p className="text-sm font-medium leading-none">{farmer.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {farmer.community ? farmer.community : (farmer.contact || 'No Contact')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <FormMessage />
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit">Save Group</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
