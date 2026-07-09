'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api-client';
import { ApplicationResponse, ApplicationsListResponse } from '@/lib/contracts/applications';
import { SavedInternshipListResponse } from '@/lib/contracts/saved';
import { type InternshipResult, SearchResponseSchema } from '@/lib/contracts/search';
import { formatPostingAge, postingDateTimestamp } from '@/lib/search/result-normalization';

type PaywallReason = 'unauthenticated' | 'quota_exceeded' | null;

const EXAMPLE_QUERIES = [
  'Remote frontend internship in React',
  'Data science internship in New York, $5000+/month',
  'Machine learning internship on-site',
];

const ANY_FILTER = '__any';

const SEASON_FILTERS = [
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
] as const;

const ROLE_FILTERS = [
  'Software Engineering',
  'Data Science',
  'Machine Learning',
  'Product Management',
  'Product Design',
  'Marketing',
  'Finance',
  'Business Analyst',
  'Cybersecurity',
  'Mechanical Engineering',
  'Biomedical Engineering',
  'Research',
];

const LOCATION_FILTERS = [
  'Remote',
  'New York',
  'San Francisco',
  'Los Angeles',
  'Seattle',
  'Boston',
  'Chicago',
  'Austin',
  'Washington DC',
  'Atlanta',
  'United States',
];

const COMPANY_FILTERS = [
  'Microsoft',
  'Google',
  'Amazon',
  'Apple',
  'Meta',
  'NVIDIA',
  'Adobe',
  'Oracle',
  'Cisco',
  'Intel',
  'Dell Technologies',
  'HP Inc.',
  'OpenAI',
  'Anthropic',
  'Cohere',
  'Scale AI',
  'Databricks',
  'Snowflake',
  'Palantir Technologies',
  'Salesforce',
  'ServiceNow',
  'Workday',
  'SAP',
  'Atlassian',
  'HubSpot',
  'Intuit',
  'Zoom Communications',
  'Accenture',
  'Deloitte',
  'PwC',
  'EY',
  'KPMG',
  'Booz Allen Hamilton',
  'Capgemini',
  'Slalom',
  'JPMorgan Chase',
  'Goldman Sachs',
  'Morgan Stanley',
  'Capital One',
  'American Express',
  'Visa',
  'Mastercard',
  'Fidelity Investments',
  'Charles Schwab',
  'Robinhood',
  'SoFi',
  'Stripe',
  'Block',
  'Plaid',
  'PayPal',
  'Nike',
  'PepsiCo',
  'The Coca-Cola Company',
  'Johnson & Johnson',
  'Procter & Gamble',
  'Unilever',
  "L'Oréal",
  'Delta Air Lines',
  'United Airlines',
  'American Airlines',
  'Marriott International',
  'Hilton',
  'Walmart',
  'Target',
  'Costco Wholesale',
  'Kaseya',
  'Chewy',
  'Ryder System',
  'Royal Caribbean Group',
  'Norwegian Cruise Line Holdings',
  'Lennar',
  'Airbnb',
  'Coinbase',
  'Discord',
  'DoorDash',
  'Figma',
  'Perplexity',
  'Ramp',
];

const QUICK_COMPANY_FILTERS = [
  'Microsoft',
  'Google',
  'Amazon',
  'Apple',
  'Meta',
  'OpenAI',
  'Anthropic',
  'NVIDIA',
  'JPMorgan Chase',
  'Capital One',
  'Nike',
  'Kaseya',
  'Chewy',
  'Stripe',
  'Databricks',
];

function ModalityBadge({ modality }: { modality?: InternshipResult['modality'] }) {
  if (!modality) return null;
  const styles: Record<NonNullable<InternshipResult['modality']>, string> = {
    remote: 'bg-brand-100 text-brand-700 border-brand-200',
    hybrid: 'bg-amber-50 text-amber-700 border-amber-200',
    'on-site': 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const labels: Record<NonNullable<InternshipResult['modality']>, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    'on-site': 'On-site',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[modality]}`}
    >
      {labels[modality]}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 60
        ? 'bg-brand-50 text-brand-700 border-brand-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {score}% match
    </span>
  );
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}/mo`;
  if (min) return `${fmt(min)}+/mo`;
  return max ? `Up to ${fmt(max)}/mo` : null;
}

function ResultCard({
  result,
  isApplied,
  isSaved,
  onApply,
  onSave,
  onUnsave,
}: {
  result: InternshipResult;
  isApplied: boolean;
  isSaved: boolean;
  onApply: () => Promise<void>;
  onSave: () => Promise<void>;
  onUnsave: () => Promise<void>;
}) {
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const salary = formatSalary(result.salaryMin, result.salaryMax);
  const posted = formatPostingAge(result.postedAt);

  async function handleApply() {
    setApplying(true);
    try {
      await onApply();
    } finally {
      setApplying(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsave() {
    setSaving(true);
    try {
      await onUnsave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-h4 leading-snug group-hover:text-brand-600 transition-colors">
              {result.title}
            </CardTitle>
            <p className="mt-1 text-body font-medium text-foreground">{result.company}</p>
          </div>
          <ScoreBadge score={result.matchScore ?? 50} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2 6a6 6 0 1 1 10.84 3.553l2.803 2.804a.75.75 0 1 1-1.06 1.06l-2.804-2.803A6 6 0 0 1 2 6Z"
                clipRule="evenodd"
              />
            </svg>
            {result.location}
          </span>
          <ModalityBadge modality={result.modality} />
          {salary && (
            <Badge variant="outline" className="text-xs font-medium">
              {salary}
            </Badge>
          )}
          {result.seasonMatch && (
            <Badge variant="outline" className="text-xs font-medium">
              {result.seasonMatch === 'summer' ? 'Summer' : 'Fall'}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground/70">{posted}</span>
          {result.source && (
            <Badge variant="outline" className="text-xs font-medium">
              {result.source}
            </Badge>
          )}
        </div>
        {result.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {result.description}
          </p>
        )}
        {result.fitReasons && result.fitReasons.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-brand-100 bg-brand-50/45 p-3">
            {result.fitReasons.map((reason) => (
              <p key={reason} className="text-xs font-medium text-brand-800">
                {reason}
              </p>
            ))}
          </div>
        )}
        <div className="pt-1 flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-brand-200 text-brand-700 hover:bg-brand-50 hover:text-brand-800"
          >
            <a href={result.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply now →
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isApplied ? 'secondary' : 'ghost'}
            disabled={isApplied || applying}
            onClick={handleApply}
            className={
              isApplied
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-50'
                : 'border border-border/60 text-muted-foreground hover:text-foreground'
            }
          >
            {isApplied ? 'Applied ✓' : applying ? 'Saving…' : 'Mark as Applied'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={isSaved ? handleUnsave : handleSave}
            className={
              isSaved
                ? 'text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-50'
                : 'border border-border/60 text-muted-foreground hover:text-foreground'
            }
            title={isSaved ? 'Remove from saved' : 'Save internship'}
          >
            {saving ? (
              '…'
            ) : isSaved ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function SearchIsland() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [season, setSeason] = useState<'summer' | 'fall' | ''>('');
  const [sort, setSort] = useState<'relevance' | 'newest'>('relevance');
  const [profileMatch, setProfileMatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InternshipResult[] | null>(null);
  const [total, setTotal] = useState(0);
  const [activeQuery, setActiveQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    location: '',
    company: '',
    season: '',
    profileMatch: false,
  });
  const [paywallReason, setPaywallReason] = useState<PaywallReason>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savedIdByJobId, setSavedIdByJobId] = useState<Map<string, string>>(new Map());
  const sortedResults = useMemo(() => {
    if (!results) return results;
    return [...results].sort((a, b) => {
      if (sort === 'newest') {
        const dateDiff = postingDateTimestamp(b.postedAt) - postingDateTimestamp(a.postedAt);
        if (dateDiff !== 0) return dateDiff;
      }
      return (b.matchScore ?? 0) - (a.matchScore ?? 0);
    });
  }, [results, sort]);

  useEffect(() => {
    async function load() {
      try {
        const [savedData, appliedData] = await Promise.all([
          apiFetch('/api/saved', { method: 'GET', schema: SavedInternshipListResponse }).catch(
            () => null,
          ),
          apiFetch('/api/applications', { method: 'GET', schema: ApplicationsListResponse }).catch(
            () => null,
          ),
        ]);
        if (savedData?.saved) {
          setSavedJobIds(new Set(savedData.saved.map((s) => s.jobId)));
          setSavedIdByJobId(new Map(savedData.saved.map((s) => [s.jobId, s.id])));
        }
        if (appliedData?.applications) {
          setAppliedJobIds(new Set(appliedData.applications.map((a) => a.jobId)));
        }
      } catch {
        // Not logged in - silently skip
      }
    }
    load();
  }, []);

  const handleSearch = useCallback(
    async (
      filters: {
        query?: string;
        role?: string;
        location?: string;
        company?: string;
        season?: 'summer' | 'fall' | '';
        profileMatch?: boolean;
      } = {},
    ) => {
      const roleFilter = (filters.role ?? role).trim();
      const keywordQuery = (filters.query ?? query).trim();
      const locationFilter = (filters.location ?? location).trim();
      const companyFilter = (filters.company ?? company).trim();
      const searchQuery =
        [roleFilter, keywordQuery].filter(Boolean).join(' ') || (companyFilter ? 'internship' : '');
      if (!searchQuery && !companyFilter) return;
      const seasonFilter = filters.season ?? season;
      const profileMatchFilter = filters.profileMatch ?? profileMatch;
      setLoading(true);
      setActiveQuery(
        roleFilter ||
          keywordQuery ||
          (companyFilter ? `internships at ${companyFilter}` : searchQuery),
      );
      setActiveFilters({
        location: locationFilter,
        company: companyFilter,
        season: seasonFilter,
        profileMatch: profileMatchFilter,
      });
      setPaywallReason(null);
      try {
        const params = new URLSearchParams({ q: searchQuery.trim() });
        if (locationFilter) params.set('location', locationFilter);
        if (companyFilter) params.set('company', companyFilter);
        if (seasonFilter) params.set('season', seasonFilter);
        if (profileMatchFilter) params.set('profileMatch', 'true');
        params.set('sort', sort);
        const data = await apiFetch(`/api/search?${params.toString()}`, {
          method: 'GET',
          schema: SearchResponseSchema,
        });
        setResults(data.results);
        setTotal(data.total);
      } catch (err) {
        const cause = (err instanceof Error ? err.cause : null) as Record<string, unknown> | null;
        const reason = cause?.paywallReason as PaywallReason | undefined;
        if (reason === 'unauthenticated' || reason === 'quota_exceeded') {
          setPaywallReason(reason);
          setResults(null);
        } else {
          toast.error('Search failed. Please try again.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [company, location, profileMatch, query, role, season, sort],
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (!q || results !== null || loading) return;
    const seasonParam = searchParams.get('season');
    const nextSeason = seasonParam === 'summer' || seasonParam === 'fall' ? seasonParam : '';
    const nextProfileMatch = searchParams.get('profileMatch') === 'true';
    setQuery(q);
    setSeason(nextSeason);
    setProfileMatch(nextProfileMatch);
    handleSearch({
      query: q,
      role: '',
      location: '',
      company: '',
      season: nextSeason,
      profileMatch: nextProfileMatch,
    });
  }, [searchParams, results, loading, handleSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch();
  }

  return (
    <div className="space-y-8">
      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="grid flex-1 gap-3 md:grid-cols-[220px_1fr]">
            <Select
              value={role || ANY_FILTER}
              onValueChange={(value) => setRole(value === ANY_FILTER ? '' : value)}
              disabled={loading}
            >
              <SelectTrigger className="h-12 border-border/70">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_FILTER}>Any role</SelectItem>
                {ROLE_FILTERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Extra keywords, e.g. React, summer 2027, biology"
              className="h-12 text-base border-border/70 focus-visible:ring-brand-500"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading || (!query.trim() && !role && !company.trim())}
            className="h-12 px-6 bg-brand-600 hover:bg-brand-700 text-white lg:w-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Searching…
              </span>
            ) : (
              'Search'
            )}
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_1fr]">
          <Select
            value={location || ANY_FILTER}
            onValueChange={(value) => setLocation(value === ANY_FILTER ? '' : value)}
            disabled={loading}
          >
            <SelectTrigger className="h-11 border-border/70">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_FILTER}>Any location</SelectItem>
              {LOCATION_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={season || ANY_FILTER}
            onValueChange={(value) =>
              setSeason(value === ANY_FILTER ? '' : (value as 'summer' | 'fall'))
            }
            disabled={loading}
          >
            <SelectTrigger className="h-11 border-border/70">
              <SelectValue placeholder="Season" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_FILTER}>Any season</SelectItem>
              {SEASON_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as 'relevance' | 'newest')}
            disabled={loading}
          >
            <SelectTrigger className="h-11 border-border/70">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Most relevant</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Any company, e.g. Nike, Tesla, Spotify"
            className="h-11 border-border/70"
            disabled={loading}
            list="company-options"
          />
          <datalist id="company-options">
            {COMPANY_FILTERS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border/70 px-3 py-2">
          <Switch
            id="profile-match"
            checked={profileMatch}
            onCheckedChange={setProfileMatch}
            disabled={loading}
          />
          <label htmlFor="profile-match" className="text-sm font-medium text-foreground">
            Resume match
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMPANY_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCompany(option)}
              disabled={loading}
              className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      </form>

      {/* Paywall prompt */}
      {paywallReason && !loading && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-8 text-center space-y-4">
          {paywallReason === 'unauthenticated' ? (
            <>
              <p className="text-h4 font-semibold text-foreground">Sign in to search internships</p>
              <p className="text-body text-muted-foreground">
                Create a free account to get 3 searches per day - or upgrade for unlimited access.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild>
                  <Link href="/signup">Create free account</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-h4 font-semibold text-foreground">Daily free limit reached</p>
              <p className="text-body text-muted-foreground">
                You&apos;ve used your 3 free searches for today. Upgrade to Basic or Premium for
                unlimited searches.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild>
                  <Link href="/pricing">View plans</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free quota resets at midnight UTC.</p>
            </>
          )}
        </div>
      )}

      {/* Example queries */}
      {results === null && !paywallReason && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  setRole('');
                  setLocation('');
                  setCompany('');
                  setSeason('');
                  handleSearch({ query: example, role: '', location: '', company: '', season: '' });
                }}
                className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{total}</span>{' '}
              {total === 1 ? 'result' : 'results'} for{' '}
              <span className="italic">&ldquo;{activeQuery}&rdquo;</span>
              {activeFilters.location && <> in {activeFilters.location}</>}
              {activeFilters.season && (
                <> for {activeFilters.season === 'summer' ? 'Summer' : 'Fall'}</>
              )}
              {activeFilters.company && <> at {activeFilters.company}</>}
              {activeFilters.profileMatch && <> with resume match</>}
            </p>
          </div>

          {sortedResults?.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-12 text-center">
              <p className="text-body text-muted-foreground">
                No internships found for this query.
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Try broadening your search or removing location filters.
              </p>
            </div>
          ) : (
            <>
              <Separator className="my-2" />
              <div className="grid gap-4">
                {sortedResults?.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    isApplied={appliedJobIds.has(result.id)}
                    isSaved={savedJobIds.has(result.id)}
                    onApply={async () => {
                      await apiFetch('/api/applications', {
                        method: 'POST',
                        body: JSON.stringify({
                          jobId: result.id,
                          jobTitle: result.title,
                          company: result.company,
                          applyUrl: result.applyUrl,
                        }),
                        schema: ApplicationResponse,
                      });
                      setAppliedJobIds((prev) => new Set([...prev, result.id]));
                    }}
                    onSave={async () => {
                      await apiFetch('/api/saved', {
                        method: 'POST',
                        body: JSON.stringify({
                          jobId: result.id,
                          jobData: {
                            title: result.title,
                            company: result.company,
                            location: result.location,
                            applyUrl: result.applyUrl,
                            salaryMin: result.salaryMin,
                            salaryMax: result.salaryMax,
                            modality: result.modality,
                            description: result.description,
                            matchScore: result.matchScore,
                          },
                        }),
                      });
                      setSavedJobIds((prev) => new Set([...prev, result.id]));
                    }}
                    onUnsave={async () => {
                      const savedId = savedIdByJobId.get(result.id);
                      if (!savedId) return;
                      await apiFetch(`/api/saved/${savedId}`, { method: 'DELETE' });
                      setSavedJobIds((prev) => {
                        const next = new Set(prev);
                        next.delete(result.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
