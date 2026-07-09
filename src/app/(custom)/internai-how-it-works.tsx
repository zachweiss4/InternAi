'use client';

// @:user-owned

import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STEPS = [
  {
    number: '01',
    title: 'Describe what you want',
    description:
      'Tell InternAI about your ideal role in plain language - "Find me marketing internships in Chicago, $20/hr+, Fortune 500 only." The AI understands your preferences, majors, skills, and salary floor.',
  },
  {
    number: '02',
    title: 'AI builds your pipeline',
    description:
      'InternAI searches across company websites, job boards, and university portals - then scores every result against your resume, filters out the noise, and surfaces only the best-fit opportunities.',
  },
  {
    number: '03',
    title: 'Apply with confidence',
    description:
      'Each application is tailored: a customized resume, a matching cover letter, and auto-filled forms. Your materials stand out because they were built specifically for that role.',
  },
  {
    number: '04',
    title: 'Track and never miss a deadline',
    description:
      'Your personal dashboard shows every application, its status, and upcoming deadlines. Smart reminders fire at the right time so you never lose an opportunity to a late submission.',
  },
];

export function InternAIHowItWorks() {
  return (
    <section id="how-it-works" className="py-section-lg">
      <div className="container-page">
        <div className="mb-12 max-w-2xl">
          <Badge variant="secondary" className="mb-3 text-xs font-medium">
            The Process
          </Badge>
          <h2 className="font-display text-h1 tracking-tight">
            From search to offer in four steps
          </h2>
          <p className="mt-3 text-body-lg text-muted-foreground">
            No complex setup. No endless configuration. Just tell InternAI what you want and watch
            it work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {STEPS.map((step, index) => (
            <Card key={step.number} className="relative border-border/60 bg-card overflow-hidden">
              {/* Step number watermark */}
              <div className="absolute -bottom-4 -right-2 select-none font-display text-[6rem] font-bold tracking-tight text-muted/10">
                {step.number}
              </div>
              <CardHeader>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-lg">
                  {index + 1}
                </div>
                <CardTitle className="text-h4 leading-tight">{step.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {step.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
