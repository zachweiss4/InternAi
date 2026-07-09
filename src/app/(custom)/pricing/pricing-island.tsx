'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromoCodeRedeemer } from '@/components/custom/promo-code-redeemer';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api-client';
import { type SubscriptionStatus, SubscriptionStatusSchema } from '@/lib/contracts/subscription';

const BASIC_FEATURES = [
  'Unlimited AI internship searches',
  'AI-powered match scoring',
  'Save up to 50 internships',
  'Application tracking',
  'Email notifications',
];

const PREMIUM_FEATURES = [
  'Everything in Basic',
  'AI resume tailoring per application',
  'AI cover letter generation',
  'Unlimited saved internships',
  'Priority support',
  'Early access to new features',
];

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-600"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PricingIsland() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<'basic' | 'premium' | null>(null);

  useEffect(() => {
    apiFetch('/api/billing', { schema: SubscriptionStatusSchema })
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoadingSubscription(false));
  }, []);

  const currentPlan = subscription?.plan ?? 'free';

  function PlanBadge({ plan }: { plan: string }) {
    if (loadingSubscription) return null;
    if (currentPlan === plan) {
      return <Badge className="bg-brand-600 text-white border-brand-600">Current plan</Badge>;
    }
    return null;
  }

  async function startCheckout(plan: 'basic' | 'premium') {
    setCheckoutPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? 'Checkout is not available yet.');
      }
      window.location.assign(body.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout is not available yet.');
    } finally {
      setCheckoutPlan(null);
    }
  }

  function PlanCTA({ plan, label }: { plan: 'basic' | 'premium'; label: string }) {
    if (currentPlan === plan) {
      return (
        <Button className="w-full" variant="secondary" disabled>
          Current plan
        </Button>
      );
    }
    return (
      <Button
        type="button"
        className="w-full bg-brand-600 hover:bg-brand-700 text-white"
        disabled={checkoutPlan !== null}
        onClick={() => startCheckout(plan)}
      >
        {checkoutPlan === plan ? 'Opening checkout...' : label}
      </Button>
    );
  }

  return (
    <section className="py-section-lg px-gutter">
      <div className="container-page max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <p className="text-eyebrow">Pricing</p>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-lg mx-auto">
            Start free and upgrade when you&apos;re ready for unlimited AI-powered internship
            hunting.
          </p>
        </div>

        <div className="mb-8">
          <PromoCodeRedeemer onRedeemed={setSubscription} />
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {/* Free */}
          <Card className="flex flex-col border-border/70">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2 min-h-6">
                <CardTitle className="text-xl">Free</CardTitle>
                <PlanBadge plan="free" />
              </div>
              <div className="flex items-end gap-1 pt-3">
                <span className="text-4xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground pb-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {['3 AI searches per day', 'Basic match scoring', 'Save up to 5 internships'].map(
                  (f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ),
                )}
              </ul>
            </CardContent>
            <CardFooter>
              {currentPlan === 'free' ? (
                <Button className="w-full" variant="secondary" disabled>
                  Current plan
                </Button>
              ) : (
                <Button className="w-full" asChild variant="outline">
                  <Link href="/signup">Get started free</Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Basic */}
          <Card className="flex flex-col border-brand-300 shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-brand-600 text-white border-brand-600 shadow-sm">
                Most popular
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2 min-h-6">
                <CardTitle className="text-xl">Basic</CardTitle>
                <PlanBadge plan="basic" />
              </div>
              <div className="flex items-end gap-1 pt-3">
                <span className="text-4xl font-semibold">$5</span>
                <span className="text-sm text-muted-foreground pb-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {BASIC_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <PlanCTA plan="basic" label="Get Basic" />
            </CardFooter>
          </Card>

          {/* Premium */}
          <Card className="flex flex-col border-border/70">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2 min-h-6">
                <CardTitle className="text-xl">Premium</CardTitle>
                <PlanBadge plan="premium" />
              </div>
              <div className="flex items-end gap-1 pt-3">
                <span className="text-4xl font-semibold">$10</span>
                <span className="text-sm text-muted-foreground pb-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5 text-sm">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <PlanCTA plan="premium" label="Get Premium" />
            </CardFooter>
          </Card>
        </div>

        {/* FAQ strip */}
        <Separator className="my-12" />
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold mb-1">Can I cancel anytime?</p>
            <p className="text-muted-foreground">
              Yes. Cancel from your{' '}
              <Link href="/billing" className="underline underline-offset-2 hover:text-foreground">
                Billing page
              </Link>{' '}
              and your access continues until the current period ends.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">What happens to my free searches after upgrading?</p>
            <p className="text-muted-foreground">
              Paid plans have unlimited searches - the daily free quota no longer applies.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">Is there a student discount?</p>
            <p className="text-muted-foreground">
              We offer university partnership pricing for student groups and career centers.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-1">How is payment handled?</p>
            <p className="text-muted-foreground">
              Payments are processed securely by Stripe. InternAI never stores your card details.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
