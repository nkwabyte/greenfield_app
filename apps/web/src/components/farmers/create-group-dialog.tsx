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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UsersRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GHANA_REGION_NAMES, getDistrictsForRegion } from '@/lib/data/ghana-regions-districts';

// ─── Season Year Options ──────────────────────────────────────────────────────
const SEASON_START_YEAR = 2020;
function getSeasonYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];
    for (let y = currentYear; y >= SEASON_START_YEAR; y--) {
        years.push(y.toString());
    }
    return years;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const createGroupSchema = z.object({
    name: z.string().min(1, 'Group name is required.'),
    region: z.string().min(1, 'Region is required.'),
    district: z.string().min(1, 'District is required.'),
    society: z.string().optional(),
    seasonYear: z.string().min(1, 'Season year is required.'),
    description: z.string().optional(),
});

type CreateGroupValues = z.infer<typeof createGroupSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
type CreateGroupDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
    const { toast } = useToast();

    const form = useForm<CreateGroupValues>({
        resolver: zodResolver(createGroupSchema) as any,
        defaultValues: {
            name: '',
            region: '',
            district: '',
            society: '',
            seasonYear: new Date().getFullYear().toString(),
            description: '',
        },
    });

    // Watch region to derive available districts
    const selectedRegion = form.watch('region');
    const districts = React.useMemo(
        () => (selectedRegion ? getDistrictsForRegion(selectedRegion) : []),
        [selectedRegion]
    );

    // Reset district when region changes
    React.useEffect(() => {
        form.setValue('district', '', { shouldValidate: false });
    }, [selectedRegion, form]);

    // Reset whole form when dialog closes
    React.useEffect(() => {
        if (!open) form.reset();
    }, [open, form]);

    const onSubmit = async (values: CreateGroupValues) => {
        try {
            const { addFarmerGroup } = await import('@/lib/db/services/farmer-groups');
            const id = crypto.randomUUID();
            await addFarmerGroup(
                {
                    name: values.name,
                    region: values.region,
                    district: values.district,
                    society: values.society || undefined,
                    seasonYear: values.seasonYear || undefined,
                    description: values.description || undefined,
                } as any,
                id
            );
            toast({ title: 'Group Created', description: `"${values.name}" has been created successfully.` });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Failed to Create Group',
                description: error.message ?? 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-orange-100 dark:bg-orange-500/10 p-2">
                            <UsersRound className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <DialogTitle>Create Farmer Group</DialogTitle>
                            <DialogDescription>
                                Add a new cooperative or community group manually.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

                        {/* Group Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Name <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Best Farmers A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Region — Dropdown */}
                        <FormField
                            control={form.control}
                            name="region"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Region <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a region" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {GHANA_REGION_NAMES.map((r) => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* District — Dropdown (filtered by region) */}
                        <FormField
                            control={form.control}
                            name="district"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>District <span className="text-destructive">*</span></FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={!selectedRegion}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={selectedRegion ? 'Select a district' : 'Select a region first'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {districts.map((d) => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Society — free text */}
                        <FormField
                            control={form.control}
                            name="society"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Society / Community</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Cocoa Society A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Season Year */}
                        <FormField
                            control={form.control}
                            name="seasonYear"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Season Year <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select season year" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {getSeasonYearOptions().map((year) => (
                                                <SelectItem key={year} value={year}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Optional notes about this group..."
                                            className="resize-none h-20"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                type="submit"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? 'Creating…' : 'Create Group'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
