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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Farmer } from '@/lib/types';
import { Textarea } from '../ui/textarea';

const farmerSchema = z.object({
  name: z.string().min(1, { message: 'Farmer name is required.' }),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  community: z.string().optional(),
  contact: z.string().optional(),
  age: z.coerce.number().positive().optional(),
  educationLevel: z.enum(['None', 'Primary', 'JHS', 'SHS', 'Tertiary', 'Other']).optional(),
  farmSize: z.coerce.number().positive().optional(),
  cropsGrown: z.array(z.string().min(2).max(100)).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  joinDate: z.date().optional(),
});

export type FarmerFormValues = z.infer<typeof farmerSchema>;

type AddEditFarmerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer: Farmer | null;
  onSave: (data: FarmerFormValues) => void;
};

export function AddEditFarmerDialog({ open, onOpenChange, farmer, onSave }: AddEditFarmerDialogProps) {
  const form = useForm<FarmerFormValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      name: '',
      region: '',
      district: '',
      community: '',
      contact: '',
      cropsGrown: [],
      status: 'Active',
    },
  });

  React.useEffect(() => {
    if (open && farmer) {
      form.reset({
        ...farmer,
        cropsGrown: farmer.cropsGrown,
        joinDate: farmer.joinDate ? new Date(farmer.joinDate) : undefined,
      });
    } else if (open) {
      form.reset({
        name: '',
        gender: undefined,
        region: '',
        district: '',
        community: '',
        contact: '',
        age: undefined,
        educationLevel: undefined,
        farmSize: undefined,
        cropsGrown: [],
        status: 'Active',
        joinDate: new Date(),
      });
    }
  }, [farmer, form, open]);

  const handleSubmit = (data: FarmerFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{farmer ? 'Edit Farmer' : 'Add New Farmer'}</DialogTitle>
          <DialogDescription>
            {farmer ? 'Update the details for this farmer.' : 'Fill in the details for the new farmer.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-2 gap-x-4 gap-y-3 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Farmer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Appleseed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ashanti" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Atwima Kwanwoma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="community"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Foase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 024 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 45" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="JHS">JHS</SelectItem>
                      <SelectItem value="SHS">SHS</SelectItem>
                      <SelectItem value="Tertiary">Tertiary</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="farmSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Farm Size (acres)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 150" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cropsGrown"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Crops Grown</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Maize, Cassava, Plantain" {...field} />
                  </FormControl>
                   <FormDescription>
                    Enter a comma-separated list of crops.
                  </FormDescription>
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
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Join Date</FormLabel>
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
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-2 pt-4">
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
