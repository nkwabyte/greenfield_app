'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';
import Image from 'next/image';
import {
  LayoutGrid,
  LogOut,
  Users,
  Settings,
  Briefcase,
  Landmark,
  Truck,
  Package
} from 'lucide-react'; import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { ThemeToggle } from '@/components/theme-toggle';

const allNavItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard', roles: ['Admin', 'Employee'] },
  { href: '/farmers', icon: Users, label: 'Farmers', roles: ['Admin', 'Employee'] },
  { href: '/employees', icon: Briefcase, label: 'Employees', roles: ['Admin'] },
  { href: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['Admin', 'Employee'] },
  { href: '/products', icon: Package, label: 'Products', roles: ['Admin', 'Employee'] },
  { href: '/finances', icon: Landmark, label: 'Finances', roles: ['Admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useSelector((state: RootState) => state.auth.isLoading);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const navItems = React.useMemo(() => {
    if (!user?.role) return [];
    return allNavItems.filter(item => item.roles.includes(user.role));
  }, [user?.role]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }



  if (user.status === 'Disabled') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-6">
          <LogOut className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Account Disabled</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          Your account has been disabled by an administrator. Please contact support.
        </p>
        <Button onClick={handleLogout} variant="destructive">
          Log Out
        </Button>
      </div>
    );
  }



  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-2" />
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Image src="/logo.svg" width={32} height={32} alt="Greenfield CRM" />
          </Link>
        </div>

        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/account.svg" alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sidebar className="top-16! h-[calc(100svh-4rem)]!">
        <SidebarHeader>
          <Link href="/dashboard" className="flex flex-row items-center justify-center w-full gap-2 py-4">
            <div className="h-24 w-24 text-primary flex flex-row items-center justify-center">
              <Image src="/logo.svg" width={100} height={100} alt="Greenfield CRM logo" />
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>

      <SidebarInset className="pt-16 peer-data-[variant=inset]:min-h-[calc(100svh-4rem)]">
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
