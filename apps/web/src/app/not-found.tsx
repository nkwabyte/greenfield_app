import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4 text-center">
            <div className="flex max-w-md flex-col items-center gap-6 rounded-3xl bg-card p-10 shadow-lg border">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                    <FileQuestion className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">404</h1>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">Page not found</h2>
                    <p className="text-muted-foreground">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center pt-4">
                    <Button asChild variant="default" className="w-full sm:w-auto">
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Go to Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="javascript:history.back()">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Go Back
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"></div>
        </div>
    );
}
