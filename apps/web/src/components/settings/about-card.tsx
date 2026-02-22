'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, DownloadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AboutCard() {
    const [version, setVersion] = React.useState<string | null>(null);
    const [isChecking, setIsChecking] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (typeof window !== 'undefined' && window.electron?.getAppVersion) {
            window.electron.getAppVersion().then(setVersion).catch(console.error);
        }
    }, []);

    const handleCheckUpdate = async () => {
        if (typeof window === 'undefined' || !window.electron?.checkForUpdates) {
            toast({
                title: "Not Available",
                description: "Auto-update is only available in the desktop application.",
                variant: 'destructive'
            });
            return;
        }

        try {
            setIsChecking(true);
            const result = await window.electron.checkForUpdates();
            if (result?.success) {
                toast({
                    title: "Checking for updates",
                    description: "Please wait while we check for the latest version..."
                });
            } else {
                toast({
                    title: "Update check failed",
                    description: result?.error ?? "Failed to start update check.",
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An error occurred while checking for updates.",
                variant: 'destructive'
            });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About Greenfield CRM
                </CardTitle>
                <CardDescription>
                    Information about your current software version.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Version</span>
                    <span className="text-2xl font-bold">{version ? `v${version}` : 'Web Version'}</span>
                </div>
                <div className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Platform</span>
                    <span className="text-lg">{typeof window !== 'undefined' && window.electron ? `Desktop (${window.electron.platform})` : 'Web Browser'}</span>
                </div>
            </CardContent>
            {typeof window !== 'undefined' && window.electron && (
                <CardFooter className="bg-muted/50 px-6 py-4 flex justify-between items-center border-t">
                    <p className="text-sm text-muted-foreground">
                        Keep your application up to date for the latest features and security improvements.
                    </p>
                    <Button onClick={handleCheckUpdate} disabled={isChecking}>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        {isChecking ? 'Checking...' : 'Check for Updates'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
