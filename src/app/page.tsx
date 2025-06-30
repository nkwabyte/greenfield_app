'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/icons/logo';
import React from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd validate credentials against a database
    // This mock login depends on the email address to determine the role
    const role = email.startsWith('admin') ? 'Admin' : 'Employee';
    const name = role === 'Admin' ? 'Admin User' : 'Employee User';
    login({ name, email: email, role });
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-4 h-16 w-16 text-primary" />
          <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">
            GREENFIELD CRM
          </h1>
          <p className="mt-2 text-muted-foreground">
            The all-in-one platform to manage your agricultural operations.
          </p>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard. <br/> (try `admin@greenfield.com` or `employee@greenfield.com`)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@greenfield.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" passHref>
                    <Button variant="link" className="px-0 text-xs h-auto !text-primary">Forgot password?</Button>
                  </Link>
                </div>
                <Input id="password" type="password" required defaultValue="password" />
              </div>
              <Button type="submit" className="w-full !mt-6 font-bold">
                Sign In
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
