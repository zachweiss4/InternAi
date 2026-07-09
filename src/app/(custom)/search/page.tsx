import type { Metadata } from 'next';
import { SearchIsland } from './search-island';

export const metadata: Metadata = {
  title: 'Search Internships - InternAI',
  description:
    'Find the perfect internship using plain English. Describe what you are looking for and our AI will match you with the best opportunities.',
};

export default function SearchPage() {
  return (
    <main className="container-page py-section">
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-10 space-y-3">
          <p className="text-eyebrow text-brand-600">AI-Powered Search</p>
          <h1 className="text-display">Find your perfect internship</h1>
          <p className="text-body-lg text-muted-foreground max-w-xl">
            Describe what you&apos;re looking for in plain language - role, location, salary, or
            working style - and we&apos;ll match you with the best opportunities, ranked by
            relevance.
          </p>
        </div>

        <SearchIsland />
      </div>
    </main>
  );
}
