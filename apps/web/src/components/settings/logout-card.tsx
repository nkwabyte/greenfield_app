'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';
import { useLogout } from '@/hooks/use-logout';

export function LogoutCard() {
    const handleLogout = useLogout();

    return (
        <Card className="border-destructive/30">
            <CardHeader>
                <CardTitle className="text-destructive">Sign Out</CardTitle>
                <CardDescription>
                    End your current session. You will need to log back in to access the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="gap-2"
                >
                    <LogOut className="h-4 w-4" />
                    Log Out
                </Button>
            </CardContent>
        </Card>
    );
}
