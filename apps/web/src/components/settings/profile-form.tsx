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
import { Eye, EyeOff, Camera, User2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { setUser } from '@/lib/store/slices/authSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const profileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    jobTitle: z.string().optional(),
    geminiApiKey: z.string().optional(),
    preferredModel: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
    const dispatch = useDispatch();
    const { toast } = useToast();
    const user = useSelector((state: RootState) => state.auth.user);
    const isAdmin = user?.role === 'Admin';
    const [showApiKey, setShowApiKey] = React.useState(false);
    const [avatarUploading, setAvatarUploading] = React.useState(false);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        // @ts-ignore
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            phone: '',
            jobTitle: '',
            geminiApiKey: '',
            preferredModel: 'models/gemini-2.5-flash',
        },
    });

    React.useEffect(() => {
        if (user) {
            form.reset({
                name: user.name,
                phone: user.phone || '',
                jobTitle: user.jobTitle || '',
                geminiApiKey: user.geminiApiKey || '',
                preferredModel: user.preferredModel || 'models/gemini-2.5-flash',
            });
        }
    }, [user, form]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Avatar must be smaller than 2MB.', variant: 'destructive' });
            return;
        }

        setAvatarUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `avatars/${user.uid}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

            await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.uid);

            dispatch(setUser({ ...user, avatarUrl: publicUrl }));

            toast({ title: 'Avatar Updated', description: 'Your profile picture has been changed.' });
        } catch (err: any) {
            toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
        } finally {
            setAvatarUploading(false);
        }
    };

    const onSubmit = async (data: ProfileFormValues) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    name: data.name,
                    phone: data.phone || null,
                    job_title: data.jobTitle || null,
                    gemini_api_key: data.geminiApiKey || null,
                    preferred_model: data.preferredModel || 'models/gemini-2.5-flash',
                })
                .eq('id', user.uid);

            if (error) throw error;

            dispatch(setUser({
                ...user,
                name: data.name,
                phone: data.phone || undefined,
                jobTitle: data.jobTitle || undefined,
                geminiApiKey: data.geminiApiKey || undefined,
                preferredModel: data.preferredModel || 'models/gemini-2.5-flash',
            }));

            toast({
                title: 'Profile Updated',
                description: 'Your profile information has been successfully saved.',
            });
        } catch (error: any) {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const initials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <div className="space-y-6">
            {/* Avatar Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                    <CardDescription>Upload a photo to personalise your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Avatar className="h-20 w-20 border-2 border-muted">
                                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                                <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <Camera className="h-5 w-5 text-white" />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="capitalize text-xs">{user?.role}</Badge>
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${user?.status === 'Active' ? 'text-green-600 border-green-300' : user?.status === 'Pending' ? 'text-orange-600 border-orange-300' : 'text-red-600 border-red-300'}`}
                                >
                                    {user?.status}
                                </Badge>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2 text-xs h-7"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={avatarUploading}
                            >
                                {avatarUploading ? 'Uploading…' : 'Change Photo'}
                            </Button>
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">JPG, PNG or GIF. Max 2MB.</p>
                </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                        Update your name, contact details, and AI preferences. Your email cannot be changed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5 max-w-lg">

                            {/* Read-only email */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground select-none">
                                    {user?.email}
                                    <span className="ml-auto text-xs bg-muted rounded px-1.5 py-0.5">Read-only</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Contact your admin to update your email address.</p>
                            </div>

                            <Separator />

                            <FormField
                                control={form.control as any}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Your full name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="024 123 4567" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="jobTitle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Job Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Field Officer" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {isAdmin && <Separator />}

                            {isAdmin && <FormField
                                control={form.control as any}
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
                                        <FormDescription className="text-xs">
                                            Required for AI features. Get one from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google AI Studio</a>.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />}

                            {isAdmin && <FormField
                                control={form.control as any}
                                name="preferredModel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Default AI Model</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                        <FormDescription className="text-xs">
                                            Choose your preferred Gemini model for AI text generation.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />}

                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
