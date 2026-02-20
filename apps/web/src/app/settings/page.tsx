'use client';

import * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileForm } from '@/components/settings/profile-form';
import { SecurityForm } from '@/components/settings/security-form';
import { AppearanceForm } from '@/components/settings/appearance-form';
import { NotificationsForm } from '@/components/settings/notifications-form';
import { DangerZone } from '@/components/settings/danger-zone';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
export default function SettingsPage() {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <AppShell>
      <PageHeader title="Settings" description="Manage your account settings and preferences." />
      <div className="flex-1 space-y-4">
        {user?.status === 'Pending' && (
          <Alert variant="destructive" className="bg-orange-50 text-orange-900 border-orange-200">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Account Verification Pending</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your account has not yet been verified by the CEO. Some features may be limited until approval.
            </AlertDescription>
          </Alert>
        )}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger" className="text-red-500">Danger Zone</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-4">
            <ProfileForm />
          </TabsContent>
          <TabsContent value="security" className="space-y-4">
            <SecurityForm />
          </TabsContent>
          <TabsContent value="appearance" className="space-y-4">
            <AppearanceForm />
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <NotificationsForm />
          </TabsContent>
          <TabsContent value="danger" className="space-y-4">
            <DangerZone />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
