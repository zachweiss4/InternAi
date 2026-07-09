'use client';

// @:user-owned

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function InternAIHero() {
  return (
    <section className="relative overflow-hidden py-section-lg px-gutter">
      {/* Warm ambient gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 right-1/4 h-96 bg-[radial-gradient(ellipse_at_top,_var(--brand-300)_0%,_transparent_70%)] opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_at_bottom,_var(--brand-200)_0%,_transparent_60%)] opacity-30" />
      </div>

      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text content */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-medium text-xs">
                AI-Powered Internship Search
              </Badge>
            </div>

            <h1 className="font-display text-[clamp(2.5rem,5vw,3.8rem)] leading-[1.05] tracking-[-0.025em]">
              Land your dream internship <span className="text-primary">without the grind</span>
            </h1>

            <p className="text-body-lg text-muted-foreground max-w-lg leading-relaxed">
              Stop spending hours on job boards. Tell InternAI what you&apos;re looking for in plain
              language - and let AI handle the rest, from searching to tailoring applications to
              tracking deadlines.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button size="lg" asChild>
                <a href="/pricing">Start Free Trial</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              No credit card required &middot; $5/month after trial
            </p>
          </div>

          {/* Right: visual - animated search card */}
          <div className="relative">
            <div className="relative z-10 rounded-xl border bg-card p-6 shadow-xl">
              {/* Simulated search interface */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <SearchIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Search Active</p>
                  <p className="text-xs text-muted-foreground">127 opportunities found</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-muted/60 p-3 border border-border/60">
                  <p className="text-xs text-muted-foreground mb-1">Your query</p>
                  <p className="text-sm font-medium">
                    &quot;Find me data analyst internships in Miami paying over $25/hr&quot;
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm font-medium">Data Analyst Intern</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      92% match
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="text-sm">Business Intelligence Intern</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      78% match
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="text-sm">Finance Intern - Goldman Sachs</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      71% match
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 -top-4 z-20 animate-bounce-in rounded-lg border bg-card px-3 py-1.5 shadow-lg">
              <p className="text-xs font-medium text-primary">+12 new today</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Search</title>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
