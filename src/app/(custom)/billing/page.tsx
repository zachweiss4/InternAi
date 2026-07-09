import type { Metadata } from 'next';
import { BillingIsland } from './billing-island';

export const metadata: Metadata = {
  title: 'Billing - InternAI',
  description: 'Manage your InternAI subscription plan and billing details.',
};

export default function BillingPage() {
  return (
    <main className="min-h-screen py-section px-gutter">
      <div className="container-page max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-h1 font-display">Billing</h1>
          <p className="text-body text-muted-foreground mt-2">
            Manage your subscription plan and billing.
          </p>
        </div>
        <BillingIsland />
      </div>
    </main>
  );
}
