import 'server-only';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { COMPANY_DIRECTORY, type CompanyDirectoryEntry } from '@/lib/search/company-directory';
import {
  normalizePostingDate,
  normalizeUnixPostingDate,
  postingDateTimestamp,
} from '@/lib/search/result-normalization';

export type InternshipSource =
  | 'Adzuna'
  | 'Greenhouse'
  | 'Lever'
  | 'Ashby'
  | 'SmartRecruiters'
  | 'Company Site'
  | 'Google Jobs'
  | 'TheirStack'
  | 'Web Search';

export interface InternshipSearchResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  modality?: 'remote' | 'hybrid' | 'on-site';
  applyUrl: string;
  postedAt: string | null;
  matchScore?: number;
  seasonMatch?: 'summer' | 'fall';
  fitReasons?: string[];
  description?: string;
  source: InternshipSource;
}

type ScoredInternshipSearchResult = InternshipSearchResult & { matchScore: number };

export interface SearchProfile {
  university?: string | null;
  graduationYear?: number | null;
  jobKeywords?: string | null;
  resumeText?: string | null;
  major?: string | null;
  gpa?: number | null;
  skills?: string | null;
  targetRoles?: string | null;
  targetLocations?: string | null;
  sponsorshipRequired?: boolean | null;
}

interface SearchOptions {
  query: string;
  location?: string | null;
  company?: string | null;
  season?: 'summer' | 'fall' | null;
  profile?: SearchProfile | null;
  sort?: 'relevance' | 'newest';
  limit?: number | null;
}

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  created?: string;
  description?: string;
}

interface GreenhouseJob {
  id: number | string;
  title: string;
  absolute_url?: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  content?: string;
}

interface LeverJob {
  id?: string;
  text?: string;
  hostedUrl?: string;
  createdAt?: number;
  categories?: {
    team?: string;
    location?: string;
    commitment?: string;
  };
  descriptionPlain?: string;
}

interface AshbyJob {
  id?: string;
  title?: string;
  location?: string;
  department?: string;
  jobUrl?: string;
  publishedAt?: string;
  descriptionPlain?: string;
}

interface AmazonJob {
  id?: string;
  id_icims?: string;
  title?: string;
  company_name?: string;
  location?: string;
  normalized_location?: string;
  city?: string;
  state?: string;
  country_code?: string;
  description?: string;
  description_short?: string;
  basic_qualifications?: string;
  job_path?: string;
  url_next_step?: string;
  posted_date?: string;
  updated_time?: string;
  business_category?: string;
  job_category?: string;
}

interface WorkdayJob {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
  timeType?: string;
}

interface WorkdayJobPostingInfo {
  title?: string;
  jobDescription?: string;
  location?: string;
  additionalLocations?: string[];
  startDate?: string;
  timeType?: string;
  jobReqId?: string;
}

interface EightfoldJob {
  id?: string | number;
  displayJobId?: string;
  name?: string;
  title?: string;
  locations?: string[];
  standardizedLocations?: string[];
  postedTs?: number;
  creationTs?: number;
  department?: string;
  positionUrl?: string;
  canonicalPositionUrl?: string;
  jobDescription?: string;
  workLocationOption?: string;
}

interface SerpApiJob {
  title?: string;
  company_name?: string;
  location?: string;
  via?: string;
  share_link?: string;
  related_links?: Array<{ link?: string; text?: string }>;
  detected_extensions?: {
    posted_at?: string;
    salary?: string;
  };
  description?: string;
  job_id?: string;
}

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  displayed_link?: string;
}

interface TheirStackJob {
  id?: number | string;
  job_title?: string;
  company?: string;
  location?: string;
  long_location?: string;
  short_location?: string;
  locations?: Array<{ display_name?: string }>;
  description?: string;
  final_url?: string;
  url?: string;
  source_url?: string;
  date_posted?: string;
  min_annual_salary_usd?: number | null;
  max_annual_salary_usd?: number | null;
  remote?: boolean;
  hybrid?: boolean;
}

interface SmartRecruitersPosting {
  id?: string;
  uuid?: string;
  name?: string;
  releasedDate?: string;
  ref?: string;
  company?: { name?: string; identifier?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    remote?: boolean;
  };
  department?: { label?: string };
  function?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
}

interface SmartRecruitersPostingDetails extends SmartRecruitersPosting {
  applyUrl?: string;
  jobAd?: {
    sections?: Record<string, { title?: string; text?: string }>;
  };
}

interface ProfileSignal {
  term: string;
  label: string;
  kind: 'role' | 'skill' | 'major' | 'keyword';
  weight: number;
}

const SOURCE_TIMEOUT_MS = 6500;
const DAILY_REVALIDATE_SECONDS = 24 * 60 * 60;
const COMPANY_SITE_CRAWL_LIMIT = 24;
const COMPANY_SITE_SELECTED_LIMIT = 18;
const MAX_GENERAL_QUERY_VARIANTS = 6;

const NON_INTERNSHIP_TERMS = [
  'senior',
  'staff',
  'principal',
  'manager',
  'director',
  'lead ',
  'head of',
  'vp ',
  'vice president',
  'architect',
];

const HARD_NON_INTERNSHIP_TERMS = [
  'senior',
  'staff',
  'principal',
  'director',
  'head of',
  'vp ',
  'vice president',
  'architect',
];

const FULL_TIME_EXCLUSION_TERMS = [
  'full time',
  'full-time',
  'regular full time',
  'experienced',
  'experienced professional',
  'professional',
  'new grad',
  'new graduate',
  'graduate program',
  'graduate scheme',
  'university graduate',
  'rotational program',
  'leadership development program',
  'early career full time',
  'entry level',
];

const US_COUNTRY_ALIASES = [
  'united states',
  'united states of america',
  'usa',
  'us',
  'u s',
  'u s a',
];

const NON_US_COUNTRY_MARKERS = [
  'argentina',
  'australia',
  'austria',
  'belgium',
  'brazil',
  'canada',
  'chile',
  'china',
  'colombia',
  'costa rica',
  'czech republic',
  'denmark',
  'finland',
  'france',
  'germany',
  'hong kong',
  'hungary',
  'india',
  'indonesia',
  'ireland',
  'israel',
  'italy',
  'japan',
  'malaysia',
  'mexico',
  'netherlands',
  'new zealand',
  'norway',
  'philippines',
  'poland',
  'portugal',
  'romania',
  'singapore',
  'south africa',
  'south korea',
  'spain',
  'sweden',
  'switzerland',
  'taiwan',
  'thailand',
  'turkey',
  'united arab emirates',
  'united kingdom',
  'vietnam',
];

const NON_US_COUNTRY_CODES = new Set([
  'ae',
  'ar',
  'at',
  'au',
  'be',
  'br',
  'ca',
  'ch',
  'cl',
  'cn',
  'co',
  'cr',
  'cz',
  'de',
  'dk',
  'es',
  'fi',
  'fr',
  'gb',
  'hk',
  'hu',
  'id',
  'ie',
  'il',
  'in',
  'it',
  'jp',
  'kr',
  'mx',
  'my',
  'nl',
  'no',
  'nz',
  'ph',
  'pl',
  'pt',
  'ro',
  'se',
  'sg',
  'th',
  'tr',
  'tw',
  'uk',
  'vn',
  'za',
]);

const US_STATE_ALIASES: Record<string, string[]> = {
  alabama: ['alabama', 'al'],
  alaska: ['alaska', 'ak'],
  arizona: ['arizona', 'az'],
  arkansas: ['arkansas', 'ar'],
  california: ['california', 'ca'],
  colorado: ['colorado', 'co'],
  connecticut: ['connecticut', 'ct'],
  delaware: ['delaware', 'de'],
  florida: ['florida', 'fl'],
  georgia: ['georgia', 'ga'],
  hawaii: ['hawaii', 'hi'],
  idaho: ['idaho', 'id'],
  illinois: ['illinois', 'il'],
  indiana: ['indiana', 'in'],
  iowa: ['iowa', 'ia'],
  kansas: ['kansas', 'ks'],
  kentucky: ['kentucky', 'ky'],
  louisiana: ['louisiana', 'la'],
  maine: ['maine', 'me'],
  maryland: ['maryland', 'md'],
  massachusetts: ['massachusetts', 'ma'],
  michigan: ['michigan', 'mi'],
  minnesota: ['minnesota', 'mn'],
  mississippi: ['mississippi', 'ms'],
  missouri: ['missouri', 'mo'],
  montana: ['montana', 'mt'],
  nebraska: ['nebraska', 'ne'],
  nevada: ['nevada', 'nv'],
  'new hampshire': ['new hampshire', 'nh'],
  'new jersey': ['new jersey', 'nj'],
  'new mexico': ['new mexico', 'nm'],
  'new york': ['new york', 'ny'],
  'north carolina': ['north carolina', 'nc'],
  'north dakota': ['north dakota', 'nd'],
  ohio: ['ohio', 'oh'],
  oklahoma: ['oklahoma', 'ok'],
  oregon: ['oregon', 'or'],
  pennsylvania: ['pennsylvania', 'pa'],
  'rhode island': ['rhode island', 'ri'],
  'south carolina': ['south carolina', 'sc'],
  'south dakota': ['south dakota', 'sd'],
  tennessee: ['tennessee', 'tn'],
  texas: ['texas', 'tx'],
  utah: ['utah', 'ut'],
  vermont: ['vermont', 'vt'],
  virginia: ['virginia', 'va'],
  washington: ['washington', 'wa'],
  'west virginia': ['west virginia', 'wv'],
  wisconsin: ['wisconsin', 'wi'],
  wyoming: ['wyoming', 'wy'],
  'district of columbia': ['district of columbia', 'washington dc', 'washington d c', 'dc', 'd c'],
};

const BOARD_SEARCH_SITES = [
  'boards.greenhouse.io',
  'jobs.lever.co',
  'jobs.ashbyhq.com',
  'jobs.smartrecruiters.com',
  'myworkdayjobs.com',
  'eightfold.ai',
  'amazon.jobs',
  'apply.careers.microsoft.com',
  'careers.google.com',
  'jobs.apple.com',
  'metacareers.com',
];

const TEMPORARILY_DISABLED_RESULT_HOSTS = ['linkedin.com', 'indeed.com'];
const THIRD_PARTY_BOARD_HOSTS = ['glassdoor.com', 'joinhandshake.com'];
const COMPANY_CAREER_HOSTS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'smartrecruiters.com',
  'myworkdayjobs.com',
  'eightfold.ai',
  'amazon.jobs',
  'careers.microsoft.com',
  'apply.careers.microsoft.com',
  'careers.google.com',
  'jobs.apple.com',
  'metacareers.com',
];

const EARLY_CAREER_PATHS = [
  'internships',
  'internship',
  'students',
  'student-programs',
  'student-opportunities',
  'university',
  'university-programs',
  'university-recruiting',
  'campus',
  'campus-recruiting',
  'early-career',
  'early-careers',
  'graduates',
  'college',
];

const SOURCE_QUALITY: Record<InternshipSource, number> = {
  Adzuna: 2,
  Greenhouse: 17,
  Lever: 17,
  Ashby: 17,
  SmartRecruiters: 17,
  'Company Site': 19,
  'Google Jobs': 5,
  TheirStack: 18,
  'Web Search': -4,
};

const PROFILE_STOP_TERMS = new Set([
  'ability',
  'academic',
  'activities',
  'and',
  'assistant',
  'based',
  'business',
  'campus',
  'club',
  'college',
  'communication',
  'course',
  'courses',
  'education',
  'experience',
  'for',
  'from',
  'gpa',
  'high',
  'intern',
  'internship',
  'leadership',
  'member',
  'project',
  'projects',
  'relevant',
  'resume',
  'school',
  'skills',
  'student',
  'team',
  'university',
  'using',
  'with',
  'work',
]);

const RESUME_SIGNAL_CATALOG: Array<{
  label: string;
  kind: ProfileSignal['kind'];
  weight: number;
  terms: string[];
}> = [
  {
    label: 'Software Engineering',
    kind: 'role',
    weight: 5,
    terms: [
      'software engineer',
      'software engineering',
      'developer',
      'full stack',
      'frontend',
      'backend',
      'data structures',
      'algorithms',
    ],
  },
  {
    label: 'Data Science',
    kind: 'role',
    weight: 5,
    terms: ['data science', 'data scientist', 'data analyst', 'analytics', 'statistical modeling'],
  },
  {
    label: 'Machine Learning',
    kind: 'role',
    weight: 5,
    terms: [
      'machine learning',
      'deep learning',
      'artificial intelligence',
      'neural network',
      'nlp',
      'computer vision',
    ],
  },
  {
    label: 'Product Management',
    kind: 'role',
    weight: 5,
    terms: [
      'product management',
      'product manager',
      'product roadmap',
      'user research',
      'go to market',
    ],
  },
  {
    label: 'Finance',
    kind: 'role',
    weight: 5,
    terms: [
      'financial analyst',
      'finance',
      'investment banking',
      'valuation',
      'portfolio',
      'accounting',
    ],
  },
  {
    label: 'Consulting',
    kind: 'role',
    weight: 5,
    terms: ['consulting', 'consultant', 'strategy', 'case competition', 'business analyst'],
  },
  {
    label: 'Marketing',
    kind: 'role',
    weight: 4,
    terms: ['marketing', 'growth', 'social media', 'brand', 'content strategy'],
  },
  {
    label: 'Design',
    kind: 'role',
    weight: 4,
    terms: ['product design', 'ux', 'ui', 'user experience', 'figma'],
  },
  {
    label: 'Cybersecurity',
    kind: 'role',
    weight: 5,
    terms: ['cybersecurity', 'cyber security', 'security analyst', 'information security'],
  },
  {
    label: 'Mechanical Engineering',
    kind: 'role',
    weight: 5,
    terms: ['mechanical engineering', 'solidworks', 'manufacturing', 'cad'],
  },
  {
    label: 'Electrical Engineering',
    kind: 'role',
    weight: 5,
    terms: ['electrical engineering', 'circuit', 'embedded systems', 'semiconductor'],
  },
  {
    label: 'Operations',
    kind: 'role',
    weight: 4,
    terms: ['operations', 'supply chain', 'logistics', 'process improvement'],
  },
  { label: 'Python', kind: 'skill', weight: 4, terms: ['python'] },
  { label: 'Java', kind: 'skill', weight: 4, terms: ['java'] },
  { label: 'JavaScript', kind: 'skill', weight: 4, terms: ['javascript', 'node.js', 'node js'] },
  { label: 'TypeScript', kind: 'skill', weight: 4, terms: ['typescript'] },
  { label: 'React', kind: 'skill', weight: 4, terms: ['react', 'next.js', 'nextjs'] },
  { label: 'SQL', kind: 'skill', weight: 4, terms: ['sql', 'postgresql', 'mysql'] },
  { label: 'C++', kind: 'skill', weight: 4, terms: ['c++', 'cpp'] },
  { label: 'C#', kind: 'skill', weight: 4, terms: ['c#', 'c sharp'] },
  { label: 'R', kind: 'skill', weight: 3, terms: ['r studio', 'rstudio', ' r '] },
  { label: 'Excel', kind: 'skill', weight: 3, terms: ['excel', 'vlookup', 'pivot table'] },
  { label: 'Tableau', kind: 'skill', weight: 3, terms: ['tableau'] },
  { label: 'Power BI', kind: 'skill', weight: 3, terms: ['power bi'] },
  { label: 'AWS', kind: 'skill', weight: 3, terms: ['aws', 'amazon web services'] },
  { label: 'Azure', kind: 'skill', weight: 3, terms: ['azure'] },
  { label: 'Google Cloud', kind: 'skill', weight: 3, terms: ['google cloud', 'gcp'] },
  { label: 'Docker', kind: 'skill', weight: 3, terms: ['docker'] },
  { label: 'Git', kind: 'skill', weight: 3, terms: ['git', 'github'] },
  { label: 'TensorFlow', kind: 'skill', weight: 3, terms: ['tensorflow'] },
  { label: 'PyTorch', kind: 'skill', weight: 3, terms: ['pytorch'] },
  { label: 'Pandas', kind: 'skill', weight: 3, terms: ['pandas'] },
  { label: 'Figma', kind: 'skill', weight: 3, terms: ['figma'] },
  { label: 'MATLAB', kind: 'skill', weight: 3, terms: ['matlab'] },
  { label: 'SolidWorks', kind: 'skill', weight: 3, terms: ['solidworks'] },
  { label: 'AutoCAD', kind: 'skill', weight: 3, terms: ['autocad'] },
];

function withTimeout<T>(promise: Promise<T>, timeoutMs = SOURCE_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Search source timed out')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function fetchJson<T>(url: string, cacheDaily = true): Promise<T | null> {
  try {
    const res = await withTimeout(
      fetch(url, {
        ...(cacheDaily
          ? { next: { revalidate: DAILY_REVALIDATE_SECONDS } }
          : { cache: 'no-store' }),
        headers: {
          accept: 'application/json',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      }),
    );
    if (!res.ok) return null;
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await withTimeout(
      fetch(url, {
        cache: 'no-store',
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent':
            'Mozilla/5.0 (compatible; InternAIJobSearch/1.0; +https://internai-vercel-ready.vercel.app)',
        },
      }),
    );
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml') &&
      !contentType.includes('text/xml') &&
      !contentType.includes('application/xml') &&
      !contentType.includes('text/plain')
    ) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

function stripHtml(input?: string | null): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function decodeHtml(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuery(
  query: string,
  company?: string | null,
  season?: SearchOptions['season'],
): string {
  const cleaned = query.replace(/\binternships?\b/gi, '').trim();
  const seasonTerm = season ? `${season} ` : '';
  const companyTerm = company?.trim();
  if (companyTerm) {
    return `${seasonTerm}${cleaned || 'internship'} ${companyTerm} internship`.trim();
  }
  return `${seasonTerm}${cleaned || 'software'} internship`.trim();
}

function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesNormalizedTerm(haystack: string, term: string): boolean {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.length <= 2 || /^[a-z][+#]?$/.test(normalizedTerm)) {
    return new RegExp(`(?:^|\\s)${escapeRegex(normalizedTerm)}(?:\\s|$)`).test(haystack);
  }
  return haystack.includes(normalizedTerm);
}

function normalizeLocationText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationTokens(text: string): Set<string> {
  return new Set(normalizeLocationText(text).split(/\s+/).filter(Boolean));
}

function containsLocationAlias(normalizedValue: string, alias: string): boolean {
  const normalizedAlias = normalizeLocationText(alias);
  if (!normalizedAlias) return false;
  if (normalizedAlias.length <= 2) {
    return locationTokens(normalizedValue).has(normalizedAlias);
  }
  return normalizedValue === normalizedAlias || normalizedValue.includes(normalizedAlias);
}

function isUsLocationFilter(filter: string): boolean {
  const normalizedFilter = normalizeLocationText(filter);
  return (
    normalizedFilter === 'america' ||
    US_COUNTRY_ALIASES.some((alias) => normalizeLocationText(alias) === normalizedFilter)
  );
}

function stateAliasesForFilter(filter: string): string[] {
  const normalizedFilter = normalizeLocationText(filter);
  for (const aliases of Object.values(US_STATE_ALIASES)) {
    if (aliases.some((alias) => normalizeLocationText(alias) === normalizedFilter)) {
      return aliases;
    }
  }
  return [];
}

function locationAliasesForFilter(filter: string): string[] {
  if (isUsLocationFilter(filter)) {
    return [
      ...US_COUNTRY_ALIASES,
      ...Object.values(US_STATE_ALIASES)
        .flat()
        .filter((alias) => normalizeLocationText(alias).length > 2),
      'remote',
      'remote us',
      'remote usa',
      'remote united states',
    ];
  }

  return [filter, ...stateAliasesForFilter(filter)];
}

function hasUsStateAbbreviation(location: string): boolean {
  const stateAbbreviations = Object.values(US_STATE_ALIASES)
    .flat()
    .map((alias) => normalizeLocationText(alias))
    .filter((alias) => alias.length === 2 && alias !== 'in');

  return stateAbbreviations.some((abbr) => {
    const pattern = new RegExp(`(?:^|,\\s*)${abbr}(?:\\s*,|$)`, 'i');
    return pattern.test(location);
  });
}

export function matchesLocationFilter(
  location: string,
  filter?: string | null,
  modality?: InternshipSearchResult['modality'],
): boolean {
  if (!filter?.trim()) return true;
  const normalizedFilter = normalizeLocationText(filter);
  if (!normalizedFilter) return true;

  const normalizedLocation = normalizeLocationText(location);
  if (normalizedFilter === 'remote') {
    return modality === 'remote' || containsLocationAlias(normalizedLocation, 'remote');
  }
  if (isUsLocationFilter(filter)) {
    const hasUsSignal =
      US_COUNTRY_ALIASES.some((alias) => containsLocationAlias(normalizedLocation, alias)) ||
      Object.values(US_STATE_ALIASES)
        .flat()
        .filter((alias) => normalizeLocationText(alias).length > 2)
        .some((alias) => containsLocationAlias(normalizedLocation, alias)) ||
      hasUsStateAbbreviation(location);
    if (hasUsSignal) return true;

    const hasExplicitForeignCountry = NON_US_COUNTRY_MARKERS.some((country) =>
      containsLocationAlias(normalizedLocation, country),
    );
    const locationPrefix = location
      .trim()
      .toLowerCase()
      .match(/^([a-z]{2})[-,:]/)?.[1];
    const hasExplicitForeignCountryCode = Boolean(
      locationPrefix && NON_US_COUNTRY_CODES.has(locationPrefix),
    );
    if (hasExplicitForeignCountry || hasExplicitForeignCountryCode) return false;
    return true;
  }

  return locationAliasesForFilter(filter).some((alias) =>
    containsLocationAlias(normalizedLocation, alias),
  );
}

function providerLocationFilter(location?: string | null): string | null {
  if (!location?.trim()) return null;
  if (isUsLocationFilter(location) || normalizeLocationText(location) === 'remote') return null;

  const stateAliases = stateAliasesForFilter(location);
  const stateName = Object.entries(US_STATE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => stateAliases.includes(alias)),
  )?.[0];
  return stateName ?? location.trim();
}

function roleAliases(term: string): string[] {
  const aliases: Record<string, string[]> = {
    swe: ['software engineer', 'software engineering', 'developer', 'programmer'],
    software: ['software engineer', 'software engineering', 'developer', 'programmer'],
    frontend: ['front end', 'front-end', 'react', 'web'],
    backend: ['back end', 'back-end', 'server', 'api'],
    fullstack: ['full stack', 'full-stack'],
    ml: ['machine learning', 'ai', 'artificial intelligence'],
    ai: ['machine learning', 'artificial intelligence', 'ml'],
    data: ['data science', 'data analyst', 'analytics'],
    product: ['product manager', 'product management', 'pm'],
    marketing: ['growth', 'social media', 'brand', 'communications'],
    finance: ['financial analyst', 'investment', 'accounting'],
    design: ['product design', 'ux', 'ui'],
    business: ['business analyst', 'strategy', 'operations'],
    consulting: ['consultant', 'strategy', 'business analyst'],
    operations: ['supply chain', 'logistics', 'program management'],
    accounting: ['audit', 'tax', 'finance'],
    cybersecurity: ['security', 'information security', 'cyber security'],
    mechanical: ['mechanical engineering', 'manufacturing', 'hardware'],
    electrical: ['electrical engineering', 'hardware', 'semiconductor'],
    biomedical: ['biomedical engineering', 'medical device', 'research'],
    healthcare: ['health', 'clinical', 'life sciences'],
    sales: ['business development', 'account executive', 'customer success'],
  };
  return aliases[term] ?? [];
}

function termsFor(query: string): string[] {
  const baseTerms = normalizeText(query)
    .split(/\s+/)
    .filter(
      (term) =>
        term.length > 2 &&
        !['the', 'and', 'for', 'with', 'intern', 'internship', 'remote', 'hybrid'].includes(term),
    );
  return [...new Set(baseTerms.flatMap((term) => [term, ...roleAliases(term)]))];
}

function queryWithSeason(query: string, season?: SearchOptions['season']): string {
  if (!season) return query;
  const normalized = normalizeText(query);
  return normalized.includes(season) ? query : `${season} ${query}`.trim();
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    const key = normalizeText(cleaned);
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }
  return output;
}

function generalQueryVariants(query: string, season?: SearchOptions['season']): string[] {
  const base = query.trim() || 'internship';
  const seasonal = season ? queryWithSeason(base, season) : '';
  const hasSpecificIntent = termsFor(base).length > 0;
  return uniqueNormalized([
    seasonal,
    base,
    normalizeQuery(base),
    ...queryVariants(base),
    ...(hasSpecificIntent ? ['internship'] : []),
    ...(season && !hasSpecificIntent ? [`${season} internship`, `${season} intern`] : []),
  ]).slice(0, MAX_GENERAL_QUERY_VARIANTS);
}

function seasonTerms(season?: SearchOptions['season']): string[] {
  if (season === 'summer') {
    return [
      'summer',
      'summer internship',
      'summer intern',
      'may',
      'june',
      'jun',
      'july',
      'jul',
      'august',
      'aug',
    ];
  }
  if (season === 'fall') {
    return [
      'fall',
      'fall internship',
      'fall intern',
      'autumn',
      'september',
      'sept',
      'sep',
      'october',
      'oct',
      'november',
      'nov',
      'december',
      'dec',
    ];
  }
  return [];
}

function hasSeasonSignal(
  result: Omit<InternshipSearchResult, 'matchScore'>,
  season?: SearchOptions['season'],
): boolean {
  if (!season) return false;
  const haystack = normalizeText(`${result.title} ${result.description ?? ''} ${result.applyUrl}`);
  return seasonTerms(season).some((term) => haystack.includes(normalizeText(term)));
}

function seasonSignalForResult(
  result: Omit<InternshipSearchResult, 'matchScore' | 'seasonMatch'>,
): 'summer' | 'fall' | undefined {
  if (hasSeasonSignal(result, 'summer')) return 'summer';
  if (hasSeasonSignal(result, 'fall')) return 'fall';
  return undefined;
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function splitProfileList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;\n|]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function addProfileSignal(
  signals: Map<string, ProfileSignal>,
  term: string,
  label: string,
  kind: ProfileSignal['kind'],
  weight: number,
) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm || PROFILE_STOP_TERMS.has(normalizedTerm)) return;
  if (normalizedTerm.length <= 2 && !['ai', 'ml', 'ux', 'ui', 'r'].includes(normalizedTerm)) return;

  const current = signals.get(normalizedTerm);
  if (!current || weight > current.weight) {
    signals.set(normalizedTerm, { term: normalizedTerm, label, kind, weight });
  }
}

function profileSignalsFor(profile?: SearchProfile | null): ProfileSignal[] {
  if (!profile) return [];

  const signals = new Map<string, ProfileSignal>();

  for (const role of splitProfileList(profile.targetRoles)) {
    addProfileSignal(signals, role, role, 'role', 7);
    for (const term of termsFor(role)) {
      addProfileSignal(signals, term, role, 'role', 5);
    }
  }

  for (const skill of splitProfileList(profile.skills)) {
    addProfileSignal(signals, skill, skill, 'skill', 6);
  }

  for (const keyword of splitProfileList(profile.jobKeywords)) {
    addProfileSignal(signals, keyword, keyword, 'keyword', 5);
    for (const term of termsFor(keyword)) {
      addProfileSignal(signals, term, keyword, 'keyword', 4);
    }
  }

  if (profile.major) {
    addProfileSignal(signals, profile.major, profile.major, 'major', 4);
    const major = normalizeText(profile.major);
    if (major.includes('computer science') || major.includes('software')) {
      addProfileSignal(signals, 'software engineering', 'Computer Science', 'role', 4);
      addProfileSignal(signals, 'data science', 'Computer Science', 'role', 3);
    }
    if (major.includes('finance') || major.includes('accounting') || major.includes('economics')) {
      addProfileSignal(signals, 'finance', profile.major, 'role', 4);
      addProfileSignal(signals, 'financial analyst', profile.major, 'role', 4);
    }
    if (major.includes('marketing') || major.includes('communications')) {
      addProfileSignal(signals, 'marketing', profile.major, 'role', 4);
    }
    if (major.includes('mechanical')) {
      addProfileSignal(signals, 'mechanical engineering', profile.major, 'role', 4);
    }
    if (major.includes('electrical')) {
      addProfileSignal(signals, 'electrical engineering', profile.major, 'role', 4);
    }
  }

  const resumeHaystack = normalizeText(profile.resumeText ?? '');
  if (resumeHaystack) {
    for (const catalogItem of RESUME_SIGNAL_CATALOG) {
      if (catalogItem.terms.some((term) => includesNormalizedTerm(resumeHaystack, term))) {
        addProfileSignal(
          signals,
          catalogItem.label,
          catalogItem.label,
          catalogItem.kind,
          catalogItem.weight,
        );
        for (const term of catalogItem.terms.slice(0, 3)) {
          addProfileSignal(
            signals,
            term,
            catalogItem.label,
            catalogItem.kind,
            catalogItem.weight - 1,
          );
        }
      }
    }
  }

  return [...signals.values()]
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
    .slice(0, 60);
}

function profileLocationTerms(profile?: SearchProfile | null): string[] {
  return splitProfileList(profile?.targetLocations).slice(0, 12);
}

function fitReasonsForResult(
  result: Omit<InternshipSearchResult, 'matchScore' | 'fitReasons'>,
  profileSignals: ProfileSignal[],
  profile?: SearchProfile | null,
): string[] {
  if (!profile) return [];
  const title = normalizeText(result.title);
  const location = result.location;
  const haystack = normalizeText(
    `${result.title} ${result.description ?? ''} ${result.company} ${result.location}`,
  );
  const reasons: string[] = [];

  const skillMatches = profileSignals
    .filter((signal) => signal.kind === 'skill' && includesNormalizedTerm(haystack, signal.term))
    .map((signal) => signal.label)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 3);
  if (skillMatches.length > 0) {
    reasons.push(`Matches skills from your profile/resume: ${skillMatches.join(', ')}`);
  }

  const roleMatches = profileSignals
    .filter(
      (signal) =>
        (signal.kind === 'role' || signal.kind === 'keyword') &&
        (includesNormalizedTerm(title, signal.term) ||
          includesNormalizedTerm(haystack, signal.term)),
    )
    .map((signal) => signal.label)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .slice(0, 2);
  if (roleMatches.length > 0) {
    reasons.push(`Aligned with your target role: ${roleMatches.join(', ')}`);
  }

  if (profile.major && includesNormalizedTerm(haystack, profile.major)) {
    reasons.push(`Relevant to your major: ${profile.major}`);
  }

  const locationMatches = profileLocationTerms(profile)
    .filter((term) => matchesLocationFilter(location, term, result.modality))
    .slice(0, 2);
  if (locationMatches.length > 0) {
    reasons.push(`Matches preferred location: ${locationMatches.join(', ')}`);
  }

  const keywordMatches = profileSignals
    .filter((signal) => includesNormalizedTerm(haystack, signal.term))
    .map((signal) => signal.label)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .filter((label) => !skillMatches.includes(label) && !roleMatches.includes(label))
    .slice(0, 3);
  if (reasons.length === 0 && keywordMatches.length > 0) {
    reasons.push(`Matches profile keywords: ${keywordMatches.join(', ')}`);
  }

  return reasons.slice(0, 3);
}

function containsRoleSignal(text: string, queryTerms: string[]): boolean {
  if (queryTerms.length === 0) return true;
  const normalized = normalizeText(text);
  return queryTerms.some((term) => includesNormalizedTerm(normalized, term));
}

function queryVariants(query: string): string[] {
  const normalized = normalizeText(query);
  const hasSpecificIntent = termsFor(query).length > 0;
  const variants = new Set<string>([query, normalizeQuery(query)]);
  if (!hasSpecificIntent) variants.add('internship');
  if (/\bswe\b|\bsoftware\b|\bengineer(ing)?\b|\bdeveloper\b/.test(normalized)) {
    variants.add('software internship');
    variants.add('software engineering internship');
    variants.add('software development engineer internship');
    variants.add('sde internship');
  }
  if (/\bdata\b|\banalytics?\b/.test(normalized)) {
    variants.add('data science internship');
    variants.add('data analyst internship');
    variants.add('analytics internship');
  }
  if (/\bai\b|\bml\b|\bmachine learning\b/.test(normalized)) {
    variants.add('machine learning internship');
    variants.add('ai internship');
  }
  if (/\bproduct\b|\bpm\b/.test(normalized)) {
    variants.add('product management internship');
    variants.add('product manager internship');
  }
  if (/\bfinance\b|\bfinancial\b|\binvestment\b/.test(normalized)) {
    variants.add('finance internship');
    variants.add('financial analyst internship');
  }
  return [...variants].filter(Boolean);
}

function internshipFocusedQueryVariants(query: string): string[] {
  const base = query.trim() || 'internship';
  const role = base.replace(/\binternships?\b/gi, '').trim();
  return uniqueNormalized([
    ...queryVariants(base),
    normalizeQuery(base),
    role ? `${role} internship` : 'internship',
    role ? `${role} intern` : 'intern',
    role ? `${role} co-op` : 'co-op',
    role ? `student ${role} internship` : 'student internship',
    role ? `university ${role} internship` : 'university internship',
    role ? `campus ${role} internship` : 'campus internship',
    role ? `early career ${role} internship` : 'early career internship',
    role ? `summer ${role} internship` : 'summer internship',
    role ? `fall ${role} internship` : 'fall internship',
    ...(termsFor(base).some((term) => ['finance', 'financial analyst', 'investment'].includes(term))
      ? ['summer analyst internship', 'summer analyst program', 'investment banking summer analyst']
      : []),
  ]).slice(0, 8);
}

function hasInternshipSignal(text: string): boolean {
  return (
    /\binterns?\b|\binternship(s)?\b/.test(text) ||
    /\bco[\s-]?op\b/.test(text) ||
    /\bstudent\s+researcher\b/.test(text) ||
    /\bstudent\b|\buniversity\b|\bcampus\b/.test(text) ||
    /\bapprentice(ship)?\b/.test(text) ||
    /\b(summer|fall|spring|winter)\s+(analyst|associate)\b/.test(text) ||
    /\b(student|university|campus)\s+(program|trainee|analyst|associate)\b/.test(text) ||
    /\bplacement\s+(year|student)\b|\bindustrial\s+placement\b/.test(text)
  );
}

function hasStrongInternshipSignal(text: string): boolean {
  return (
    /\binterns?\b|\binternship(s)?\b/.test(text) ||
    /\bco[\s-]?op\b/.test(text) ||
    /\bstudent\s+researcher\b/.test(text) ||
    /\bapprentice(ship)?\b/.test(text) ||
    /\b(summer|fall|spring|winter)\s+(analyst|associate)\b/.test(text)
  );
}

function postingUrlText(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return normalizeText(`${url.hostname} ${decodeURIComponent(url.pathname)}`);
  } catch {
    return normalizeText(rawUrl.split(/[?#]/)[0] ?? '');
  }
}

export function hasExplicitInternshipListingSignal(
  result: Omit<InternshipSearchResult, 'matchScore'>,
): boolean {
  const title = normalizeText(result.title);
  const applyUrl = postingUrlText(result.applyUrl);
  const description = normalizeText(result.description ?? '');
  const primary = `${title} ${applyUrl}`;
  const allText = `${primary} ${description}`;

  if (hasStrongInternshipSignal(primary)) return true;
  if (/\bstudent\s+researcher\b/.test(primary)) return true;
  if (
    /\b(student|university|campus)\s+(intern|internship|trainee|analyst|associate)\b/.test(primary)
  ) {
    return true;
  }
  if (/\b(summer|fall|spring|winter)\s+(analyst|associate|program)\b/.test(primary)) return true;
  if (/\bplacement\s+(year|student)\b|\bindustrial\s+placement\b/.test(primary)) return true;

  const urlLooksEarlyCareer =
    /\b(internships?|students?|university|campus|early[-\s]?career|college|graduates?)\b/.test(
      applyUrl,
    );
  return urlLooksEarlyCareer && hasStrongInternshipSignal(allText);
}

function hasFullTimeCareerSignal(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  const title = normalizeText(result.title);
  const applyUrl = normalizeText(result.applyUrl);
  const description = normalizeText(result.description ?? '');
  const explicitInternship = hasExplicitInternshipListingSignal(result);
  const seniorSignal = containsAny(title, HARD_NON_INTERNSHIP_TERMS);
  const fullTimeSignal = FULL_TIME_EXCLUSION_TERMS.some(
    (term) => includesNormalizedTerm(title, term) || includesNormalizedTerm(applyUrl, term),
  );
  const descriptionFullTimeSignal =
    !explicitInternship &&
    FULL_TIME_EXCLUSION_TERMS.some((term) => includesNormalizedTerm(description, term));

  return seniorSignal || (!explicitInternship && fullTimeSignal) || descriptionFullTimeSignal;
}

function inferModality(text: string): 'remote' | 'hybrid' | 'on-site' {
  const lower = text.toLowerCase();
  if (lower.includes('remote')) return 'remote';
  if (lower.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function parseSalaryRange(text?: string): { salaryMin?: number; salaryMax?: number } {
  if (!text) return {};
  const matches = [...text.matchAll(/\$?\s?([0-9]{2,3}(?:,[0-9]{3})?|[0-9]{1,3})\s?k?/gi)]
    .map((match) => {
      const raw = (match[1] ?? '').replace(/,/g, '');
      const n = Number(raw);
      return text
        .slice(match.index ?? 0, (match.index ?? 0) + match[0].length)
        .toLowerCase()
        .includes('k')
        ? n * 1000
        : n;
    })
    .filter((n) => n >= 10);
  if (matches.length === 0) return {};
  return { salaryMin: Math.min(...matches), salaryMax: Math.max(...matches) };
}

function resultHost(result: Omit<InternshipSearchResult, 'matchScore'>): string | null {
  try {
    return new URL(result.applyUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isCompanyCareerResult(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  if (
    result.source === 'Greenhouse' ||
    result.source === 'Lever' ||
    result.source === 'Ashby' ||
    result.source === 'SmartRecruiters' ||
    result.source === 'Company Site'
  ) {
    return true;
  }

  const host = resultHost(result);
  if (!host) return false;
  return (
    hostMatches(host, COMPANY_CAREER_HOSTS) ||
    host.startsWith('careers.') ||
    host.startsWith('jobs.') ||
    host.startsWith('apply.')
  );
}

function isThirdPartyBoardResult(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  const host = resultHost(result);
  return Boolean(host && hostMatches(host, THIRD_PARTY_BOARD_HOSTS));
}

function scoreResult(
  result: Omit<InternshipSearchResult, 'matchScore'>,
  queryTerms: string[],
  filters: {
    location?: string | null;
    company?: string | null;
    season?: SearchOptions['season'];
    profileSignals?: ProfileSignal[];
    profileLocations?: string[];
  },
): number {
  const title = normalizeText(result.title);
  const company = normalizeText(result.company);
  const location = normalizeText(result.location);
  const description = normalizeText(result.description ?? '');
  const haystack = `${title} ${company} ${location} ${description}`;
  let score = 24 + (SOURCE_QUALITY[result.source] ?? 0);
  if (isCompanyCareerResult(result)) score += 14;
  if (isThirdPartyBoardResult(result)) score -= 8;

  const hasInternship = hasExplicitInternshipListingSignal(result);
  const hasStrongInternship = hasStrongInternshipSignal(haystack);
  if (hasStrongInternship) score += 30;
  else if (hasInternship) score += 18;
  if (/\bintern(ship)?\b/i.test(result.title)) score += 18;

  const matchedTerms = queryTerms.filter((term) => includesNormalizedTerm(haystack, term));
  const titleMatches = queryTerms.filter((term) => includesNormalizedTerm(title, term));
  if (matchedTerms.length > 0) {
    score += Math.min(22, matchedTerms.length * 6);
  }
  if (titleMatches.length > 0) {
    score += Math.min(30, titleMatches.length * 14);
  } else if (queryTerms.length > 0) {
    score -= 14;
  }

  if (matchesLocationFilter(result.location, filters.location, result.modality)) score += 18;
  if (filters.company && includesNormalizedTerm(company, filters.company)) score += 25;
  if (filters.season && hasSeasonSignal(result, filters.season)) score += 16;

  const profileSignals = filters.profileSignals ?? [];
  if (profileSignals.length > 0) {
    const titleProfileMatches = profileSignals.filter(
      (signal) =>
        (signal.kind === 'role' || signal.kind === 'keyword' || signal.kind === 'major') &&
        includesNormalizedTerm(title, signal.term),
    );
    const roleProfileMatches = profileSignals.filter(
      (signal) =>
        (signal.kind === 'role' || signal.kind === 'keyword' || signal.kind === 'major') &&
        includesNormalizedTerm(haystack, signal.term),
    );
    const skillProfileMatches = profileSignals.filter(
      (signal) => signal.kind === 'skill' && includesNormalizedTerm(haystack, signal.term),
    );

    score += Math.min(
      22,
      titleProfileMatches.reduce((sum, signal) => sum + signal.weight * 2, 0),
    );
    score += Math.min(
      16,
      roleProfileMatches.reduce((sum, signal) => sum + signal.weight, 0),
    );
    score += Math.min(
      14,
      skillProfileMatches.reduce((sum, signal) => sum + signal.weight, 0),
    );
    if (roleProfileMatches.length === 0 && skillProfileMatches.length === 0) score -= 6;
  }

  if (
    (filters.profileLocations ?? []).some((term) =>
      matchesLocationFilter(result.location, term, result.modality),
    )
  ) {
    score += 10;
  }
  if (result.modality === 'remote') score += 3;
  if (containsAny(haystack, NON_INTERNSHIP_TERMS)) score -= 34;
  if (!hasInternship) score -= 28;
  if (hasFullTimeCareerSignal(result)) score -= 50;
  if (result.source === 'Web Search' && titleMatches.length === 0) score -= 12;

  return Math.max(0, Math.min(100, score));
}

function isInternshipFocused(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  return hasExplicitInternshipListingSignal(result) && !hasFullTimeCareerSignal(result);
}

export function isActionablePosting(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  const title = normalizeText(result.title);
  if (
    /^(search|explore|find|view|learn|see)\b/.test(title) ||
    /^(internships?|early careers?|student programs?)$/.test(title) ||
    title.includes('internship experience') ||
    title.includes('graduate programs and internships')
  ) {
    return false;
  }

  try {
    const url = new URL(result.applyUrl);
    const normalizedUrl = normalizeText(`${url.hostname} ${url.pathname}`);
    const knownPostingHost =
      normalizedUrl.includes('myworkdayjobs') ||
      normalizedUrl.includes('jobs lever co') ||
      normalizedUrl.includes('greenhouse') ||
      normalizedUrl.includes('ashbyhq') ||
      normalizedUrl.includes('amazon jobs') ||
      normalizedUrl.includes('eightfold') ||
      normalizedUrl.includes('metacareers dejobs');
    const hasJobDetailPath = isLikelyIndividualPostingUrl(url);
    const looksLikeProgramPage =
      /career-areas|careerprograms|students|early-career|entry-level|internships$|universityinternship/i.test(
        url.pathname,
      );
    const looksLikeMediaPage = /\/(media|video|videos|blog|blogs|news)\//i.test(url.pathname);
    const explicitInternshipPosting = hasExplicitInternshipListingSignal(result);

    if (!hasJobDetailPath && (result.source === 'Company Site' || result.source === 'Web Search')) {
      return false;
    }
    if (looksLikeProgramPage && !explicitInternshipPosting && !knownPostingHost) return false;
    if (looksLikeMediaPage && !knownPostingHost && !hasJobDetailPath) return false;
  } catch {
    return false;
  }

  return true;
}

function matchesCompanyResult(
  result: Omit<InternshipSearchResult, 'matchScore'>,
  company?: string | null,
): boolean {
  if (!company?.trim()) return true;
  const normalizedCompany = normalizeText(company);
  const haystack = normalizeText(
    `${result.company} ${result.title} ${result.description ?? ''} ${result.applyUrl}`,
  );
  return haystack.includes(normalizedCompany);
}

function usesTemporarilyDisabledHost(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  const host = resultHost(result);
  return Boolean(host && hostMatches(host, TEMPORARILY_DISABLED_RESULT_HOSTS));
}

function isRelevantToSearch(
  result: Omit<InternshipSearchResult, 'matchScore'>,
  query: string,
  queryTerms: string[],
  company?: string | null,
): boolean {
  if (queryTerms.length === 0) return true;
  const haystack = `${result.title} ${result.description ?? ''} ${result.company} ${result.location}`;
  if (isProductManagementQuery(query)) return matchesRequestedRole(query, haystack);
  if (containsRoleSignal(haystack, queryTerms)) return true;

  const title = normalizeText(result.title);
  const isGenericInternship =
    /^(internship|intern|summer intern|fall intern|student program|early career)/i.test(title) ||
    title.includes('internship program');
  if (company && matchesCompanyResult(result, company) && isGenericInternship) return true;

  return false;
}

function shouldRequireRoleRelevance(result: Omit<InternshipSearchResult, 'matchScore'>): boolean {
  return (
    result.source === 'Adzuna' || result.source === 'Google Jobs' || result.source === 'Web Search'
  );
}

function companyNames(entry: CompanyDirectoryEntry): string[] {
  return [entry.name, ...(entry.aliases ?? [])];
}

function matchesCompanyEntry(entry: CompanyDirectoryEntry, company?: string | null): boolean {
  if (!company) return false;
  const normalizedCompany = normalizeText(company);
  return companyNames(entry).some((name) => {
    const normalizedName = normalizeText(name);
    return normalizedName.includes(normalizedCompany) || normalizedCompany.includes(normalizedName);
  });
}

function selectedCompanyEntries(company?: string | null): CompanyDirectoryEntry[] {
  if (!company) return [];
  return COMPANY_DIRECTORY.filter((entry) => matchesCompanyEntry(entry, company));
}

function toAbsoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function templateSearchUrl(template: string, query: string): string {
  const normalizedQuery = normalizeText(query).replace(/\s+/g, ' ').trim() || 'internship';
  return template
    .replaceAll('{query}', encodeURIComponent(normalizedQuery))
    .replaceAll('{queryPlus}', encodeURIComponent(normalizedQuery).replace(/%20/g, '+'));
}

function titleFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    for (const segment of [...segments].reverse()) {
      const raw = decodeURIComponent(segment)
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/^\d+[-_]/, '')
        .replace(/^[a-f0-9-]{12,}[-_]/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (
        raw &&
        !/^(job|jobs|details|apply|search|results|careers?|profile|job details)$/i.test(raw) &&
        !/^[a-f0-9]{12,}$/i.test(raw)
      ) {
        return raw.replace(/\b\w/g, (char) => char.toUpperCase());
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function isLikelyIndividualPostingUrl(url: URL): boolean {
  const segments = url.pathname.split('/').filter(Boolean);
  const genericSegments = new Set([
    'apply',
    'applications',
    'careers',
    'details',
    'find-jobs',
    'job-search',
    'jobs',
    'openings',
    'opportunities',
    'positions',
    'postings',
    'requisitions',
    'results',
    'search',
    'search-results',
  ]);

  if (
    /[?&](job|jobId|job_id|gh_jid|req|reqId|requisition|posting|position)=([^&]+)/i.test(url.search)
  ) {
    return true;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (
    (host.endsWith('lever.co') || host.endsWith('ashbyhq.com')) &&
    segments.length >= 2 &&
    !genericSegments.has((segments[1] ?? '').toLowerCase())
  ) {
    return true;
  }
  if (
    host.endsWith('smartrecruiters.com') &&
    segments.length >= 2 &&
    !genericSegments.has((segments[1] ?? '').toLowerCase())
  ) {
    return true;
  }

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = (segments[index] ?? '').toLowerCase();
    const next = (segments[index + 1] ?? '').toLowerCase();
    if (
      ['detail', 'details', 'job', 'jobs', 'position', 'positions', 'posting', 'postings'].includes(
        segment,
      ) &&
      next &&
      !genericSegments.has(next)
    ) {
      return true;
    }
    if (
      segment === 'results' &&
      next &&
      !genericSegments.has(next) &&
      /(?:\d{5,}|[a-f0-9-]{12,})/i.test(next)
    ) {
      return true;
    }
  }

  return false;
}

export function isSpecificJobUrl(url: string, careerUrl: string): boolean {
  try {
    const parsed = new URL(url);
    const career = new URL(careerUrl);
    const path = normalizeText(parsed.pathname);
    const careerPath = normalizeText(career.pathname);
    if (
      parsed.origin === career.origin &&
      path.replace(/\s/g, '') === careerPath.replace(/\s/g, '')
    ) {
      return false;
    }
    return isLikelyIndividualPostingUrl(parsed);
  } catch {
    return false;
  }
}

function companySiteSeedUrls(entry: CompanyDirectoryEntry, query: string): string[] {
  const role = query.replace(/\binternships?\b/gi, '').trim() || 'internship';
  const url = new URL(entry.careerUrl);
  const seeds = new Set<string>();
  const basePath = url.pathname.replace(/\/?$/, '/');
  const searchTerms = uniqueNormalized([
    ...internshipFocusedQueryVariants(query),
    'internship',
    'intern',
    'co-op',
    'student internship',
    'university internship',
    'campus internship',
    'early career internship',
    `${role} internship`,
  ]);
  for (const template of entry.searchUrls ?? []) {
    for (const term of searchTerms) {
      seeds.add(templateSearchUrl(template, term));
    }
  }

  for (const path of EARLY_CAREER_PATHS) {
    seeds.add(`${url.origin}/${path}`);
    seeds.add(`${url.origin}${basePath}${path}`);
  }

  for (const term of searchTerms) {
    const withQuery = new URL(entry.careerUrl);
    withQuery.searchParams.set('q', term);
    seeds.add(withQuery.toString());

    const withKeyword = new URL(entry.careerUrl);
    withKeyword.searchParams.set('keyword', term);
    seeds.add(withKeyword.toString());
  }
  seeds.add(`${url.origin}${url.pathname.replace(/\/?$/, '/')}jobs?keyword=internship`);
  seeds.add(`${url.origin}${url.pathname.replace(/\/?$/, '/')}search?keyword=internship`);
  seeds.add(entry.careerUrl);
  return [...seeds].slice(0, COMPANY_SITE_SELECTED_LIMIT);
}

function extractBalancedJson(input: string, valueStart: number): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = valueStart; index < input.length; index++) {
    const char = input[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) return input.slice(start, index + 1);
    }
  }
  return null;
}

function extractBaseUrl(html: string, pageUrl: string): string {
  const baseHref = html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1];
  return baseHref ? (toAbsoluteUrl(baseHref, pageUrl) ?? pageUrl) : pageUrl;
}

function isGenericAnchorText(text: string): boolean {
  return (
    !text ||
    /^(apply|apply now|view job|view details|see details|learn more|read more|see full role description)$/i.test(
      text,
    )
  );
}

function mapEmbeddedJob(
  job: Record<string, unknown>,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult | null {
  const title =
    stringValue(job.title) ??
    stringValue(job.jobTitle) ??
    stringValue(job.postingTitle) ??
    stringValue(job.name);
  const id =
    stringValue(job.jobId) ??
    stringValue(job.reqId) ??
    stringValue(job.req_id) ??
    stringValue(job.jobSeqNo) ??
    stringValue(job.id) ??
    title;
  const applyUrl =
    stringValue(job.applyUrl) ??
    stringValue(job.jobUrl) ??
    stringValue(job.url) ??
    stringValue(job.externalPath) ??
    (id
      ? toAbsoluteUrl(
          `/job/${id}/${titleFromUrl(String(id), title ?? 'internship')}`,
          entry.careerUrl,
        )
      : null);
  if (!title || !id || !applyUrl) return null;

  const location =
    stringValue(job.location) ??
    stringValue(job.cityStateCountry) ??
    stringValue(job.address) ??
    [stringValue(job.city), stringValue(job.state), stringValue(job.country)]
      .filter(Boolean)
      .join(', ') ??
    'See posting';
  const description =
    stringValue(job.descriptionTeaser) ??
    stringValue(job.description) ??
    stringValue((job.ml_job_parser as Record<string, unknown> | undefined)?.descriptionTeaser);

  return {
    id: stableId('Company Site', id, title, entry.name),
    title,
    company: entry.name,
    location: location || 'See posting',
    description: stripHtml(description) ?? `Found on ${entry.name}'s careers site.`,
    applyUrl,
    postedAt: normalizePostingDate(
      stringValue(job.postedDate) ?? stringValue(job.postDateInGMT) ?? stringValue(job.dateCreated),
    ),
    modality: inferModality(`${title} ${location} ${description ?? ''}`),
    source: 'Company Site',
  };
}

function extractEmbeddedCompanyResults(
  html: string,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult[] {
  const decoded = decodeHtml(html);
  const results: InternshipSearchResult[] = [];
  const phenomMarker = '"eagerLoadRefineSearch":';
  const phenomIndex = decoded.indexOf(phenomMarker);
  if (phenomIndex >= 0) {
    const rawJson = extractBalancedJson(decoded, phenomIndex + phenomMarker.length);
    if (rawJson) {
      try {
        const payload = JSON.parse(rawJson) as { data?: { jobs?: Array<Record<string, unknown>> } };
        for (const job of payload.data?.jobs ?? []) {
          const result = mapEmbeddedJob(job, entry);
          if (result) results.push(result);
        }
      } catch {
        // Ignore malformed vendor payloads and keep other sources alive.
      }
    }
  }
  return results;
}

function collectJobPostingObjects(
  value: unknown,
  results: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return results;
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostingObjects(item, results);
    return results;
  }

  const object = value as Record<string, unknown>;
  const type = object['@type'];
  const typeValues = Array.isArray(type) ? type : [type];
  if (typeValues.some((item) => typeof item === 'string' && item.toLowerCase() === 'jobposting')) {
    results.push(object);
  }

  for (const nested of Object.values(object)) {
    collectJobPostingObjects(nested, results);
  }
  return results;
}

function locationFromStructuredJob(value: unknown): string {
  const locations = Array.isArray(value) ? value : [value];
  return (
    locations
      .map((location) => {
        if (!location || typeof location !== 'object') return undefined;
        const address = (location as Record<string, unknown>).address;
        if (!address || typeof address !== 'object')
          return stringValue((location as Record<string, unknown>).name);
        const addressObject = address as Record<string, unknown>;
        return [
          stringValue(addressObject.addressLocality),
          stringValue(addressObject.addressRegion),
          stringValue(addressObject.addressCountry),
        ]
          .filter(Boolean)
          .join(', ');
      })
      .filter(Boolean)
      .join('; ') || 'See posting'
  );
}

function extractStructuredJobResults(
  html: string,
  pageUrl: string,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult[] {
  const results: InternshipSearchResult[] = [];
  const scriptPattern =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while (true) {
    match = scriptPattern.exec(html);
    if (match === null) break;
    try {
      const json = JSON.parse(decodeHtml(match[1] ?? ''));
      for (const job of collectJobPostingObjects(json)) {
        const title = stringValue(job.title);
        if (!title) continue;
        const applyUrl = stringValue(job.url) ?? pageUrl;
        results.push({
          id: stableId('Company Site', applyUrl, title, entry.name),
          title,
          company: entry.name,
          location: locationFromStructuredJob(job.jobLocation),
          description:
            stripHtml(stringValue(job.description)) ?? `Found on ${entry.name}'s careers site.`,
          applyUrl: toAbsoluteUrl(applyUrl, pageUrl) ?? pageUrl,
          postedAt: normalizePostingDate(stringValue(job.datePosted)),
          modality: inferModality(`${title} ${stringValue(job.description) ?? ''}`),
          source: 'Company Site',
        });
      }
    } catch {
      // Ignore malformed JSON-LD blocks and continue with other extractors.
    }
  }

  return results;
}

function extractCompanySiteResults(
  html: string,
  pageUrl: string,
  entry: CompanyDirectoryEntry,
  queryTerms: string[],
): InternshipSearchResult[] {
  const results: InternshipSearchResult[] = [];
  const seenUrls = new Set<string>();
  const effectiveBaseUrl = extractBaseUrl(html, pageUrl);
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while (true) {
    match = anchorPattern.exec(html);
    if (match === null) break;
    const href = match[1] ?? '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
      continue;
    const applyUrl = toAbsoluteUrl(decodeHtml(href), effectiveBaseUrl);
    if (!applyUrl || seenUrls.has(applyUrl)) continue;
    if (!isSpecificJobUrl(applyUrl, entry.careerUrl)) continue;

    const anchorText = decodeHtml(stripHtml(match[2]) ?? '');
    const urlText = postingUrlText(applyUrl);
    const haystack = `${anchorText} ${urlText}`;
    if (!hasInternshipSignal(normalizeText(haystack))) continue;
    if (!containsRoleSignal(haystack, queryTerms)) continue;

    const title = isGenericAnchorText(anchorText)
      ? titleFromUrl(applyUrl, `${entry.name} internship`)
      : anchorText;
    seenUrls.add(applyUrl);
    results.push({
      id: stableId('Company Site', applyUrl, title, entry.name),
      title: title.slice(0, 140),
      company: entry.name,
      location: 'See posting',
      description: `Found on ${entry.name}'s careers site.`,
      applyUrl,
      postedAt: null,
      modality: inferModality(haystack),
      source: 'Company Site',
    });
  }

  return results;
}

function extractGoogleCareerResults(
  html: string,
  pageUrl: string,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult[] {
  if (!matchesCompanyEntry(entry, 'Google')) return [];

  const effectiveBaseUrl = extractBaseUrl(html, pageUrl);
  const starts = [...html.matchAll(/<li\b[^>]*class=["'][^"']*\blLd3Je\b[^"']*["'][^>]*>/gi)].map(
    (match) => match.index ?? 0,
  );
  const results: InternshipSearchResult[] = [];

  for (const [index, start] of starts.entries()) {
    const end = starts[index + 1] ?? html.length;
    const block = html.slice(start, end);
    const id =
      block.match(/\bssk=["']18:([^"']+)["']/i)?.[1] ??
      block.match(/\bjsdata=["'][^;"']+;([^;"']+);/i)?.[1] ??
      block.match(/jobs\/results\/(\d+)-/i)?.[1];
    const title = stripHtml(
      block.match(/<h3\b[^>]*class=["'][^"']*\bQJPWVe\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1],
    );
    const href = block.match(
      /<a\b[^>]*class=["'][^"']*\bWpHeLc\b[^"']*["'][^>]*href=["']([^"']+)["']/i,
    )?.[1];
    if (!id || !title || !href) continue;

    const applyUrl = toAbsoluteUrl(decodeHtml(href), effectiveBaseUrl);
    if (!applyUrl) continue;

    const locations = [
      ...block.matchAll(
        /<span\b[^>]*class=["'][^"']*\br0wTof\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
      ),
    ]
      .map((match) => stripHtml(match[1]))
      .filter((value): value is string => Boolean(value && normalizeLocationText(value)))
      .filter(
        (value, locationIndex, values) =>
          values.findIndex(
            (candidate) => normalizeLocationText(candidate) === normalizeLocationText(value),
          ) === locationIndex,
      );
    const location = locations.slice(0, 3).join('; ') || 'See posting';

    results.push({
      id: stableId('Company Site', id, title, entry.name),
      title,
      company: entry.name,
      location,
      description: 'Found on Google Careers.',
      applyUrl,
      postedAt: null,
      modality: inferModality(`${title} ${location}`),
      source: 'Company Site',
    });
  }

  return results;
}

export function extractGoogleDetailResult(
  html: string,
  pageUrl: string,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult | null {
  if (!matchesCompanyEntry(entry, 'Google')) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    return null;
  }
  if (!/\/jobs\/results\/\d{5,}[^/]*\/?$/i.test(parsedUrl.pathname)) return null;

  const titleMatch =
    html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ??
    html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i);
  const title = stripHtml(decodeHtml(titleMatch?.[1] ?? ''));
  if (!title) return null;

  const applyIndex = Math.max(
    html.indexOf('id="apply-action-button"'),
    html.indexOf("id='apply-action-button'"),
  );
  let location = 'See posting';
  if (applyIndex >= 0) {
    const headerStart = Math.max(
      html.lastIndexOf('<div class="op1BBf"', applyIndex),
      html.lastIndexOf("<div class='op1BBf'", applyIndex),
    );
    const header = html.slice(Math.max(0, headerStart), applyIndex);
    const locations = [
      ...header.matchAll(
        /<span\b[^>]*class=["'][^"']*\br0wTof\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
      ),
    ]
      .map((match) => stripHtml(match[1]))
      .filter((value): value is string => Boolean(value));
    if (locations.length > 0) location = locations.join('; ');
  }

  const descriptionMatch =
    html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ??
    html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  const description = stripHtml(decodeHtml(descriptionMatch?.[1] ?? ''));

  return {
    id: stableId('Company Site', parsedUrl.pathname, title, entry.name),
    title,
    company: entry.name,
    location,
    description: description ?? 'Found on Google Careers.',
    applyUrl: pageUrl,
    postedAt: null,
    modality: inferModality(`${title} ${location} ${description ?? ''}`),
    source: 'Company Site',
  };
}

function stableId(
  source: InternshipSource,
  id: string | number,
  title: string,
  company: string,
): string {
  return `${source.toLowerCase()}:${String(id || `${company}-${title}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;
}

function canonicalPostingUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const isWorkday = /(?:^|\.)myworkdayjobs\.com$/i.test(url.hostname);
    const normalizedPath = isWorkday
      ? url.pathname.replace(/^\/[a-z]{2}-[a-z]{2}\//i, '/')
      : url.pathname;
    const pathname = normalizedPath.replace(/\/+$/, '') || '/';
    return `${url.hostname.replace(/^www\./, '').toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return null;
  }
}

function resultCompleteness(result: ScoredInternshipSearchResult): number {
  const normalizedLocation = normalizeLocationText(result.location);
  const hasSpecificLocation =
    normalizedLocation !== '' &&
    normalizedLocation !== 'unknown' &&
    normalizedLocation !== 'see posting';
  const hasDetailedDescription =
    Boolean(result.description) && !/^found on .+ careers site\.?$/i.test(result.description ?? '');
  return (
    result.matchScore +
    (hasSpecificLocation ? 12 : 0) +
    (result.postedAt ? 8 : 0) +
    (hasDetailedDescription ? 4 : 0)
  );
}

function dedupe(results: ScoredInternshipSearchResult[]): ScoredInternshipSearchResult[] {
  const seen = new Map<string, ScoredInternshipSearchResult>();
  for (const result of results) {
    const key =
      canonicalPostingUrl(result.applyUrl) ??
      `${result.company}|${result.title}|${result.location}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ');
    const current = seen.get(key);
    if (!current || resultCompleteness(result) > resultCompleteness(current)) {
      seen.set(key, result);
    }
  }
  return [...seen.values()];
}

function sortResults(
  results: ScoredInternshipSearchResult[],
  sort: 'relevance' | 'newest' = 'relevance',
): ScoredInternshipSearchResult[] {
  return results.sort((a, b) => {
    if (sort === 'newest') {
      const dateDiff = postingDateTimestamp(b.postedAt) - postingDateTimestamp(a.postedAt);
      if (dateDiff !== 0) return dateDiff;
      return b.matchScore - a.matchScore;
    }
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return postingDateTimestamp(b.postedAt) - postingDateTimestamp(a.postedAt);
  });
}

async function searchAdzuna(
  query: string,
  location?: string | null,
  company?: string | null,
  season?: SearchOptions['season'],
): Promise<InternshipSearchResult[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '50',
    sort_by: 'date',
    max_days_old: '30',
    what: normalizeQuery(query, company, season),
  });
  const providerLocation = providerLocationFilter(location);
  if (providerLocation) params.set('where', providerLocation);

  const data = await fetchJson<{ results?: AdzunaJob[] }>(
    `https://api.adzuna.com/v1/api/jobs/us/search/1?${params.toString()}`,
  );
  return (data?.results ?? []).map((job) => ({
    id: stableId('Adzuna', job.id, job.title, job.company?.display_name ?? ''),
    title: job.title,
    company: job.company?.display_name ?? '',
    location: job.location?.display_name ?? '',
    description: stripHtml(job.description),
    applyUrl: job.redirect_url,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    postedAt: normalizePostingDate(job.created),
    modality: inferModality(
      `${job.title} ${job.location?.display_name ?? ''} ${job.description ?? ''}`,
    ),
    source: 'Adzuna',
  }));
}

async function searchGreenhouseBoard(
  board: string,
  companyName: string,
): Promise<InternshipSearchResult[]> {
  const data = await fetchJson<{ jobs?: GreenhouseJob[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=false`,
  );
  return (data?.jobs ?? []).map((job) => ({
    id: stableId('Greenhouse', job.id, job.title, board),
    title: job.title,
    company: companyName,
    location: job.location?.name ?? 'Unknown',
    description: stripHtml(job.departments?.map((department) => department.name).join(', ')),
    applyUrl: job.absolute_url ?? `https://boards.greenhouse.io/${board}`,
    postedAt: null,
    modality: inferModality(`${job.title} ${job.location?.name ?? ''} ${job.content ?? ''}`),
    source: 'Greenhouse',
  }));
}

async function searchLeverBoard(
  company: string,
  companyName: string,
): Promise<InternshipSearchResult[]> {
  const data = await fetchJson<LeverJob[]>(`https://api.lever.co/v0/postings/${company}?mode=json`);
  return (data ?? []).map((job) => ({
    id: stableId('Lever', job.id ?? job.hostedUrl ?? job.text ?? '', job.text ?? '', company),
    title: job.text ?? 'Internship',
    company: companyName,
    location: job.categories?.location ?? 'Unknown',
    description: stripHtml(job.descriptionPlain),
    applyUrl: job.hostedUrl ?? `https://jobs.lever.co/${company}`,
    postedAt: normalizeUnixPostingDate(job.createdAt),
    modality: inferModality(
      `${job.text ?? ''} ${job.categories?.location ?? ''} ${job.descriptionPlain ?? ''}`,
    ),
    source: 'Lever',
  }));
}

async function searchAshbyBoard(
  company: string,
  companyName: string,
): Promise<InternshipSearchResult[]> {
  const data = await fetchJson<{ jobs?: AshbyJob[] }>(
    `https://api.ashbyhq.com/posting-api/job-board/${company}`,
    false,
  );
  return (data?.jobs ?? []).map((job) => ({
    id: stableId('Ashby', job.id ?? job.jobUrl ?? job.title ?? '', job.title ?? '', company),
    title: job.title ?? 'Internship',
    company: companyName,
    location: job.location ?? 'Unknown',
    description: stripHtml(job.descriptionPlain),
    applyUrl: job.jobUrl ?? `https://jobs.ashbyhq.com/${company}`,
    postedAt: normalizePostingDate(job.publishedAt),
    modality: inferModality(
      `${job.title ?? ''} ${job.location ?? ''} ${job.descriptionPlain ?? ''}`,
    ),
    source: 'Ashby',
  }));
}

async function searchGoogleJobs(
  query: string,
  location?: string | null,
  company?: string | null,
  season?: SearchOptions['season'],
): Promise<InternshipSearchResult[]> {
  if (!process.env.SERPAPI_API_KEY) return [];

  const companyEntries = selectedCompanyEntries(company);
  const sites =
    companyEntries.length > 0
      ? companyEntries.flatMap((entry) => entry.domains)
      : BOARD_SEARCH_SITES;
  const boardQuery = `${normalizeQuery(query, company, season)} (${sites.map((site) => `site:${site}`).join(' OR ')})`;
  const params = new URLSearchParams({
    engine: 'google_jobs',
    api_key: process.env.SERPAPI_API_KEY,
    q: boardQuery,
    hl: 'en',
    gl: 'us',
    num: '20',
  });
  const providerLocation = providerLocationFilter(location);
  if (providerLocation) params.set('location', providerLocation);

  const data = await fetchJson<{ jobs_results?: SerpApiJob[] }>(
    `https://serpapi.com/search.json?${params.toString()}`,
  );

  return (data?.jobs_results ?? []).map((job) => {
    const salary = parseSalaryRange(job.detected_extensions?.salary);
    const applyUrl =
      job.related_links?.find((link) => link.link && /apply|job|career/i.test(link.text ?? ''))
        ?.link ??
      job.share_link ??
      `https://www.google.com/search?q=${encodeURIComponent(`${job.title ?? ''} ${job.company_name ?? ''}`)}`;

    return {
      id: stableId('Google Jobs', job.job_id ?? applyUrl, job.title ?? '', job.company_name ?? ''),
      title: job.title ?? 'Internship',
      company: job.company_name ?? 'Unknown company',
      location: job.location ?? location ?? 'United States',
      description: stripHtml([job.via, job.description].filter(Boolean).join(' - ')),
      applyUrl,
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      postedAt: normalizePostingDate(job.detected_extensions?.posted_at),
      modality: inferModality(`${job.title ?? ''} ${job.location ?? ''} ${job.description ?? ''}`),
      source: 'Google Jobs',
    };
  });
}

function theirStackCountryCode(location?: string | null): string | null {
  if (!location?.trim()) return null;
  if (isUsLocationFilter(location) || stateAliasesForFilter(location).length > 0) return 'US';
  return null;
}

export function mapTheirStackJob(job: TheirStackJob): InternshipSearchResult | null {
  const title = stringValue(job.job_title);
  const company = stringValue(job.company);
  const applyUrl = stringValue(job.final_url) ?? stringValue(job.url);
  if (!title || !company || !applyUrl) return null;

  const enhancedLocations = (job.locations ?? [])
    .map((location) => stringValue(location.display_name))
    .filter((location): location is string => Boolean(location));
  const location =
    stringValue(job.long_location) ??
    stringValue(job.location) ??
    stringValue(job.short_location) ??
    enhancedLocations.join('; ');
  const modality = job.remote
    ? 'remote'
    : job.hybrid
      ? 'hybrid'
      : inferModality(`${title} ${location ?? ''} ${job.description ?? ''}`);

  return {
    id: stableId('TheirStack', job.id ?? applyUrl, title, company),
    title,
    company,
    location: location || 'See posting',
    description: stripHtml(job.description),
    applyUrl,
    postedAt: normalizePostingDate(job.date_posted),
    salaryMin:
      typeof job.min_annual_salary_usd === 'number' ? job.min_annual_salary_usd : undefined,
    salaryMax:
      typeof job.max_annual_salary_usd === 'number' ? job.max_annual_salary_usd : undefined,
    modality,
    source: 'TheirStack',
  };
}

async function searchTheirStack(
  query: string,
  location?: string | null,
  company?: string | null,
): Promise<InternshipSearchResult[]> {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) return [];

  const role = query.replace(/\b(internships?|interns?|co[\s-]?op)\b/gi, ' ').trim();
  const countryCode = theirStackCountryCode(location);
  const body: Record<string, unknown> = {
    posted_at_max_age_days: 45,
    is_closed: false,
    job_title_pattern_or: [
      '\\b(intern|internship|co[ -]?op|student researcher|summer analyst|summer associate)\\b',
    ],
    property_exists_and: ['final_url'],
    url_domain_not: ['linkedin.com', 'indeed.com'],
    limit: 20,
    page: 0,
  };
  if (role) body.job_title_or = [role];
  if (company?.trim()) body.company_name_partial_match_or = [company.trim()];
  if (countryCode) body.job_country_code_or = [countryCode];
  if (normalizeLocationText(location ?? '') === 'remote') body.remote = true;

  try {
    const response = await withTimeout(
      fetch('https://api.theirstack.com/v1/jobs/search', {
        method: 'POST',
        cache: 'force-cache',
        next: { revalidate: DAILY_REVALIDATE_SECONDS },
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: TheirStackJob[] };
    return (payload.data ?? [])
      .map(mapTheirStackJob)
      .filter((job): job is InternshipSearchResult => Boolean(job));
  } catch {
    return [];
  }
}

async function searchWebResults(
  query: string,
  location?: string | null,
  company?: string | null,
  season?: SearchOptions['season'],
): Promise<InternshipSearchResult[]> {
  if (!process.env.SERPAPI_API_KEY) return [];

  const queryTerms = termsFor(query);
  const selected = selectedCompanyEntries(company);
  const sites =
    selected.length > 0 ? selected.flatMap((entry) => entry.domains) : BOARD_SEARCH_SITES;
  const siteQuery = sites
    .slice(0, selected.length > 0 ? 8 : 10)
    .map((site) => (site === 'edu' ? 'site:.edu' : `site:${site}`))
    .join(' OR ');
  const locationQuery = location ? ` ${location}` : '';
  const q = `${normalizeQuery(query, company, season)}${locationQuery} (internship OR intern OR co-op) (${siteQuery})`;
  const params = new URLSearchParams({
    engine: 'google',
    api_key: process.env.SERPAPI_API_KEY,
    q,
    num: '20',
    hl: 'en',
    gl: 'us',
  });

  const data = await fetchJson<{ organic_results?: SerpOrganicResult[] }>(
    `https://serpapi.com/search.json?${params.toString()}`,
  );
  const mapped: Array<InternshipSearchResult | null> = (data?.organic_results ?? []).map(
    (result) => {
      const applyUrl = result.link;
      const title = result.title;
      if (!applyUrl || !title) return null;
      const description = stripHtml(result.snippet) ?? `Found from public web search.`;
      const inferredCompany =
        company?.trim() ||
        inferEmployerFromUrl(applyUrl) ||
        result.source ||
        result.displayed_link ||
        'Unknown company';
      return {
        id: stableId('Web Search', applyUrl, title, inferredCompany),
        title,
        company: inferredCompany,
        location: location ?? 'See posting',
        description,
        applyUrl,
        postedAt: null,
        modality: inferModality(`${title} ${description}`),
        source: 'Web Search' as const,
      };
    },
  );

  return mapped
    .filter((job): job is InternshipSearchResult => job !== null)
    .filter((job) => {
      const haystack = normalizeText(`${job.title} ${job.description ?? ''} ${job.applyUrl}`);
      const roleMatches = queryTerms.length === 0 || containsRoleSignal(haystack, queryTerms);
      const companyMatches = matchesCompanyResult(job, company);
      return (
        hasInternshipSignal(haystack) && roleMatches && companyMatches && isActionablePosting(job)
      );
    });
}

function smartRecruitersLocation(posting: SmartRecruitersPosting): string {
  const location = posting.location;
  if (!location) return 'See posting';
  return (
    [
      location.city,
      location.region,
      location.country?.toUpperCase(),
      location.remote ? 'Remote' : undefined,
    ]
      .filter(Boolean)
      .join(', ') || 'See posting'
  );
}

function smartRecruitersDescription(posting: SmartRecruitersPostingDetails): string | undefined {
  const sections = posting.jobAd?.sections;
  if (!sections) {
    return stripHtml(
      [
        posting.department?.label,
        posting.function?.label,
        posting.typeOfEmployment?.label,
        posting.experienceLevel?.label,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  return stripHtml(
    Object.values(sections)
      .map((section) => `${section.title ?? ''} ${section.text ?? ''}`)
      .join(' '),
  );
}

async function searchSmartRecruitersBoard(
  companyIdentifier: string,
  companyName: string,
  query: string,
): Promise<InternshipSearchResult[]> {
  const listUrls = uniqueNormalized([
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?limit=100`,
    ...internshipFocusedQueryVariants(query)
      .slice(0, 3)
      .map(
        (variant) =>
          `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings?limit=100&q=${encodeURIComponent(normalizeQuery(variant))}`,
      ),
  ]);
  const lists = await Promise.allSettled(
    listUrls.map((url) => fetchJson<{ content?: SmartRecruitersPosting[] }>(url)),
  );
  const postings = lists.flatMap((result) =>
    result.status === 'fulfilled' ? (result.value?.content ?? []) : [],
  );
  const uniquePostings = new Map<string, SmartRecruitersPosting>();
  for (const posting of postings) {
    const id = posting.id ?? posting.uuid;
    if (id) uniquePostings.set(id, posting);
  }

  const details = await Promise.allSettled(
    [...uniquePostings.values()].slice(0, 40).map((posting) => {
      const id = posting.id ?? posting.uuid;
      const detailUrl =
        posting.ref ??
        (id
          ? `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(companyIdentifier)}/postings/${encodeURIComponent(id)}`
          : null);
      return detailUrl
        ? fetchJson<SmartRecruitersPostingDetails>(detailUrl)
        : Promise.resolve(null);
    }),
  );

  return details
    .flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []))
    .map((posting) => {
      const title = posting.name ?? `${companyName} internship`;
      const id = posting.id ?? posting.uuid ?? title;
      const description = smartRecruitersDescription(posting);
      const applyUrl =
        posting.applyUrl ??
        `https://jobs.smartrecruiters.com/${encodeURIComponent(companyIdentifier)}/${encodeURIComponent(String(id))}`;
      const location = smartRecruitersLocation(posting);
      return {
        id: stableId('SmartRecruiters', id, title, companyName),
        title,
        company: posting.company?.name ?? companyName,
        location,
        description,
        applyUrl,
        postedAt: normalizePostingDate(posting.releasedDate),
        modality: inferModality(`${title} ${location} ${description ?? ''}`),
        source: 'SmartRecruiters' as const,
      };
    });
}

async function searchAmazonCompanyJobs(
  query: string,
  entry: CompanyDirectoryEntry,
): Promise<InternshipSearchResult[]> {
  const tasks = internshipFocusedQueryVariants(query)
    .slice(0, 5)
    .map((variant) => {
      const params = new URLSearchParams({
        base_query: normalizeQuery(variant),
        offset: '0',
        result_limit: '25',
      });
      return fetchJson<{ jobs?: AmazonJob[] }>(
        `https://www.amazon.jobs/en/search.json?${params.toString()}`,
      );
    });
  const settled = await Promise.allSettled(tasks);
  const jobs = settled.flatMap((result) =>
    result.status === 'fulfilled' ? (result.value?.jobs ?? []) : [],
  );

  return jobs.map((job) => {
    const title = job.title ?? 'Amazon internship';
    const applyUrl = job.job_path
      ? (toAbsoluteUrl(job.job_path, 'https://www.amazon.jobs') ??
        `https://www.amazon.jobs${job.job_path}`)
      : (job.url_next_step ?? entry.careerUrl);
    const location =
      job.normalized_location ??
      job.location ??
      [job.city, job.state, job.country_code].filter(Boolean).join(', ') ??
      'See posting';
    const description = stripHtml(
      [job.description_short, job.description, job.basic_qualifications].filter(Boolean).join(' '),
    );

    return {
      id: stableId('Company Site', job.id_icims ?? job.id ?? applyUrl, title, entry.name),
      title,
      company: entry.name,
      location: location || 'See posting',
      description,
      applyUrl,
      postedAt: normalizePostingDate(job.posted_date),
      modality: inferModality(`${title} ${location} ${description ?? ''}`),
      source: 'Company Site',
    };
  });
}

export function inferEmployerFromUrl(rawUrl: string): string | null {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
    const configuredCompany = COMPANY_DIRECTORY.find((entry) => {
      if (entry.workday?.host.toLowerCase() === hostname) return true;
      return entry.domains.some((domain) => {
        const domainHost = domain.split('/')[0]?.toLowerCase();
        return hostname === domainHost || hostname.endsWith(`.${domainHost}`);
      });
    });
    if (configuredCompany) return configuredCompany.name;

    const workdayTenant = hostname.match(/^([a-z0-9_-]+)\.wd\d+\.myworkdayjobs\.com$/i)?.[1];
    if (!workdayTenant) return null;
    return workdayTenant
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
      .join(' ');
  } catch {
    return null;
  }
}

function splitCombinedSetCookie(value: string): string[] {
  return value.split(/,(?=\s*[^;,=\s]+=)/g).map((cookie) => cookie.trim());
}

function cookieHeader(setCookie: string[]): string | undefined {
  const cookies = setCookie.map((cookie) => cookie.split(';')[0]).filter(Boolean);
  return cookies.length > 0 ? cookies.join('; ') : undefined;
}

function nodeSetCookieValues(headers: IncomingHttpHeaders): string[] {
  const setCookie = headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  return setCookie ? splitCombinedSetCookie(setCookie) : [];
}

function requestText(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string | number>;
    body?: string;
  } = {},
): Promise<{ status: number; headers: IncomingHttpHeaders; text: string }> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            text,
          });
        });
      },
    );

    req.setTimeout(SOURCE_TIMEOUT_MS, () => {
      req.destroy(new Error('Search source timed out'));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function postWorkdayJson<T>(
  url: string,
  body: unknown,
  cookie?: string,
  referer?: string,
): Promise<T | null> {
  const payload = JSON.stringify(body);
  try {
    const response = await requestText(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'user-agent': 'Mozilla/5.0',
        ...(cookie ? { cookie } : {}),
        ...(referer ? { referer } : {}),
      },
      body: payload,
    });
    if (response.status < 200 || response.status >= 300) return null;
    return JSON.parse(response.text) as T;
  } catch {
    return null;
  }
}

async function getWorkdayJson<T>(
  url: string,
  cookie?: string,
  referer?: string,
): Promise<T | null> {
  try {
    const response = await requestText(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0',
        ...(cookie ? { cookie } : {}),
        ...(referer ? { referer } : {}),
      },
    });
    if (response.status < 200 || response.status >= 300) return null;
    return JSON.parse(response.text) as T;
  } catch {
    return null;
  }
}

function isProductManagementQuery(query: string): boolean {
  const normalized = normalizeText(query);
  return (
    normalized === 'product' ||
    normalized === 'pm' ||
    normalized.includes('product management') ||
    normalized.includes('product manager')
  );
}

function matchesRequestedRole(query: string, text: string): boolean {
  const normalized = normalizeText(text);
  if (isProductManagementQuery(query)) {
    return [
      'product management',
      'product manager',
      'associate product manager',
      'technical product manager',
      'product strategy',
      'product roadmap',
      'product operations',
      'product intern',
    ].some((term) => includesNormalizedTerm(normalized, term));
  }

  return containsRoleSignal(normalized, termsFor(query));
}

export function workdayJobMatchesSearch(
  query: string,
  job: WorkdayJob,
  detail?: WorkdayJobPostingInfo | null,
): boolean {
  const title = detail?.title ?? job.title ?? '';
  const description = stripHtml(detail?.jobDescription) ?? '';
  const applyUrl = job.externalPath ?? '';
  const internshipResult: InternshipSearchResult = {
    id: 'workday-validation',
    title,
    company: 'Workday employer',
    location: detail?.location ?? job.locationsText ?? 'See posting',
    description,
    applyUrl: applyUrl || 'https://example.com/job/workday-listing',
    postedAt: normalizePostingDate(detail?.startDate ?? job.postedOn),
    source: 'Company Site',
  };

  return (
    hasExplicitInternshipListingSignal(internshipResult) &&
    matchesRequestedRole(query, `${title} ${description}`)
  );
}

function workdaySearchVariants(query: string): string[] {
  const roleOnly = query
    .replace(/\b(internships?|intern|co[\s-]?op|student|university|campus)\b/gi, ' ')
    .replace(/\b(summer|fall|spring|winter)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return uniqueNormalized([
    roleOnly,
    ...queryVariants(roleOnly || query),
    'intern',
    'internship',
    'co-op',
  ]).slice(0, 6);
}

function workdayDetailUrl(job: WorkdayJob, entry: CompanyDirectoryEntry): string | null {
  if (!entry.workday || !job.externalPath) return null;
  return `https://${entry.workday.host}/wday/cxs/${entry.workday.tenant}/${entry.workday.site}${job.externalPath}`;
}

async function searchWorkdayCompanyJobs(
  query: string,
  entry: CompanyDirectoryEntry,
  fullCompanyScan = false,
): Promise<InternshipSearchResult[]> {
  if (!entry.workday) return [];

  const url = `https://${entry.workday.host}/wday/cxs/${entry.workday.tenant}/${entry.workday.site}/jobs`;
  const sessionUrl = `https://${entry.workday.host}/${entry.workday.site}`;
  const session = await requestText(sessionUrl, {
    headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
  }).catch(() => null);
  const cookie = session ? cookieHeader(nodeSetCookieValues(session.headers)) : undefined;
  const pageCount = fullCompanyScan ? 4 : 2;
  const searches = workdaySearchVariants(query).flatMap((variant) =>
    Array.from({ length: pageCount }, (_, page) =>
      postWorkdayJson<{ jobPostings?: WorkdayJob[] }>(
        url,
        {
          appliedFacets: {},
          limit: 20,
          offset: page * 20,
          searchText: variant,
        },
        cookie,
        sessionUrl,
      ),
    ),
  );
  const searchResults = await Promise.allSettled(searches);
  const uniqueJobs = new Map<string, WorkdayJob>();
  for (const result of searchResults) {
    if (result.status !== 'fulfilled') continue;
    for (const job of result.value?.jobPostings ?? []) {
      const key = job.externalPath ?? `${job.title ?? ''}|${job.locationsText ?? ''}`;
      if (key) uniqueJobs.set(key, job);
    }
  }

  const internshipCandidates = [...uniqueJobs.values()].filter((job) =>
    hasExplicitInternshipListingSignal({
      id: 'workday-candidate',
      title: job.title ?? '',
      company: entry.name,
      location: job.locationsText ?? 'See posting',
      applyUrl: job.externalPath ?? entry.careerUrl,
      postedAt: normalizePostingDate(job.postedOn),
      source: 'Company Site',
    }),
  );
  const details = await Promise.allSettled(
    internshipCandidates.slice(0, fullCompanyScan ? 80 : 40).map((job) => {
      const detailUrl = workdayDetailUrl(job, entry);
      return detailUrl
        ? getWorkdayJson<{ jobPostingInfo?: WorkdayJobPostingInfo }>(detailUrl, cookie, sessionUrl)
        : Promise.resolve(null);
    }),
  );

  return internshipCandidates.flatMap((job, index) => {
    const detailResult = details[index];
    const detail =
      detailResult?.status === 'fulfilled' ? detailResult.value?.jobPostingInfo : undefined;
    if (!workdayJobMatchesSearch(query, job, detail)) return [];

    const title = detail?.title ?? job.title ?? `${entry.name} internship`;
    const applyUrl = job.externalPath
      ? `https://${entry.workday?.host}/${entry.workday?.site}${job.externalPath}`
      : entry.careerUrl;
    const location =
      [detail?.location, ...(detail?.additionalLocations ?? [])].filter(Boolean).join('; ') ||
      job.locationsText ||
      'See posting';
    const description =
      stripHtml(detail?.jobDescription) ?? job.timeType ?? `Found on ${entry.name}'s careers site.`;
    const salary = parseSalaryRange(description);

    return [
      {
        id: stableId(
          'Company Site',
          detail?.jobReqId ?? job.externalPath ?? title,
          title,
          entry.name,
        ),
        title,
        company: entry.name,
        location,
        description,
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        applyUrl,
        postedAt: normalizePostingDate(detail?.startDate ?? job.postedOn),
        modality: inferModality(`${title} ${location} ${description}`),
        source: 'Company Site' as const,
      },
    ];
  });
}

async function discoverWorkdayConfig(
  entry: CompanyDirectoryEntry,
): Promise<CompanyDirectoryEntry['workday'] | null> {
  const seedUrls = [entry.careerUrl, ...(entry.searchUrls?.slice(0, 3) ?? [])];
  for (const seedUrl of seedUrls) {
    const html = await fetchText(seedUrl);
    if (!html) continue;

    const matches = html.matchAll(
      /https?:\/\/([a-z0-9-]+\.wd\d+\.myworkdayjobs\.com)\/([^"' <>)]+)/gi,
    );
    for (const match of matches) {
      const host = match[1];
      const rawPath = match[2] ?? '';
      if (!host || !rawPath) continue;

      const tenant = host.split('.')[0];
      const pathOnly = rawPath.split(/[?#]/)[0] ?? '';
      const site = pathOnly
        .split('/')
        .filter(Boolean)
        .find((segment) => !/^[a-z]{2}-[A-Z]{2}$/.test(segment) && segment.toLowerCase() !== 'job');
      if (tenant && site) {
        return { host, tenant, site };
      }
    }
  }

  return null;
}

async function searchKnownOrDiscoveredWorkdayCompanyJobs(
  query: string,
  entry: CompanyDirectoryEntry,
): Promise<InternshipSearchResult[]> {
  if (entry.workday) return searchWorkdayCompanyJobs(query, entry, true);
  const workday = await discoverWorkdayConfig(entry);
  return workday ? searchWorkdayCompanyJobs(query, { ...entry, workday }, true) : [];
}

function eightfoldApplyUrl(job: EightfoldJob, entry: CompanyDirectoryEntry): string {
  const configuredBase = entry.eightfold?.baseUrl ?? entry.careerUrl;
  const path =
    job.canonicalPositionUrl ?? job.positionUrl ?? (job.id ? `/careers/job/${job.id}` : '');
  if (!path) return entry.careerUrl;
  return toAbsoluteUrl(path, configuredBase) ?? entry.careerUrl;
}

function mapEightfoldJob(
  job: EightfoldJob,
  entry: CompanyDirectoryEntry,
): InternshipSearchResult | null {
  const title = job.name ?? job.title;
  const id = job.id ?? job.displayJobId ?? title;
  if (!title || !id) return null;

  const location =
    [...(job.locations ?? []), ...(job.standardizedLocations ?? [])]
      .filter(Boolean)
      .slice(0, 3)
      .join('; ') || 'See posting';
  const description =
    stripHtml(job.jobDescription) ?? job.department ?? `Found on ${entry.name}'s careers site.`;
  const applyUrl = eightfoldApplyUrl(job, entry);

  return {
    id: stableId('Company Site', id, title, entry.name),
    title,
    company: entry.name,
    location,
    description,
    applyUrl,
    postedAt: normalizeUnixPostingDate(job.postedTs ?? job.creationTs),
    modality: inferModality(`${title} ${location} ${job.workLocationOption ?? ''}`),
    source: 'Company Site',
  };
}

async function searchEightfoldCompanyJobs(
  query: string,
  entry: CompanyDirectoryEntry,
  maxPages = 1,
): Promise<InternshipSearchResult[]> {
  if (!entry.eightfold) return [];

  const jobs: EightfoldJob[] = [];
  for (const variant of internshipFocusedQueryVariants(query).slice(0, 5)) {
    for (let page = 0; page < maxPages; page += 1) {
      const params = new URLSearchParams({
        domain: entry.eightfold.domain,
        start: String(page * 10),
      });

      let url: string;
      if (entry.eightfold.api === 'pcsx') {
        params.set('query', normalizeQuery(variant));
        params.set('location', '');
        url = `${entry.eightfold.baseUrl}/api/pcsx/search?${params.toString()}`;
      } else {
        params.set('hl', 'en');
        params.set('query', normalizeQuery(variant));
        url = `${entry.eightfold.baseUrl}/api/apply/v2/jobs?${params.toString()}`;
      }

      const data = await fetchJson<{
        data?: { positions?: EightfoldJob[] };
        positions?: EightfoldJob[];
      }>(url, false);
      const pageJobs = data?.data?.positions ?? data?.positions ?? [];
      jobs.push(...pageJobs);
      if (pageJobs.length < 10) break;
    }
  }

  return jobs
    .map((job) => mapEightfoldJob(job, entry))
    .filter((job): job is InternshipSearchResult => Boolean(job));
}

async function searchCompanyDirectFeeds(
  query: string,
  company?: string | null,
): Promise<InternshipSearchResult[]> {
  const selected = selectedCompanyEntries(company);
  const directEntries = (selected.length > 0 ? selected : COMPANY_DIRECTORY).filter(
    (entry) =>
      matchesCompanyEntry(entry, 'Amazon') ||
      Boolean(entry.workday) ||
      Boolean(entry.eightfold) ||
      Boolean(entry.smartRecruiters),
  );
  const discoveryEntries = selected.filter((entry) => !entry.workday);
  const fullCompanyScan = selected.length > 0;
  const tasks = directEntries.flatMap((entry) => [
    ...(matchesCompanyEntry(entry, 'Amazon') ? [searchAmazonCompanyJobs(query, entry)] : []),
    ...(entry.workday ? [searchWorkdayCompanyJobs(query, entry, fullCompanyScan)] : []),
    ...(entry.eightfold ? [searchEightfoldCompanyJobs(query, entry, fullCompanyScan ? 4 : 1)] : []),
    ...(entry.smartRecruiters
      ? [searchSmartRecruitersBoard(entry.smartRecruiters, entry.name, query)]
      : []),
  ]);
  tasks.push(
    ...discoveryEntries.map((entry) => searchKnownOrDiscoveredWorkdayCompanyJobs(query, entry)),
  );
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

async function searchCompanyBoards(company?: string | null): Promise<InternshipSearchResult[]> {
  const entries = selectedCompanyEntries(company);
  const pool =
    entries.length > 0
      ? entries
      : COMPANY_DIRECTORY.filter((entry) => entry.greenhouse || entry.lever || entry.ashby);
  const tasks = pool.flatMap((entry) => [
    ...(entry.greenhouse ? [searchGreenhouseBoard(entry.greenhouse, entry.name)] : []),
    ...(entry.lever ? [searchLeverBoard(entry.lever, entry.name)] : []),
    ...(entry.ashby ? [searchAshbyBoard(entry.ashby, entry.name)] : []),
  ]);
  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

async function searchCompanySitePages(
  query: string,
  company?: string | null,
): Promise<InternshipSearchResult[]> {
  const queryTerms = termsFor(query);
  const selected = selectedCompanyEntries(company);
  if (selected.length === 0) return [];
  const pool = (selected.length > 0 ? selected : COMPANY_DIRECTORY).slice(
    0,
    COMPANY_SITE_CRAWL_LIMIT,
  );
  const tasks = pool.flatMap((entry) =>
    companySiteSeedUrls(entry, query).map(async (pageUrl) => {
      const html = await fetchText(pageUrl);
      if (!html) return [];
      const isGooglePage = matchesCompanyEntry(entry, 'Google');
      return [
        ...extractGoogleCareerResults(html, pageUrl, entry),
        ...extractEmbeddedCompanyResults(html, entry),
        ...extractStructuredJobResults(html, pageUrl, entry),
        ...(isGooglePage ? [] : extractCompanySiteResults(html, pageUrl, entry, queryTerms)),
      ];
    }),
  );

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

function companySitemapOrigins(entry: CompanyDirectoryEntry): string[] {
  const origins = new Set<string>();
  try {
    origins.add(new URL(entry.careerUrl).origin);
  } catch {
    // Ignore invalid configured URLs.
  }
  for (const domain of entry.domains) {
    const host = domain.split('/')[0];
    if (!host || host.includes('*')) continue;
    try {
      origins.add(new URL(`https://${host}`).origin);
    } catch {
      // Ignore invalid domain fragments.
    }
  }
  return [...origins];
}

async function sitemapLocs(origin: string): Promise<string[]> {
  const sitemap = await fetchText(`${origin}/sitemap.xml`);
  if (!sitemap) return [];

  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) =>
    decodeHtml(match[1] ?? ''),
  );
  const nestedSitemaps = locs.filter((url) => /\.xml(?:$|[?#])/i.test(url)).slice(0, 3);
  if (nestedSitemaps.length === 0) return locs;

  const nested = await Promise.allSettled(nestedSitemaps.map((url) => fetchText(url)));
  return nested.flatMap((result) => {
    if (result.status !== 'fulfilled' || !result.value) return [];
    return [...result.value.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) =>
      decodeHtml(match[1] ?? ''),
    );
  });
}

async function searchCompanySitemapPages(
  query: string,
  company?: string | null,
): Promise<InternshipSearchResult[]> {
  const selected = selectedCompanyEntries(company);
  if (selected.length === 0) return [];

  const queryTerms = termsFor(query);
  const tasks = selected.flatMap(async (entry) => {
    const locs = (
      await Promise.allSettled(companySitemapOrigins(entry).map((origin) => sitemapLocs(origin)))
    ).flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

    const urls = locs
      .filter((url) => {
        const normalized = normalizeText(decodeURIComponent(url));
        return hasInternshipSignal(normalized) && containsRoleSignal(normalized, queryTerms);
      })
      .slice(0, 5);

    const pageResults = await Promise.allSettled(
      urls.map(async (url) => {
        const html = await fetchText(url);
        if (!html) return [];
        const googleDetail = extractGoogleDetailResult(html, url, entry);
        if (googleDetail) return [googleDetail];
        return [
          ...extractGoogleCareerResults(html, url, entry),
          ...extractEmbeddedCompanyResults(html, entry),
          ...extractStructuredJobResults(html, url, entry),
          ...extractCompanySiteResults(html, url, entry, queryTerms),
        ];
      }),
    );

    return pageResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  });

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

export async function searchInternships(options: SearchOptions): Promise<InternshipSearchResult[]> {
  const effectiveQuery = options.query.trim() || 'internship';
  const providerQuery = queryWithSeason(effectiveQuery, options.season);
  const providerQueries = generalQueryVariants(effectiveQuery, options.season);
  const queryTerms = termsFor(effectiveQuery);
  const profileSignals = profileSignalsFor(options.profile);
  const profileLocations = profileLocationTerms(options.profile);
  const settled = await Promise.allSettled([
    searchCompanyDirectFeeds(providerQuery, options.company),
    searchCompanyBoards(options.company),
    searchCompanySitePages(providerQuery, options.company),
    searchCompanySitemapPages(providerQuery, options.company),
    ...providerQueries
      .slice(0, 2)
      .map((query) => searchGoogleJobs(query, options.location, options.company, options.season)),
    ...providerQueries
      .slice(0, 2)
      .map((query) => searchAdzuna(query, options.location, options.company, options.season)),
    searchTheirStack(effectiveQuery, options.location, options.company),
    searchWebResults(effectiveQuery, options.location, options.company, options.season),
  ]);

  const raw = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const scored = raw
    .filter((result) => result.title && result.company && result.applyUrl)
    .filter((result) => !usesTemporarilyDisabledHost(result))
    .filter((result) => matchesLocationFilter(result.location, options.location, result.modality))
    .filter((result) => matchesCompanyResult(result, options.company))
    .filter(
      (result) =>
        (!isProductManagementQuery(effectiveQuery) && !shouldRequireRoleRelevance(result)) ||
        isRelevantToSearch(result, effectiveQuery, queryTerms, options.company),
    )
    .map((result) => ({
      ...result,
      seasonMatch: seasonSignalForResult(result),
      fitReasons: fitReasonsForResult(result, profileSignals, options.profile),
      matchScore: scoreResult(result, queryTerms, {
        location: options.location,
        company: options.company,
        season: options.season,
        profileSignals,
        profileLocations,
      }),
    }))
    .filter(
      (result) =>
        result.matchScore >= 28 && isInternshipFocused(result) && isActionablePosting(result),
    );

  const deduped = dedupe(scored);

  const sorted = sortResults(deduped, options.sort);
  return typeof options.limit === 'number' ? sorted.slice(0, options.limit) : sorted;
}
