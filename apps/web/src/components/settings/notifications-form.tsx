'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

const notificationsSchema = z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    marketingEmails: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsSchema>;

export function NotificationsForm() {
    const { toast } = useToast();
    const user = useSelector((state: RootState) => state.auth.user);

    const form = useForm<NotificationsFormValues>({
        resolver: zodResolver(notificationsSchema),
        defaultValues: {
            emailNotifications: true,
            smsNotifications: false,
            marketingEmails: false,
        },
    });

    React.useEffect(() => {
        async function loadSettings() {
            if (user) {
                try {
                    const settingsRef = doc(db, 'users', user.uid, 'settings', 'notifications');
                    const docSnap = await getDoc(settingsRef);
                    if (docSnap.exists()) {
                        form.reset(docSnap.data() as NotificationsFormValues);
                    }
                } catch (error) {
                    console.error('Failed to load notification settings:', error);
                }
            }
        }
        loadSettings();
    }, [user, form]);

    const onSubmit = async (data: NotificationsFormValues) => {
        if (user) {
            try {
                const settingsRef = doc(db, 'users', user.uid, 'settings', 'notifications');
                await setDoc(settingsRef, data);

                toast({
                    title: 'Settings Saved',
                    description: 'Your notification preferences have been saved.',
                });
            } catch (error: any) {
                toast({
                    title: 'Save Failed',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                    Choose what you want to be notified about.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="emailNotifications"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Email Notifications</FormLabel>
                                        <FormDescription>
                                            Receive emails about your account activity.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="smsNotifications"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">SMS Notifications</FormLabel>
                                        <FormDescription>
                                            Receive text messages for important alerts.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="marketingEmails"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Marketing Emails</FormLabel>
                                        <FormDescription>
                                            Receive emails about new features and products.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
