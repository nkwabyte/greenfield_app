import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { AppProviders } from '@/lib/store/provider';
import { AppInitializer } from '@/components/app-initializer';
import { InitialSyncProvider } from '@/components/providers/InitialSyncProvider';
import { DataProvider } from '@/components/providers/DataProvider';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ThemeProvider } from '@/components/theme-provider';


export const metadata: Metadata = {
  title: 'GREENFIELD CRM',
  description: 'Modern CRM for Agriculture',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
          <InitialSyncProvider>
            <DataProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <OfflineBanner />
                <AppInitializer /> {/* Loads employees, suppliers, transactions */}
                {children}
                <Toaster />
              </ThemeProvider>
            </DataProvider>
          </InitialSyncProvider>
        </AppProviders>
      </body>
    </html>
  );
}
