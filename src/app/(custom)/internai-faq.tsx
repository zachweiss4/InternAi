'use client';

// @:user-owned

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

const FAQS = [
  {
    question: 'How does InternAI find internships?',
    answer:
      'InternAI prioritizes company career pages and early-career internship pages, then uses selected job APIs as fallback coverage. It filters results based on your stated preferences: role, company, location, season, and optional resume matching.',
  },
  {
    question: 'How does the resume scoring work?',
    answer:
      'When you upload your resume, InternAI analyzes your skills, experience, and education. For each job posting, it compares your profile against the role requirements using AI and assigns a match score from 0–100%. This helps you prioritize the opportunities where you have the highest chance of success.',
  },
  {
    question: 'Will my applications look generic?',
    answer:
      'No. InternAI generates a tailored resume and cover letter for each application, emphasizing the skills and experiences most relevant to that specific role. You review and approve every document before it is submitted, so you stay in full control.',
  },
  {
    question: 'What companies does InternAI search?',
    answer:
      'InternAI covers a broad range: Fortune 500 companies, startups, non-profits, and government internship programs. If there is a public job listing, InternAI can find it. You can also set preference filters to include or exclude specific industries or company types.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. Your resume and personal information are encrypted at rest and in transit. InternAI only uses your data to power your own job search - it never shares your information with employers or third parties without your explicit consent.',
  },
  {
    question: 'How much does InternAI cost?',
    answer:
      'InternAI starts at $5/month. A free trial is available so you can explore the platform before committing. No credit card is required to start.',
  },
];

export function InternAIFAQ() {
  return (
    <section id="faq" className="py-section-lg bg-muted/30">
      <div className="container-page">
        <div className="mb-12 max-w-2xl">
          <Badge variant="secondary" className="mb-3 text-xs font-medium">
            Common Questions
          </Badge>
          <h2 className="font-display text-h1 tracking-tight">Frequently asked questions</h2>
          <p className="mt-3 text-body-lg text-muted-foreground">
            Everything you need to know before getting started.
          </p>
        </div>

        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.question} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
