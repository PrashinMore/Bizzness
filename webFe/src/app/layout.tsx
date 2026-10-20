import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { OutletProviderWrapper } from '@/components/outlet-provider-wrapper';
import { ConditionalSideNav } from '@/components/conditional-side-nav';
import { ConditionalContentWrapper } from '@/components/conditional-content-wrapper';
import { OrganizationOnboardingGate } from '@/components/organization-onboarding-gate';
import { fraunces, ibmPlexSans } from '@/lib/app-fonts';

export const metadata: Metadata = {
  title: {
    default: 'Bizzness',
    template: '%s · Bizzness',
  },
  description:
    'Inventory, billing, and staff management for restaurants and retail shops.',
  applicationName: 'Bizzness',
  icons: {
    icon: [{ url: '/brand-logo.svg', type: 'image/svg+xml' }],
    shortcut: '/brand-logo.svg',
    apple: '/brand-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${fraunces.variable} ${ibmPlexSans.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <OutletProviderWrapper>
            <OrganizationOnboardingGate>
              <ConditionalSideNav />
              <ConditionalContentWrapper>{children}</ConditionalContentWrapper>
            </OrganizationOnboardingGate>
          </OutletProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
