'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      // Redirection is handled by useEffect when auth state changes
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect authenticated users to dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Image src="/logo.svg" width={250} height={250} alt="Greenfield CRM logo" />
        <svg width="60" height="60" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="6" fill="none" stroke="#60A5FA" strokeWidth="2">
            <animate attributeName="r" from="6" to="20" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="22" r="6" fill="none" stroke="#60A5FA" strokeWidth="2">
            <animate attributeName="r" from="6" to="20" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.svg" width={120} height={120} alt="Greenfield CRM logo" />
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">GREENFIELD CRM</h1>
          <p className="mt-2 text-muted-foreground">
            The all-in-one platform to manage your agricultural operations.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" passHref>
                    <Button variant="link" className="px-0 text-xs h-auto !text-primary">
                      Forgot password?
                    </Button>
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full !mt-6 font-bold" disabled={submitting}>
                {submitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="underline text-primary">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
