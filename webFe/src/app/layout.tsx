import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { OutletProviderWrapper } from '@/components/outlet-provider-wrapper';
import { ConditionalSideNav } from '@/components/conditional-side-nav';
import { ConditionalContentWrapper } from '@/components/conditional-content-wrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Bizzness Portal',
  description:
    'Manage users, roles, and authentication for the Bizzness platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <OutletProviderWrapper>
            <ConditionalSideNav />
            <ConditionalContentWrapper>{children}</ConditionalContentWrapper>
          </OutletProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
