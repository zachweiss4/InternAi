// @:user-owned - starter home served at /. Replace it in place, or delete
// this route group before adding another page that resolves to /.

import type { Metadata } from 'next';
import { InternAICTA } from '@/app/(custom)/internai-cta';
import { InternAIFAQ } from '@/app/(custom)/internai-faq';
import { InternAIFeatures } from '@/app/(custom)/internai-features';
import { InternAIHero } from '@/app/(custom)/internai-hero';
import { InternAIHowItWorks } from '@/app/(custom)/internai-how-it-works';
import { siteDescription, siteName } from '@/lib/site';

// Keep this a Server Component so it can export metadata.
export const metadata: Metadata = {
  title: { absolute: siteName },
  description: siteDescription,
  // Do not export an explicit openGraph object here; that suppresses the
  // file-based opengraph-image.tsx for the home route.
  alternates: { canonical: '/' },
};

export default function SetupPlaceholder() {
  return (
    <main className="editorial-home">
      <InternAIHero />
      <InternAIFeatures />
      <InternAIHowItWorks />
      <InternAIFAQ />
      <InternAICTA />
    </main>
  );
}
