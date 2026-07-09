'use client';

// @:user-owned

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQS = [
  {
    question: 'Is InternAI another job board?',
    answer:
      'No. The goal is to help you search across company sources, job APIs, saved alerts, and your own profile in one place. You still open the real listing and choose where to apply.',
  },
  {
    question: 'Where do the internships come from?',
    answer:
      'InternAI prioritizes company career pages, early career pages, and public ATS feeds. It can also use selected outside sources when they improve coverage.',
  },
  {
    question: 'Do I have to use resume matching?',
    answer:
      'No. Resume matching is optional. Turn it on when you want profile-based ranking, or leave it off when you want a cleaner source-first search.',
  },
  {
    question: 'Will alerts repeat the same listing?',
    answer:
      'Alerts are built to notify you about new matches found during daily checks. Once a listing has been sent for that alert, InternAI records it so the same match does not keep repeating.',
  },
  {
    question: 'Can I search one company without choosing a role?',
    answer:
      'Yes. Company-first search is supported, so you can look for internships at Google, Microsoft, Capital One, or another company even when you do not know the exact role title yet.',
  },
  {
    question: 'How much does InternAI cost?',
    answer:
      'InternAI starts at $5/month, with a higher plan at $10/month for heavier use. Free access codes can be granted for beta testers, friends, or owner-approved accounts.',
  },
];

export function InternAIFAQ() {
  return (
    <section id="faq" className="px-gutter py-section-lg">
      <div className="editorial-page">
        <div className="grid gap-10 lg:grid-cols-[minmax(15rem,0.58fr)_minmax(0,1.12fr)] lg:items-start">
          <header className="lg:pt-8">
            <p className="editorial-kicker mb-4">Common Questions</p>
            <h2 className="editorial-serif text-[clamp(2.2rem,4.5vw,4.2rem)] leading-[0.96]">
              The practical details, without the pitch voice.
            </h2>
            <p className="editorial-copy mt-5 max-w-sm">
              A good search tool should tell you where things came from and what it can actually do.
            </p>
          </header>

          <div className="editorial-panel p-3 sm:p-5">
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={faq.question}
                  value={`item-${i}`}
                  className="border-[var(--editorial-line)]"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-[var(--editorial-ink)] hover:text-[var(--editorial-moss-deep)]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-7 text-[var(--editorial-muted)]">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
