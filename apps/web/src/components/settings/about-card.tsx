'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function AboutCard() {
    const [version, setVersion] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (typeof window !== 'undefined' && window.electron?.getAppVersion) {
            window.electron.getAppVersion().then(setVersion).catch(console.error);
        }
    }, []);

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
        </Card>
    );
}
