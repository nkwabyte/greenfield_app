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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useFarmers } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import type { Farmer, FarmerGroup } from '@/lib/types';
import { updateFarmersBatch } from '@/lib/db/services/farmers';

const addMemberSchema = z.object({
    farmerIds: z.array(z.string()).min(1, 'Please select at least one farmer'),
});

type AddMemberValues = z.infer<typeof addMemberSchema>;

type AddMemberToGroupDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: FarmerGroup | null;
};

export function AddMemberToGroupDialog({ open, onOpenChange, group }: AddMemberToGroupDialogProps) {
    const { toast } = useToast();
    const allFarmers = useFarmers();
    const [search, setSearch] = React.useState('');

    const form = useForm<AddMemberValues>({
        resolver: zodResolver(addMemberSchema) as any,
        defaultValues: {
            farmerIds: [],
        },
    });

    React.useEffect(() => {
        if (open) {
            form.reset({ farmerIds: [] });
            setSearch('');
        }
    }, [open, form]);

    // Only show farmers that are not already in this group
    const availableFarmers = React.useMemo(() => {
        if (!allFarmers || !group) return [];
        return allFarmers.filter(f => f.groupId !== group.id);
    }, [allFarmers, group]);

    const filteredFarmers = React.useMemo(() => {
        if (!search) return availableFarmers;
        return availableFarmers.filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase()) ||
            (f.contact && f.contact.includes(search))
        );
    }, [availableFarmers, search]);

    const onSubmit = async (values: AddMemberValues) => {
        if (!group) return;

        try {
            await updateFarmersBatch(values.farmerIds, { groupId: group.id } as Partial<Farmer>);

            toast({
                title: 'Members Added',
                description: `Successfully added ${values.farmerIds.length} members to the group.`
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Failed to Add Members',
                description: error.message ?? 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    };

    const toggleFarmer = (farmerId: string) => {
        const current = new Set(form.getValues('farmerIds'));
        if (current.has(farmerId)) {
            current.delete(farmerId);
        } else {
            current.add(farmerId);
        }
        form.setValue('farmerIds', Array.from(current), { shouldValidate: true, shouldDirty: true });
    };

    const selectedFarmerIds = form.watch('farmerIds') || [];
    const selectedCount = selectedFarmerIds.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Members to Group</DialogTitle>
                    <DialogDescription>
                        Select one or more farmers to add to <span className="font-semibold text-foreground">{group?.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <FormLabel>
                                    Select Farmers
                                    {selectedCount > 0 && <Badge variant="secondary" className="ml-2">{selectedCount} Selected</Badge>}
                                </FormLabel>
                            </div>

                            <Input
                                placeholder="Search by name or contact..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            <ScrollArea className="h-[300px] border rounded-md p-2">
                                {availableFarmers.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        All available farmers are already in this group.
                                    </div>
                                ) : filteredFarmers.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No farmers found matching your search.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredFarmers.map((farmer: Farmer) => (
                                            <div
                                                key={farmer.id}
                                                className="flex items-start space-x-2 rounded-md border p-2 bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                                                onClick={() => toggleFarmer(farmer.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedFarmerIds.includes(farmer.id)}
                                                    className="mt-0.5 pointer-events-none"
                                                />
                                                <div className="space-y-1 leading-none pointer-events-none">
                                                    <p className="text-sm font-medium leading-none">{farmer.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {farmer.society ? farmer.society : (farmer.contact || 'No Contact')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            {form.formState.errors.farmerIds && (
                                <p className="text-sm font-medium text-destructive mt-2">
                                    {form.formState.errors.farmerIds.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting || selectedCount === 0}
                            >
                                {form.formState.isSubmitting ? 'Adding...' : 'Add Selected'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
