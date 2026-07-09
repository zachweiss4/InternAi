'use client';

// @:user-owned

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InternAICTA() {
  return (
    <section id="cta" className="px-gutter pb-[clamp(4.5rem,9vw,8rem)] pt-section">
      <div className="editorial-page">
        <div className="grid gap-8 border-y border-[var(--editorial-line)] py-10 lg:grid-cols-12 lg:items-end lg:py-14">
          <div className="lg:col-span-7">
            <p className="editorial-kicker mb-4">Ready When You Are</p>
            <h2 className="editorial-serif max-w-3xl text-[clamp(2.4rem,5.5vw,5rem)] leading-[0.92]">
              Build a search that keeps its receipts.
            </h2>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <p className="editorial-copy">
              Start with a broad search, save the roles that feel real, and let daily alerts keep
              watch while you focus on stronger applications.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-[6px] bg-[var(--editorial-coral)] px-6 text-[var(--editorial-ink)] shadow-none hover:bg-[var(--editorial-coral-soft)]"
                asChild
              >
                <a href="/signup">
                  Get started
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-[6px] border-[var(--editorial-line)] bg-[var(--editorial-cream)] px-6 text-[var(--editorial-ink)] shadow-none hover:bg-[var(--editorial-sage)]"
                asChild
              >
                <a href="/pricing">View pricing</a>
              </Button>
            </div>

            <address className="mt-6 not-italic text-sm leading-6 text-[var(--editorial-muted)]">
              Questions?{' '}
              <a
                href="mailto:support@internai.dev"
                className="editorial-underline underline hover:text-[var(--editorial-moss-deep)]"
              >
                support@internai.dev
              </a>
            </address>
          </div>
        </div>
      </div>
    </section>
  );
}
