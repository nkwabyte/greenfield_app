'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { models } from '@/lib/model_options';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { setUser } from '@/lib/store/slices/authSlice';

const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    geminiApiKey: z.string().optional(),
    preferredModel: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
    const dispatch = useDispatch();
    const { toast } = useToast();
    const user = useSelector((state: RootState) => state.auth.user);
    const [showApiKey, setShowApiKey] = React.useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            email: '',
            geminiApiKey: '',
            preferredModel: 'models/gemini-2.5-flash',
        },
    });

    React.useEffect(() => {
        if (user) {
            form.reset({
                name: user.name,
                email: user.email,
                geminiApiKey: user.geminiApiKey || '',
                preferredModel: user.preferredModel || 'models/gemini-2.5-flash',
            });
        }
    }, [user, form]);

    const onSubmit = async (data: ProfileFormValues) => {
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, {
                    name: data.name,
                    geminiApiKey: data.geminiApiKey || '',
                    preferredModel: data.preferredModel || 'models/gemini-2.5-flash'
                });

                // Update Redux state manually to reflect changes immediately
                dispatch(setUser({
                    ...user,
                    name: data.name,
                    geminiApiKey: data.geminiApiKey || '',
                    preferredModel: data.preferredModel || 'models/gemini-2.5-flash'
                }));

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
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                    This is how others will see you on the site.
                </CardDescription>
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
                                        <Input placeholder="Your name" {...field} />
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
                                        <Input placeholder="Email" type="email" {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="geminiApiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Gemini API Key</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                placeholder="Enter your Gemini API Key"
                                                type={showApiKey ? "text" : "password"}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <CardDescription className="text-xs">
                                        Required for AI features. Get one from Google AI Studio.
                                    </CardDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="preferredModel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Default AI Model</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a model" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {models
                                                .filter(m => !m.name.includes('imagen') && !m.name.includes('veo') && !m.name.includes('audio') && !m.name.includes('embedding') && !m.name.includes('aqa') && !m.name.includes('face') && !m.name.includes('preview-image'))
                                                .map((model) => (
                                                    <SelectItem key={model.name} value={model.name}>
                                                        {model.displayName} ({model.version})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <CardDescription className="text-xs">
                                        Choose your preferred Gemini model for text generation.
                                    </CardDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="text-sm text-muted-foreground">
                            Role: <span className="font-medium capitalize">{user?.role}</span>
                        </div>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
