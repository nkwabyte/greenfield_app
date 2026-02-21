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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  name: z.string().min(1, { message: 'Farmer main surname/nickname is required.' }),
  surname: z.string().optional(),
  otherNames: z.string().optional(),
  popularName: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.string().optional(),

  // Identity
  idType: z.enum(['Passport', 'NHIS', 'Voter ID', 'Ghana Card', 'Other']).optional(),
  idNumber: z.string().optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Separated', 'Divorced', 'Widowed']).optional(),

  // Residence
  physicalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  houseStatus: z.enum(['Rented', 'Owned']).optional(),
  directionToResidence: z.string().optional(),
  lengthOfStay: z.string().optional(),

  // Base Location Fields
  region: z.string().optional(),
  district: z.string().optional(),
  society: z.string().optional(),
  community: z.string().optional(),
  contact: z.string().optional(),

  // Next of Kin
  nextOfKin: z.string().optional(),
  nextOfKinContact: z.string().optional(),

  // Group
  groupPosition: z.string().optional(),

  // General Demographics
  age: z.coerce.number().positive().optional(),
  educationLevel: z.enum(['None', 'Primary', 'JHS', 'SHS', 'Tertiary', 'Other']).optional(),

  // Farm Information
  farmSize: z.coerce.number().positive().optional(),
  farmLocation: z.string().optional(),
  yearsInFarming: z.coerce.number().positive().optional(),
  averageYield: z.coerce.number().positive().optional(),
  cropsGrown: z.array(z.string().min(2).max(100)).optional(),
  otherCrops: z.string().optional(),
  lbcSoldTo: z.string().optional(),
  farmOwnership: z.enum(['Family', 'Owned', 'Rented/Lease', 'Crop sharing']).optional(),
  otherBusiness: z.string().optional(),

  status: z.enum(['Active', 'Inactive']).optional(),
  joinDate: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type FarmerFormValues = z.infer<typeof farmerSchema>;

type AddEditFarmerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer: Farmer | null;
  onSave: (data: FarmerFormValues) => void;
};

export function AddEditFarmerDialog({ open, onOpenChange, farmer, onSave }: AddEditFarmerDialogProps) {
  const [activeTab, setActiveTab] = React.useState('personal');

  const form = useForm<FarmerFormValues>({
    // @ts-ignore - Ignore type mismatch between react-hook-form and zodResolver versions
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      name: '',
      surname: '',
      otherNames: '',
      popularName: '',
      gender: undefined,
      dateOfBirth: '',
      age: undefined,
      idType: undefined,
      idNumber: '',
      maritalStatus: undefined,
      physicalAddress: '',
      postalAddress: '',
      houseStatus: undefined,
      directionToResidence: '',
      lengthOfStay: '',
      region: '',
      district: '',
      society: '',
      community: '',
      contact: '',
      nextOfKin: '',
      nextOfKinContact: '',
      groupPosition: '',
      educationLevel: undefined,
      farmSize: undefined,
      farmLocation: '',
      yearsInFarming: undefined,
      averageYield: undefined,
      cropsGrown: [],
      otherCrops: '',
      lbcSoldTo: '',
      farmOwnership: undefined,
      otherBusiness: '',
      status: 'Active',
    },
  });

  React.useEffect(() => {
    if (open) {
      setActiveTab('personal');
    }
    if (open && farmer) {
      form.reset({
        ...farmer,
        cropsGrown: farmer.cropsGrown,
        joinDate: farmer.joinDate ? new Date(farmer.joinDate) : undefined,
        createdAt: farmer.createdAt ? new Date(farmer.createdAt) : undefined,
        updatedAt: farmer.updatedAt ? new Date(farmer.updatedAt) : undefined,
      });
    } else if (open) {
      form.reset({
        name: '',
        surname: '',
        otherNames: '',
        popularName: '',
        gender: undefined,
        dateOfBirth: '',
        idType: undefined,
        idNumber: '',
        maritalStatus: undefined,
        physicalAddress: '',
        postalAddress: '',
        houseStatus: undefined,
        directionToResidence: '',
        lengthOfStay: '',
        region: '',
        district: '',
        society: '',
        community: '',
        contact: '',
        nextOfKin: '',
        nextOfKinContact: '',
        groupPosition: '',
        age: undefined,
        educationLevel: undefined,
        farmSize: undefined,
        farmLocation: '',
        yearsInFarming: undefined,
        averageYield: undefined,
        cropsGrown: [],
        otherCrops: '',
        lbcSoldTo: '',
        farmOwnership: undefined,
        otherBusiness: '',
        status: 'Active',
        joinDate: new Date(),
      });
    }
  }, [farmer, form, open]);

  const handleSubmit = (data: FarmerFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  const control = form.control as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto pb-10">
        <DialogHeader>
          <DialogTitle>{farmer ? 'Edit Farmer' : 'Add New Farmer'}</DialogTitle>
          <DialogDescription>
            {farmer ? 'Update the details for this farmer.' : 'Fill in the details for the new farmer from the application form.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="py-4">

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="personal">1. Personal Details</TabsTrigger>
                <TabsTrigger value="residence">2. Residence & Contacts</TabsTrigger>
                <TabsTrigger value="farm">3. Farm Information</TabsTrigger>
              </TabsList>

              {/* TAB 1: PERSONAL DETAILS */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <FormField
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Full Name / Main Surname <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Required for system ID" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={control} name="surname" render={({ field }) => (
                    <FormItem><FormLabel>Surname</FormLabel><FormControl><Input placeholder="Surname on ID" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="otherNames" render={({ field }) => (
                    <FormItem><FormLabel>Other Names</FormLabel><FormControl><Input placeholder="First & Middle Names" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="popularName" render={({ field }) => (
                    <FormItem><FormLabel>Popular Name</FormLabel><FormControl><Input placeholder="Nickname" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="gender" render={({ field }) => (
                    <FormItem><FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="age" render={({ field }) => (
                    <FormItem><FormLabel>Age</FormLabel><FormControl><Input type="number" placeholder="Estimated Age" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Identity Section */}
                  <div className="col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-3">Identity Documentation</h4></div>

                  <FormField control={control} name="idType" render={({ field }) => (
                    <FormItem><FormLabel>Type of ID</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select ID" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="NHIS">NHIS</SelectItem>
                          <SelectItem value="Voter ID">Voter ID</SelectItem>
                          <SelectItem value="Ghana Card">Ghana Card</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="idNumber" render={({ field }) => (
                    <FormItem><FormLabel>ID Number</FormLabel><FormControl><Input placeholder="Enter ID number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="maritalStatus" render={({ field }) => (
                    <FormItem><FormLabel>Marital Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Separated">Separated</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="educationLevel" render={({ field }) => (
                    <FormItem><FormLabel>Education Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Primary">Primary</SelectItem>
                          <SelectItem value="JHS">JHS</SelectItem>
                          <SelectItem value="SHS">SHS</SelectItem>
                          <SelectItem value="Tertiary">Tertiary</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
              </TabsContent>

              {/* TAB 2: RESIDENCE & CONTACTS */}
              <TabsContent value="residence" className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <FormField control={control} name="physicalAddress" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Physical Address</FormLabel><FormControl><Input placeholder="House No / Street" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="postalAddress" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Postal Address</FormLabel><FormControl><Input placeholder="P.O. Box" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="houseStatus" render={({ field }) => (
                    <FormItem><FormLabel>House Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Rented">Rented</SelectItem>
                          <SelectItem value="Owned">Owned</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="lengthOfStay" render={({ field }) => (
                    <FormItem><FormLabel>Length of Stay</FormLabel><FormControl><Input placeholder="e.g. 5 years" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="directionToResidence" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Direction to Residence</FormLabel><FormControl><Textarea placeholder="Landmarks to find the house" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* Base Location */}
                  <div className="col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-3">Geographic Location</h4></div>
                  <FormField control={control} name="region" render={({ field }) => (<FormItem><FormLabel>Region</FormLabel><FormControl><Input placeholder="e.g. Ashanti" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input placeholder="e.g. Atwima Kwanwoma" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="community" render={({ field }) => (<FormItem><FormLabel>Community</FormLabel><FormControl><Input placeholder="e.g. Foase" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="society" render={({ field }) => (<FormItem><FormLabel>Society</FormLabel><FormControl><Input placeholder="Society Name" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <FormField control={control} name="contact" render={({ field }) => (<FormItem><FormLabel>Personal Phone</FormLabel><FormControl><Input placeholder="024 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="groupPosition" render={({ field }) => (<FormItem><FormLabel>Position in Group</FormLabel><FormControl><Input placeholder="e.g. Member, Secretary" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  {/* Next of Kin */}
                  <div className="col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-3">Next of Kin Details</h4></div>
                  <FormField control={control} name="nextOfKin" render={({ field }) => (<FormItem><FormLabel>Next of Kin Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="nextOfKinContact" render={({ field }) => (<FormItem><FormLabel>Next of Kin Phone</FormLabel><FormControl><Input placeholder="024 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </TabsContent>

              {/* TAB 3: FARM INFORMATION */}
              <TabsContent value="farm" className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <FormField control={control} name="farmLocation" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Farm Location</FormLabel><FormControl><Input placeholder="Specific area or landmark" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <FormField control={control} name="farmSize" render={({ field }) => (
                    <FormItem><FormLabel>Farm Size (acres)</FormLabel><FormControl><Input type="number" placeholder="e.g. 150" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="yearsInFarming" render={({ field }) => (
                    <FormItem><FormLabel>Years in Farming</FormLabel><FormControl><Input type="number" placeholder="e.g. 10" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="averageYield" render={({ field }) => (
                    <FormItem><FormLabel>Average Yield Output</FormLabel><FormControl><Input type="number" placeholder="Bags / Tonnes" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="lbcSoldTo" render={({ field }) => (
                    <FormItem><FormLabel>Which LBC do you sell to?</FormLabel><FormControl><Input placeholder="e.g. PBC, Ecom" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="farmOwnership" render={({ field }) => (
                    <FormItem><FormLabel>Farm Ownership</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Family">Family</SelectItem>
                          <SelectItem value="Owned">Owned</SelectItem>
                          <SelectItem value="Rented/Lease">Rented/Lease</SelectItem>
                          <SelectItem value="Crop sharing">Crop sharing</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="otherBusiness" render={({ field }) => (
                    <FormItem><FormLabel>Any other business?</FormLabel><FormControl><Input placeholder="e.g. Trading, Artisan" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="cropsGrown" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Main Crops Grown</FormLabel><FormControl><Textarea placeholder="e.g. Cocoa, Coffee, Cashew" {...field} /></FormControl><FormDescription>Comma-separated list</FormDescription><FormMessage /></FormItem>
                  )} />
                  <FormField control={control} name="otherCrops" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Other Subsidiary Crops</FormLabel><FormControl><Input placeholder="e.g. Plantain, Cassava, Yam" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {/* System Fields */}
                  <div className="col-span-2 border-t pt-3 mt-2"><h4 className="text-sm font-semibold mb-3">System Attributes</h4></div>
                  <FormField control={control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={control} name="joinDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Registration Date</FormLabel>
                      <Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus /></PopoverContent>
                      </Popover><FormMessage /></FormItem>
                  )} />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-6 border-t mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              {activeTab === 'farm' ? (
                <Button type="submit">Save Farmer Record</Button>
              ) : (
                <Button type="button" onClick={() => {
                  if (activeTab === 'personal') setActiveTab('residence');
                  else if (activeTab === 'residence') setActiveTab('farm');
                }}>Continue</Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
