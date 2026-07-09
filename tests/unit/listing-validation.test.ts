import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { InternshipSearchResult } from '@/lib/search/internships';

vi.mock('server-only', () => ({}));

let hasExplicitInternshipListingSignal: typeof import('@/lib/search/internships').hasExplicitInternshipListingSignal;
let extractGoogleDetailResult: typeof import('@/lib/search/internships').extractGoogleDetailResult;
let isActionablePosting: typeof import('@/lib/search/internships').isActionablePosting;
let isSpecificJobUrl: typeof import('@/lib/search/internships').isSpecificJobUrl;
let inferEmployerFromUrl: typeof import('@/lib/search/internships').inferEmployerFromUrl;
let mapTheirStackJob: typeof import('@/lib/search/internships').mapTheirStackJob;
let workdayJobMatchesSearch: typeof import('@/lib/search/internships').workdayJobMatchesSearch;

beforeAll(async () => {
  ({
    extractGoogleDetailResult,
    hasExplicitInternshipListingSignal,
    inferEmployerFromUrl,
    isActionablePosting,
    isSpecificJobUrl,
    mapTheirStackJob,
    workdayJobMatchesSearch,
  } = await import('@/lib/search/internships'));
});

function result(overrides: Partial<InternshipSearchResult>): InternshipSearchResult {
  return {
    id: 'test',
    title: 'Software Engineer',
    company: 'Example',
    location: 'United States',
    applyUrl: 'https://careers.example.com/jobs/12345-software-engineer',
    postedAt: null,
    source: 'Company Site',
    ...overrides,
  };
}

describe('individual listing validation', () => {
  it('does not treat search query parameters as internship evidence', () => {
    expect(
      hasExplicitInternshipListingSignal(
        result({
          title: 'Software Engineer III',
          applyUrl: 'https://careers.example.com/jobs/12345-software-engineer?q=internship',
        }),
      ),
    ).toBe(false);
  });

  it('accepts internship evidence from a title or job-detail path', () => {
    expect(
      hasExplicitInternshipListingSignal(result({ title: 'Software Engineering Intern' })),
    ).toBe(true);
    expect(
      hasExplicitInternshipListingSignal(
        result({
          applyUrl: 'https://careers.example.com/jobs/12345-software-engineering-intern',
        }),
      ),
    ).toBe(true);
  });

  it('rejects search result pages but accepts individual detail pages', () => {
    const careerUrl = 'https://www.google.com/about/careers/applications/jobs/results/';
    expect(
      isSpecificJobUrl(
        `${careerUrl}?q=internship&page=2`,
        'https://www.google.com/about/careers/applications/',
      ),
    ).toBe(false);
    expect(
      isSpecificJobUrl(
        `${careerUrl}138166347879064262-student-researcher`,
        'https://www.google.com/about/careers/applications/',
      ),
    ).toBe(true);
  });

  it('rejects a career search page even if its title mentions internships', () => {
    expect(
      isActionablePosting(
        result({
          title: 'Internship opportunities',
          applyUrl: 'https://careers.example.com/jobs/search?q=internship',
        }),
      ),
    ).toBe(false);
  });

  it('reads the current Google detail location instead of a related job location', () => {
    const html = `
      <meta property="og:title" content="Software Engineering Intern">
      <meta name="description" content="Build software with Google.">
      <span class="r0wTof">San Francisco, CA, USA</span>
      <div class="op1BBf">
        <span class="r0wTof">Zurich, Switzerland</span>
        <a id="apply-action-button" href="/apply">Apply</a>
      </div>
    `;
    const google = {
      name: 'Google',
      domains: ['careers.google.com'],
      careerUrl: 'https://www.google.com/about/careers/applications/',
    };
    expect(
      extractGoogleDetailResult(
        html,
        'https://www.google.com/about/careers/applications/jobs/results/123456-software-intern',
        google,
      ),
    ).toMatchObject({
      title: 'Software Engineering Intern',
      location: 'Zurich, Switzerland',
    });
  });

  it('maps TheirStack records to the employer destination and published date', () => {
    expect(
      mapTheirStackJob({
        id: 123,
        job_title: 'Software Engineering Intern',
        company: 'Example',
        long_location: 'Miami, FL, United States',
        final_url: 'https://careers.example.com/jobs/123',
        source_url: 'https://example-job-board.test/123',
        date_posted: '2026-07-01',
        min_annual_salary_usd: null,
        max_annual_salary_usd: null,
        remote: false,
      }),
    ).toMatchObject({
      title: 'Software Engineering Intern',
      location: 'Miami, FL, United States',
      applyUrl: 'https://careers.example.com/jobs/123',
      postedAt: '2026-07-01T00:00:00.000Z',
      source: 'TheirStack',
    });
  });

  it('rejects Workday internships that do not match a product-management search', () => {
    expect(
      workdayJobMatchesSearch(
        'product management',
        {
          title: 'DGX Cloud Kubernetes Runtime Intern - Fall 2026',
          externalPath: '/job/US-CA-Santa-Clara/DGX-Cloud-Kubernetes-Runtime-Intern_JR2009619',
        },
        {
          jobDescription:
            'Join the software engineering team building Kubernetes runtime infrastructure.',
        },
      ),
    ).toBe(false);
  });

  it('keeps genuine Workday product-management internships', () => {
    expect(
      workdayJobMatchesSearch(
        'product management',
        {
          title: 'Product Management Intern - Summer 2027',
          externalPath: '/job/New-York-NY/Product-Management-Intern_R1234',
        },
        {
          jobDescription:
            'Support product strategy, customer research, and roadmap prioritization.',
        },
      ),
    ).toBe(true);
  });

  it('does not confuse Workday product-design roles with product management', () => {
    expect(
      workdayJobMatchesSearch(
        'product management',
        {
          title: 'Product Designer Intern',
          externalPath: '/job/San-Jose/Product-Designer-Intern_R5678',
        },
        {
          jobDescription: 'Design product experiences with the UX team.',
        },
      ),
    ).toBe(false);
  });

  it('identifies the employer behind Workday URLs', () => {
    expect(
      inferEmployerFromUrl(
        'https://capitalone.wd12.myworkdayjobs.com/en-US/Capital_One/job/Product-Intern_R123',
      ),
    ).toBe('Capital One');
    expect(
      inferEmployerFromUrl(
        'https://travelers.wd5.myworkdayjobs.com/en-US/External/job/Product-Intern_R456',
      ),
    ).toBe('Travelers');
  });
});
