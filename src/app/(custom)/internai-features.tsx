'use client';

// @:user-owned

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const FEATURES = [
  {
    title: 'Smart Search Across the Web',
    description:
      'InternAI scours company career pages, job boards, and university portals - then filters based on your major, skills, and salary requirements.',
    icon: 'search',
  },
  {
    title: 'AI Resume Scoring',
    description:
      'Every posting gets scored against your resume in real time. Know exactly where you stand before you apply - no more guesswork.',
    icon: 'score',
  },
  {
    title: 'Tailored Applications in Seconds',
    description:
      'Custom resumes and cover letters generated for each role, aligned with the job description and your experience.',
    icon: 'document',
  },
  {
    title: 'Auto-Fill Applications',
    description:
      'One click fills out long application forms across different portals. Spend time on the things that matter - not data entry.',
    icon: 'form',
  },
  {
    title: 'Deadline Intelligence',
    description:
      'Never miss a rolling deadline again. InternAI tracks application windows and sends smart reminders so you always submit on time.',
    icon: 'calendar',
  },
  {
    title: 'Personal Pipeline Dashboard',
    description:
      'A single view of every opportunity - status, match score, deadline, and next action - organized and always up to date.',
    icon: 'dashboard',
  },
];

export function InternAIFeatures() {
  return (
    <section id="features" className="py-section-lg bg-muted/30">
      <div className="container-page">
        <div className="mb-12 max-w-2xl">
          <Badge variant="secondary" className="mb-3 text-xs font-medium">
            What InternAI Does
          </Badge>
          <h2 className="font-display text-h1 tracking-tight">
            Everything you need to land the right internship
          </h2>
          <p className="mt-3 text-body-lg text-muted-foreground">
            From first search to submitted application - automated, personalized, and designed to
            give you a real competitive edge.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="group lift border-border/60 bg-card transition-colors hover:border-primary/30"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FeatureIcon name={feature.icon} className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-h4 leading-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case 'search':
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
    case 'score':
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
          <title>Score</title>
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
        </svg>
      );
    case 'document':
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
          <title>Document</title>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      );
    case 'form':
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
          <title>Form</title>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h.01" />
          <path d="M17 7h.01" />
          <path d="M7 17h.01" />
          <path d="M17 17h.01" />
        </svg>
      );
    case 'calendar':
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
          <title>Calendar</title>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
        </svg>
      );
    case 'dashboard':
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
          <title>Dashboard</title>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    default:
      return null;
  }
}
