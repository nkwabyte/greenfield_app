import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { AppProviders } from '@/lib/store/provider';
import { AppInitializer } from '@/components/app-initializer';


export const metadata: Metadata = {
  title: 'GREENFIELD CRM',
  description: 'Modern CRM for Agriculture',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <AppProviders>
          <AppInitializer /> {/* Loads employees, suppliers, transactions */}
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
