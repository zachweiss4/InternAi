'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PromoCodeRedeemer } from '@/components/custom/promo-code-redeemer';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api-client';
import { type SubscriptionStatus, SubscriptionStatusSchema } from '@/lib/contracts/subscription';

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  premium: 'Premium',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  past_due: { label: 'Past due', className: 'bg-red-50 text-red-700 border-red-200' },
  none: { label: 'Free tier', className: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function BillingIsland() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    apiFetch('/api/billing', { schema: SubscriptionStatusSchema })
      .then(setSubscription)
      .catch(() => {
        window.location.assign('/login');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel() {
    if (
      !confirm('Cancel your subscription? Your access continues until the current period ends.')
    ) {
      return;
    }
    setCancelling(true);
    try {
      await apiFetch('/api/billing/cancel', { method: 'PATCH' });
      toast.success('Subscription cancelled. Access continues until the period ends.');
      setSubscription((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    } catch {
      toast.error('Failed to cancel. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  const plan = subscription?.plan ?? 'free';
  const status = subscription?.status ?? 'none';
  const statusBadge = STATUS_BADGES[status] ??
    STATUS_BADGES.none ?? { label: status, className: '' };
  const isActive = status === 'active';
  const isPaid = plan !== 'free';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold">{PLAN_LABELS[plan] ?? plan}</p>
              {subscription?.currentPeriodEnd && isActive && (
                <p className="text-sm text-muted-foreground">
                  Next billing date: {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              {status === 'cancelled' && subscription?.currentPeriodEnd && (
                <p className="text-sm text-amber-600">
                  Access until: {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
            </div>
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </div>

          {!isPaid && (
            <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 text-sm text-brand-800">
              You&apos;re on the Free plan - 3 searches per day. Upgrade for unlimited access.
            </div>
          )}
        </CardContent>
      </Card>

      <PromoCodeRedeemer onRedeemed={setSubscription} />

      <div className="flex flex-wrap gap-3">
        {!isPaid && (
          <Button asChild className="bg-brand-600 hover:bg-brand-700 text-white">
            <Link href="/pricing">Upgrade plan</Link>
          </Button>
        )}
        {isPaid && isActive && (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/pricing">View all plans</Link>
        </Button>
      </div>

      <Separator />

      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          Questions about billing?{' '}
          <a
            href="mailto:support@internai.dev?subject=Billing%20Question"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Contact us
          </a>
          .
        </p>
        <p>Payments are processed securely by Stripe.</p>
      </div>
    </div>
  );
}
