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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { FarmerGroup, Farmer } from '@/lib/types';
import { updateFarmerGroup } from '@/lib/db/services/farmer-groups';

const assignLeaderSchema = z.object({
    leaderId: z.string().min(1, 'Please select a leader'),
});

type AssignLeaderValues = z.infer<typeof assignLeaderSchema>;

type AssignLeaderDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: FarmerGroup | null;
    members: Farmer[] | undefined;
};

export function AssignLeaderDialog({ open, onOpenChange, group, members }: AssignLeaderDialogProps) {
    const { toast } = useToast();

    const form = useForm<AssignLeaderValues>({
        resolver: zodResolver(assignLeaderSchema),
        defaultValues: {
            leaderId: '',
        },
    });

    React.useEffect(() => {
        if (open && group) {
            form.reset({
                leaderId: group.leaderId || '',
            });
        }
    }, [open, group, form]);

    const onSubmit = async (values: AssignLeaderValues) => {
        if (!group) return;

        try {
            await updateFarmerGroup(group.id, { leaderId: values.leaderId });

            toast({
                title: 'Leader Assigned',
                description: `Successfully updated the leader for ${group.name}.`,
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Failed to Assign Leader',
                description: error.message ?? 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Group Leader</DialogTitle>
                    <DialogDescription>
                        Select a member to be the leader of <span className="font-semibold text-foreground">{group?.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="leaderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Leader</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a member" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {!members || members.length === 0 ? (
                                                <SelectItem value="none" disabled>No members in this group</SelectItem>
                                            ) : (
                                                members.map((member) => (
                                                    <SelectItem key={member.id} value={member.id}>
                                                        {member.name} {member.contact ? `(${member.contact})` : ''}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting || !members || members.length === 0}
                            >
                                {form.formState.isSubmitting ? 'Saving...' : 'Assign Leader'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
