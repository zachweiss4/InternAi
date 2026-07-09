import type { Metadata } from 'next';
import { SearchIsland } from './search-island';

export const metadata: Metadata = {
  title: 'Search Internships - InternAI',
  description: 'Find real internships from company sources, job feeds, and profile-aware filters.',
};

export default function SearchPage() {
  return (
    <main className="editorial-home min-h-screen px-gutter py-section">
      <div className="editorial-page">
        <div className="grid gap-8 lg:grid-cols-[minmax(15rem,0.45fr)_minmax(0,0.9fr)] lg:items-start">
          <header className="lg:pt-8">
            <p className="editorial-kicker mb-4">Source-first search</p>
            <h1 className="editorial-serif text-[clamp(2.5rem,5vw,4.9rem)] leading-[0.94]">
              Find internships worth opening.
            </h1>
            <p className="editorial-copy mt-5 max-w-md">
              Search by role, company, location, season, or working style. Keep resume matching off
              for a clean source-first view, or turn it on when you want profile-aware ranking.
            </p>
          </header>

          <SearchIsland />
        </div>
      </div>
    </main>
  );
}
