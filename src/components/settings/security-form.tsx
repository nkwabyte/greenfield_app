'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyErrorMessage } from '@/lib/firebase/error-messages';

const securitySchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SecurityFormValues = z.infer<typeof securitySchema>;

export function SecurityForm() {
    const { toast } = useToast();

    const form = useForm<SecurityFormValues>({
        resolver: zodResolver(securitySchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: SecurityFormValues) => {
        const user = auth.currentUser;
        if (user) {
            try {
                await updatePassword(user, data.password);
                toast({
                    title: 'Password Updated',
                    description: 'Your password has been successfully changed.',
                });
                form.reset();
            } catch (error: any) {
                if (error.code === 'auth/requires-recent-login') {
                    toast({
                        title: 'Re-authentication Required',
                        description: 'For security reasons, please log out and log back in to change your password.',
                        variant: 'destructive',
                    });
                } else {
                    toast({
                        title: 'Update Failed',
                        description: getFriendlyErrorMessage(error),
                        variant: 'destructive',
                    });
                }
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                    Manage your password and security settings.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="New password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Confirm new password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
