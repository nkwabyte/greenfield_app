
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Employee } from '@/lib/types';
import { GHANA_REGIONS_AND_DISTRICTS } from '@/lib/data/ghana-regions-districts';

const employeeSchema = z.object({
  name: z.string().min(1, { message: 'Employee name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  role: z.enum(['Manager', 'Field Agent', 'Accountant', 'Support']),
  startDate: z.date(),
  salary: z.preprocess(
    (a) => (a === '' ? undefined : Number(a)),
    z.number().positive({ message: 'Salary must be a positive number.' }).optional()
  ).optional(),
  status: z.enum(['Active', 'On Leave', 'Terminated']),
  assignedDistricts: z.array(z.string()).default([]),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

type AddEditEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSave: (data: EmployeeFormValues) => void;
};

const REGIONS = Object.keys(GHANA_REGIONS_AND_DISTRICTS);

export function AddEditEmployeeDialog({ open, onOpenChange, employee, onSave }: AddEditEmployeeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeRegion, setActiveRegion] = useState<string>('');
  const [districtSearch, setDistrictSearch] = useState('');

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      name: '',
      email: '',
      role: 'Field Agent',
      startDate: new Date(),
      salary: undefined,
      status: 'Active',
      assignedDistricts: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      setActiveRegion('');
      setDistrictSearch('');
      if (employee) {
        form.reset({
          ...employee,
          startDate: new Date(employee.startDate),
          assignedDistricts: employee.assignedDistricts ?? [],
        });
      } else {
        form.reset({
          name: '',
          email: '',
          role: 'Field Agent',
          startDate: new Date(),
          salary: undefined,
          status: 'Active',
          assignedDistricts: [],
        });
      }
    }
  }, [employee, form, open]);

  const selectedRole = form.watch('role');
  const selectedDistricts: string[] = form.watch('assignedDistricts') ?? [];

  const districtsInRegion = activeRegion ? (GHANA_REGIONS_AND_DISTRICTS[activeRegion] ?? []) : [];
  const filteredDistricts = districtSearch.trim()
    ? districtsInRegion.filter((d) => d.toLowerCase().includes(districtSearch.toLowerCase()))
    : districtsInRegion;

  function toggleDistrict(district: string) {
    const current = form.getValues('assignedDistricts') ?? [];
    if (current.includes(district)) {
      form.setValue('assignedDistricts', current.filter((d) => d !== district), { shouldValidate: true });
    } else {
      form.setValue('assignedDistricts', [...current, district], { shouldValidate: true });
    }
  }

  function removeDistrict(district: string) {
    const current = form.getValues('assignedDistricts') ?? [];
    form.setValue('assignedDistricts', current.filter((d) => d !== district), { shouldValidate: true });
  }

  const handleSubmit = (data: EmployeeFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Update the details for this employee.' : 'Fill in the details for the new employee.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Alice Johnson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g. alice@greenfield.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Field Agent">Field Agent</SelectItem>
                        <SelectItem value="Accountant">Accountant</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 60000"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Assigned Districts (Field Agent only) ───────────────────── */}
            {selectedRole === 'Field Agent' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Assigned Districts</FormLabel>
                  {selectedDistricts.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedDistricts.length} selected
                    </span>
                  )}
                </div>

                {/* Region selector */}
                <Select
                  value={activeRegion}
                  onValueChange={(r) => {
                    setActiveRegion(r);
                    setDistrictSearch('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region to add districts…" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => {
                      const count = selectedDistricts.filter((d) =>
                        GHANA_REGIONS_AND_DISTRICTS[r]?.includes(d)
                      ).length;
                      return (
                        <SelectItem key={r} value={r}>
                          {r}
                          {count > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">({count})</span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* District list for selected region */}
                {activeRegion && (
                  <div className="border rounded-md">
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder={`Search ${activeRegion} districts…`}
                        value={districtSearch}
                        onChange={(e) => setDistrictSearch(e.target.value)}
                      />
                      {districtSearch && (
                        <button
                          type="button"
                          onClick={() => setDistrictSearch('')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-44 overflow-y-auto p-1">
                      {filteredDistricts.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          No districts match your search.
                        </p>
                      ) : (
                        filteredDistricts.map((district) => {
                          const checked = selectedDistricts.includes(district);
                          return (
                            <label
                              key={district}
                              className={cn(
                                'flex items-center gap-2.5 rounded px-2.5 py-1.5 cursor-pointer text-sm select-none',
                                'hover:bg-accent hover:text-accent-foreground',
                                checked && 'bg-accent/50'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleDistrict(district)}
                                className="h-4 w-4"
                              />
                              {district}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Selected districts badges */}
                {selectedDistricts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedDistricts.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                        {d}
                        <button
                          type="button"
                          onClick={() => removeDistrict(d)}
                          className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
                          aria-label={`Remove ${d}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

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
