'use client';

// @:user-owned

import { ArrowRight, BriefcaseBusiness, FileText, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HERO_NOTES = [
  {
    label: 'Company source',
    value: 'Early careers pages first',
  },
  {
    label: 'Fit signal',
    value: 'Resume match stays optional',
  },
  {
    label: 'Alert rhythm',
    value: 'Fresh postings checked daily',
  },
];

const SAMPLE_LISTINGS = [
  {
    title: 'Product Management Intern',
    company: 'Microsoft',
    detail: 'Early careers listing, hybrid, summer cycle',
    score: '91%',
  },
  {
    title: 'Software Engineering Intern',
    company: 'NVIDIA',
    detail: 'Company board result with skill overlap',
    score: '88%',
  },
  {
    title: 'Business Analyst Intern',
    company: 'Capital One',
    detail: 'Saved for finance and data profile',
    score: '84%',
  },
];

export function InternAIHero() {
  return (
    <section className="px-gutter pb-section-lg pt-[clamp(4.5rem,9vw,8rem)]">
      <div className="editorial-page">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.78fr)] lg:items-end">
          <div className="relative lg:pb-12">
            <div
              aria-hidden="true"
              className="absolute -left-8 top-5 hidden h-32 w-3 bg-[var(--editorial-coral)] lg:block"
            />

            <p className="editorial-kicker mb-5">Internship search with a human pulse</p>
            <h1 className="editorial-serif max-w-4xl text-[clamp(3.25rem,8vw,7rem)] leading-[0.9]">
              Find work worth <span className="editorial-mark">growing into.</span>
            </h1>

            <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,0.72fr)_minmax(12rem,0.28fr)] md:items-end">
              <p className="editorial-copy max-w-2xl">
                InternAI gathers live internships from company career pages, reads your profile with
                care, and helps you choose the roles that deserve your time.
              </p>

              <dl className="editorial-rule grid gap-3 pt-4 text-sm text-[var(--editorial-muted)] md:border-l md:border-t-0 md:border-[var(--editorial-line)] md:pl-5 md:pt-0">
                <div>
                  <dt className="font-semibold text-[var(--editorial-ink)]">Designed for</dt>
                  <dd>students who want a calmer search</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[var(--editorial-ink)]">Built around</dt>
                  <dd>real postings and clear next steps</dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-[6px] bg-[var(--editorial-moss-deep)] px-6 text-[var(--editorial-cream)] shadow-none hover:bg-[var(--editorial-moss)]"
                asChild
              >
                <a href="/search">
                  Search internships
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-[6px] border-[var(--editorial-line)] bg-[var(--editorial-cream)] px-6 text-[var(--editorial-ink)] shadow-none hover:bg-[var(--editorial-sage)]"
                asChild
              >
                <a href="/profile">Build my profile</a>
              </Button>
            </div>
          </div>

          <aside aria-label="Example internship search board" className="relative lg:translate-y-8">
            <div
              aria-hidden="true"
              className="absolute -right-5 -top-5 hidden h-28 w-28 border border-[var(--editorial-line)] bg-[var(--editorial-sage)] lg:block"
            />
            <div className="editorial-panel relative p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--editorial-line)] pb-5">
                <div>
                  <p className="editorial-kicker">Today&apos;s desk</p>
                  <h2 className="editorial-serif mt-2 text-3xl leading-none">
                    Source notes, fit cues, fewer dead ends.
                  </h2>
                </div>
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-[var(--editorial-moss-deep)] text-[var(--editorial-cream)]"
                >
                  <Search className="h-5 w-5" />
                </div>
              </div>

              <ul className="mt-5 grid gap-3" aria-label="Sample internship matches">
                {SAMPLE_LISTINGS.map((listing, index) => (
                  <li
                    key={listing.title}
                    className={`editorial-clipping p-4 ${
                      index === 1 ? 'sm:ml-8' : index === 2 ? 'sm:mr-10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--editorial-ink)]">{listing.title}</p>
                        <p className="mt-1 text-sm text-[var(--editorial-muted)]">
                          {listing.company}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--editorial-coral-soft)] px-2.5 py-1 text-xs font-bold text-[var(--editorial-ink)]">
                        {listing.score}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--editorial-muted)]">
                      {listing.detail}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {HERO_NOTES.map((note) => (
                  <div key={note.label} className="border-t border-[var(--editorial-line)] pt-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--editorial-moss-deep)]">
                      {note.label}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[var(--editorial-muted)]">
                      {note.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="editorial-tab px-3 py-1.5">
                  <BriefcaseBusiness aria-hidden="true" className="h-3.5 w-3.5" />
                  Product
                </span>
                <span className="editorial-tab px-3 py-1.5">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                  Miami or remote
                </span>
                <span className="editorial-tab px-3 py-1.5">
                  <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                  Resume ready
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
