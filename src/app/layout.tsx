import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Facilities App',
  description: 'A ticketing app for Maintenance and Facilities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Vast+Shadow&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <div className="flex flex-1">
              <AppSidebar />
              <div className="flex flex-1 flex-col">
                <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
                  <SidebarTrigger />
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
