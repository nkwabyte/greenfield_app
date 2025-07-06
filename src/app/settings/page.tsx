'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { handleResetLocalDb } from '@/lib/utility/farmer-utils';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { name: data.name });

        // Note: Firebase Auth email updates are sensitive and require re-authentication.
        // We are only updating the name in Firestore for simplicity.
        // For a real app, you would handle email updates with `updateEmail` from firebase/auth
        // which might require the user to re-enter their password.

        // Manually update the user in our local auth context
        const updatedUser = { ...user, ...data };
        login(updatedUser); 

        toast({
          title: 'Profile Updated',
          description: 'Your profile information has been successfully updated.',
        });
      } catch (error: any) {
        toast({
          title: 'Update Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <AppShell>
      <PageHeader title="Settings" description="Manage your account settings and profile information." />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This is your public display name and email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input type="email" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Input value={user?.role} disabled />
                </FormItem>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
    <CardHeader>
      <CardTitle>Advanced</CardTitle>
      <CardDescription>Danger zone: Local database operations.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button
        variant="destructive"
        onClick={async () => {
          try {
            await handleResetLocalDb();
            toast({
              title: 'Local Database Reset',
              description: 'Your local farmer data has been cleared.',
            });
          } catch (error) {
            toast({
              title: 'Reset Failed',
              description: 'There was a problem resetting the local database.',
              variant: 'destructive',
            });
          }
        }}
      >
        Delete Local Database
      </Button>
    </CardContent>
  </Card>

      </div>
    </AppShell>
  );
}
