import type { Metadata } from 'next';
import { MarketingLanding } from '@/components/marketing/marketing-landing';

export const metadata: Metadata = {
  title: 'Bizzness — Inventory, billing & staff management for Indian shops',
  description:
    'Track stock, bill customers, manage staff access, and see your sales — all from one screen. Built for small retail shops and restaurants in India.',
};

export default function Home() {
  return <MarketingLanding />;
}
