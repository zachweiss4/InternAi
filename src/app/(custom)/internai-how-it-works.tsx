'use client';

// @:user-owned

const STEPS = [
  {
    number: '01',
    title: 'Describe the search in your own words',
    description:
      'Start broad or precise. Ask for product internships in the United States, Google roles only, Miami finance programs, or fall openings near campus.',
  },
  {
    number: '02',
    title: 'InternAI checks the source of truth',
    description:
      'The search looks first at company early career pages and known ATS feeds, then brings in selected outside coverage when it adds useful context.',
  },
  {
    number: '03',
    title: 'You compare fit before applying',
    description:
      'Turn resume matching on when you want it. Results can be sorted by relevance, recency, or profile fit so you stay in control of the order.',
  },
  {
    number: '04',
    title: 'Fresh matches reach you daily',
    description:
      'Save alerts by role, company, field, location, and season. The alert engine only emails new matches it has not already sent.',
  },
];

export function InternAIHowItWorks() {
  return (
    <section id="how-it-works" className="px-gutter py-section-lg">
      <div className="editorial-page">
        <div className="grid gap-10 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <aside className="editorial-panel p-6 lg:sticky lg:top-24">
            <p className="editorial-kicker">The working method</p>
            <h2 className="editorial-serif mt-4 text-[clamp(2.1rem,4vw,3.7rem)] leading-[0.96]">
              Search like a person. Filter like a system.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[var(--editorial-muted)]">
              InternAI is meant to remove drudgery, not judgment. You keep the taste, the context,
              and the final call.
            </p>

            <div className="mt-8 space-y-4 border-t border-[var(--editorial-line)] pt-5">
              <p className="text-sm font-semibold text-[var(--editorial-ink)]">
                What stays visible
              </p>
              <ul className="space-y-3 text-sm leading-6 text-[var(--editorial-muted)]">
                <li>Where the listing came from</li>
                <li>Why it matches the search</li>
                <li>When it was found or refreshed</li>
              </ul>
            </div>
          </aside>

          <div>
            <header className="mb-8 max-w-2xl lg:ml-12">
              <p className="editorial-kicker mb-4">How It Works</p>
              <h2 className="editorial-serif text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.95]">
                Four quiet moves from search to shortlist.
              </h2>
            </header>

            <ol className="grid gap-5">
              {STEPS.map((step, index) => (
                <li
                  key={step.number}
                  className={`editorial-clipping grid gap-5 p-5 sm:grid-cols-[5rem_1fr] sm:p-6 ${
                    index % 2 === 1 ? 'lg:ml-16' : 'lg:mr-12'
                  }`}
                >
                  <span className="editorial-serif text-5xl leading-none text-[var(--editorial-coral)]">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold leading-tight text-[var(--editorial-ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--editorial-muted)]">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
