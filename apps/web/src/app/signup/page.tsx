'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { getFriendlyErrorMessage } from '@/lib/supabase/error-messages';
import { AppLoadingSkeleton } from '@/components/app-loading-skeleton';

export default function SignUpPage() {
    const router = useRouter();
    const { toast } = useToast();

    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const isLoading = useSelector((state: RootState) => state.auth.isLoading);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const ADMIN_SECRET_CODE = 'GREENFIELD_CEO_2026';

    const handleSignUp = async (e: any) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                title: 'Passwords do not match',
                description: 'Please ensure both passwords match.',
                variant: 'destructive',
            });
            return;
        }

        // Admin Code Logic
        let role = 'Employee';
        let status = 'Pending';

        if (adminCode.trim() !== '') {
            if (adminCode !== ADMIN_SECRET_CODE) {
                toast({
                    title: 'Invalid Admin Code',
                    description: 'The admin access code is incorrect. Leave empty if you are an employee.',
                    variant: 'destructive',
                });
                return;
            } else {
                role = 'Admin';
                status = 'Active';
            }
        }

        setSubmitting(true);

        try {
            // Sign up — pass name, role, status as metadata.
            // A Postgres trigger (handle_new_auth_user) will automatically create
            // the public.users profile row server-side (SECURITY DEFINER),
            // bypassing RLS. No client-side insert needed.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        name,
                        role,
                        status,
                    },
                },
            });

            if (authError) throw authError;

            if (!authData.user) throw new Error('User creation failed.');

            toast({
                title: 'Account Created! ✅',
                description: status === 'Active'
                    ? 'Admin account created. Check your email to confirm, then sign in.'
                    : 'Account created. Check your email to confirm, then sign in.',
            });

            // Send to login — email confirmation required before session is live
            router.push('/');

        } catch (error: any) {
            toast({
                title: 'Sign Up Failed',
                description: getFriendlyErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Redirect authenticated users to dashboard if they are already active
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return <AppLoadingSkeleton />;
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center text-center">
                    <Image src="/logo.svg" width={120} height={120} alt="Greenfield CRM logo" />
                    <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">GREENFIELD CRM</h1>
                    <p className="mt-2 text-muted-foreground">
                        Join the team and help manage agricultural operations.
                    </p>
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Create Account</CardTitle>
                        <CardDescription>Enter your details to request an employee account.</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <PasswordInput
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="pt-2 border-t mt-4!">
                                    <div className="space-y-2">
                                        <Label htmlFor="adminCode" className="text-muted-foreground text-sm">Admin Access Code <span className="text-xs font-normal">(Optional)</span></Label>
                                        <PasswordInput
                                            id="adminCode"
                                            placeholder="Enter secret code (CEO only)"
                                            value={adminCode}
                                            onChange={(e) => setAdminCode(e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Leave empty if you are an employee.
                                        </p>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full mt-6! font-bold" disabled={submitting}>
                                    {submitting ? 'Creating Account...' : 'Sign Up'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/" className="underline text-primary">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
