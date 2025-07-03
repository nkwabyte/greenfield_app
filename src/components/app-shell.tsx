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
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/icons/logo';
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
} from 'lucide-react';

const allNavItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard', roles: ['Admin', 'Employee'] },
  { href: '/farmers', icon: Users, label: 'Farmers', roles: ['Admin', 'Employee'] },
  { href: '/employees', icon: Briefcase, label: 'Employees', roles: ['Admin'] },
  { href: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['Admin', 'Employee'] },
  { href: '/products', icon: Package, label: 'Products', roles: ['Admin', 'Employee'] },
  { href: '/finances', icon: Landmark, label: 'Finances', roles: ['Admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex flex-row items-center justify-center w-full gap-2">
            {/* <Logo className="h-8 w-8 text-primary" /> */}
            <div className="h-32 w-32 text-primary flex flex-row items-center justify-center">
              <Image
                src="/logo.svg"
                width={120}
                height={120}
                alt='Greenfield CRM logo'
              />
            </div>
            {/* <span className="font-headline text-xl font-semibold text-primary">
              GREENFIELD
            </span> */}
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
        <SidebarFooter>
          {/* Add settings or other footer items here if needed */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src='/account.svg' alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
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
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
