'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
    Plus, Trash2, CheckCircle2, XCircle, Search, MoreHorizontal, Pencil,
} from 'lucide-react';
import { useAllCocoaDistricts } from '@/hooks/useData';
import { addCocoaDistrict, updateCocoaDistrict, deleteCocoaDistrict } from '@/lib/db/services/cocoa-districts';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { CocoaDistrict } from '@/lib/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const districtSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
});
type DistrictFormValues = z.infer<typeof districtSchema>;

// ─── Add Dialog ───────────────────────────────────────────────────────────────

interface AddDistrictDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingNames: string[];
}

function AddDistrictDialog({ open, onOpenChange, existingNames }: AddDistrictDialogProps) {
    const { toast } = useToast();
    const user = useSelector((state: RootState) => state.auth.user);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<DistrictFormValues>({
        // @ts-ignore
        resolver: zodResolver(districtSchema),
        defaultValues: { name: '' },
    });

    React.useEffect(() => {
        if (open) form.reset({ name: '' });
    }, [open, form]);

    const handleSubmit = async (data: DistrictFormValues) => {
        const trimmed = data.name.trim();
        const duplicate = existingNames.some(
            n => n.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
            form.setError('name', { message: 'This district already exists.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addCocoaDistrict({
                id: uuidv4(),
                name: trimmed,
                isActive: true,
                createdBy: user?.name || user?.uid,
            });
            toast({ title: 'District added', description: `"${trimmed}" has been added.` });
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to add district.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Cocoa District</DialogTitle>
                    <DialogDescription>
                        Enter the canonical name of the cocoa district. It will be immediately
                        available in the farmer form.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4 py-2">
                        <FormField
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>District Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Sefwi Wiawso Cocoa District" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding…' : 'Add District'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDistrictDialogProps {
    district: CocoaDistrict | null;
    onOpenChange: (open: boolean) => void;
    existingNames: string[];
}

function EditDistrictDialog({ district, onOpenChange, existingNames }: EditDistrictDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<DistrictFormValues>({
        // @ts-ignore
        resolver: zodResolver(districtSchema),
        defaultValues: { name: district?.name || '' },
    });

    React.useEffect(() => {
        if (district) form.reset({ name: district.name });
    }, [district, form]);

    const handleSubmit = async (data: DistrictFormValues) => {
        if (!district) return;
        const trimmed = data.name.trim();
        const duplicate = existingNames.some(
            n => n.toLowerCase() === trimmed.toLowerCase() && n.toLowerCase() !== district.name.toLowerCase()
        );
        if (duplicate) {
            form.setError('name', { message: 'This district already exists.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateCocoaDistrict(district.id, { name: trimmed });
            toast({ title: 'District updated', description: `Renamed to "${trimmed}".` });
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to update district.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={!!district} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Cocoa District</DialogTitle>
                    <DialogDescription>Change the name of this district.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4 py-2">
                        <FormField
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>District Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Management Panel ────────────────────────────────────────────────────

export function CocoaDistrictManagement() {
    const { toast } = useToast();
    const allDistricts = useAllCocoaDistricts() || [];

    const [search, setSearch] = React.useState('');
    const [addOpen, setAddOpen] = React.useState(false);
    const [editDistrict, setEditDistrict] = React.useState<CocoaDistrict | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<CocoaDistrict | null>(null);

    const existingNames = allDistricts.map(d => d.name);

    const filtered = React.useMemo(
        () =>
            allDistricts.filter(d =>
                d.name.toLowerCase().includes(search.toLowerCase())
            ),
        [allDistricts, search]
    );

    const handleToggleActive = async (district: CocoaDistrict) => {
        try {
            await updateCocoaDistrict(district.id, { isActive: !district.isActive });
            toast({
                title: district.isActive ? 'District deactivated' : 'District activated',
                description: `"${district.name}" is now ${district.isActive ? 'inactive' : 'active'}.`,
            });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteCocoaDistrict(deleteTarget.id);
            toast({ title: 'District deleted', description: `"${deleteTarget.name}" has been removed.` });
            setDeleteTarget(null);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search districts…"
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => setAddOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add District
                </Button>
            </div>

            {/* Empty state */}
            {allDistricts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                    <div className="p-4 rounded-full bg-primary/5 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-primary/40" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No cocoa districts yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Add your first cocoa district. Once added, field agents can select
                        it from the dropdown when registering a farmer.
                    </p>
                    <Button
                        onClick={() => setAddOpen(true)}
                        variant="outline"
                        className="mt-4 gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add First District
                    </Button>
                </div>
            )}

            {/* District table */}
            {filtered.length > 0 && (
                <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40">
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">District Name</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((district, idx) => (
                                <tr
                                    key={district.id}
                                    className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                >
                                    <td className="px-4 py-3 font-medium">{district.name}</td>
                                    <td className="px-4 py-3">
                                        {district.isActive ? (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5 gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-500 border-orange-400/30 bg-orange-500/5 gap-1">
                                                <XCircle className="h-3 w-3" /> Inactive
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                        {new Date(district.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditDistrict(district)} className="gap-2">
                                                    <Pencil className="h-4 w-4" /> Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(district)} className="gap-2">
                                                    {district.isActive
                                                        ? <><XCircle className="h-4 w-4" /> Deactivate</>
                                                        : <><CheckCircle2 className="h-4 w-4" /> Activate</>
                                                    }
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteTarget(district)}
                                                    className="text-destructive gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* No-match search state */}
            {filtered.length === 0 && allDistricts.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                    No districts match &ldquo;{search}&rdquo;.
                </p>
            )}

            {/* Dialogs */}
            <AddDistrictDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                existingNames={existingNames}
            />
            <EditDistrictDialog
                district={editDistrict}
                onOpenChange={open => { if (!open) setEditDistrict(null); }}
                existingNames={existingNames}
            />
            <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This district will be removed from the dropdown. Farmers whose
                            records already reference it will be unaffected. This action can
                            be reversed by re-adding the district.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
