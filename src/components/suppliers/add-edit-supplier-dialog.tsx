
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
import type { Supplier } from '@/lib/types';

const supplierSchema = z.object({
  name: z.string().min(1, { message: 'Supplier name is required.' }),
  contactPerson: z.string().min(1, { message: 'Contact person is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().min(1, { message: 'Phone number is required.' }),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

type AddEditSupplierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSave: (data: SupplierFormValues) => void;
};

export function AddEditSupplierDialog({ open, onOpenChange, supplier, onSave }: AddEditSupplierDialogProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
    },
  });

  React.useEffect(() => {
    if (supplier) {
      form.reset(supplier);
    } else {
      form.reset({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
      });
    }
  }, [supplier, form, open]);

  const handleSubmit = (data: SupplierFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {supplier ? 'Update the details for this supplier.' : 'Fill in the details for the new supplier.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AgroCorp Supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. David Chen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g. sales@agrocorp.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 123-456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
