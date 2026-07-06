import type { Metadata } from 'next';
import { LandingScreen } from '@/components/landing-screen';

export const metadata: Metadata = {
  title: 'Sign in — Bizzness',
  description: 'Log in or create an account to access your Bizzness control center.',
};

export default function WelcomePage() {
  return <LandingScreen />;
}
