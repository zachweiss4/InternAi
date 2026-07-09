import type { Metadata } from 'next';
import { PricingIsland } from './pricing-island';

export const metadata: Metadata = {
  title: 'Pricing - InternAI',
  description:
    'Simple, transparent pricing for AI-powered internship search. Start free, upgrade when you need unlimited access.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <PricingIsland />
    </main>
  );
}
