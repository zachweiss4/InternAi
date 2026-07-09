'use client';

// @:user-owned

const FEATURES = [
  {
    number: '01',
    tag: 'Source',
    title: 'Company pages before aggregators',
    description:
      'InternAI gives priority to early career pages and ATS feeds, then uses outside sources only to widen coverage.',
    className: 'lg:col-span-7 lg:mt-10',
    tone: 'paper',
  },
  {
    number: '02',
    tag: 'Judgment',
    title: 'Fit that explains itself',
    description:
      'Optional resume matching shows why a role fits, where your profile is strong, and which details need sharper language.',
    className: 'lg:col-span-5',
    tone: 'moss',
  },
  {
    number: '03',
    tag: 'Search',
    title: 'Plain English search',
    description:
      'Ask for a role, company, location, season, or working style. You can search broadly or start with one company.',
    className: 'lg:col-span-5 lg:col-start-2 lg:mt-12',
    tone: 'paper',
  },
  {
    number: '04',
    tag: 'Voice',
    title: 'Applications stay yours',
    description:
      'Draft resumes and letters are built for review first, so the final application still sounds like you.',
    className: 'lg:col-span-7 lg:-mt-8',
    tone: 'paper',
  },
  {
    number: '05',
    tag: 'Timing',
    title: 'Alerts for fresh postings',
    description:
      'Daily checks only email you about new matches, not the same recycled listing every morning.',
    className: 'lg:col-span-5 lg:col-start-4',
    tone: 'paper',
  },
  {
    number: '06',
    tag: 'Pipeline',
    title: 'A calmer pipeline',
    description:
      'Saved roles, statuses, deadlines, and notes live together so the search feels less scattered.',
    className: 'lg:col-span-4 lg:translate-y-8',
    tone: 'paper',
  },
];

export function InternAIFeatures() {
  return (
    <section id="features" className="px-gutter py-section-lg">
      <div className="editorial-page">
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
          <header className="lg:col-span-5 lg:pt-8">
            <p className="editorial-kicker mb-4">What InternAI Does</p>
            <h2 className="editorial-serif max-w-xl text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.95]">
              Less noise. More roles worth opening.
            </h2>
            <p className="editorial-copy mt-6 max-w-md">
              The product is built around one simple promise: help students find real internships,
              understand their fit, and act before the window closes.
            </p>
          </header>

          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className={`editorial-panel editorial-feature-card flex flex-col justify-between p-5 sm:p-7 ${
                feature.tone === 'moss' ? 'is-moss' : ''
              } ${feature.className}`}
            >
              <div>
                <div className="mb-8 flex items-center justify-between gap-4">
                  <span className="editorial-pill">{feature.tag}</span>
                  <span className="text-sm font-bold text-[var(--editorial-coral)]">
                    {feature.number}
                  </span>
                </div>
                <h3 className="editorial-serif max-w-lg text-[clamp(2rem,3.2vw,3.15rem)] leading-[1.02]">
                  {feature.title}
                </h3>
              </div>
              <p className="mt-8 text-sm leading-7 text-[var(--editorial-muted)]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
