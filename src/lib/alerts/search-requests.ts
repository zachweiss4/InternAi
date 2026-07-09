import { uniqueTrimmed } from '@/lib/alerts/normalize';
import type { SearchOptions } from '@/lib/search/internships';

export type AlertSearchSource = 'field' | 'company' | 'location';

export type AlertSearchRequest = SearchOptions & {
  source: AlertSearchSource;
};

export type SearchableAlert = {
  field: string | null;
  fieldNames?: string[];
  location: string | null;
  locations?: string[];
  season?: string | null;
  companyNames: string[];
};

export function alertFields(alert: { field: string | null; fieldNames?: string[] }): string[] {
  return uniqueTrimmed([...(alert.fieldNames ?? []), alert.field ?? '']);
}

export function alertLocations(alert: { location: string | null; locations?: string[] }): string[] {
  return uniqueTrimmed([...(alert.locations ?? []), alert.location ?? '']);
}

export function hasAlertCriteria(alert: SearchableAlert): boolean {
  return (
    alert.companyNames.some((company) => company.trim()) ||
    alertFields(alert).length > 0 ||
    alertLocations(alert).length > 0
  );
}

export function buildAlertSearchRequests(
  alert: SearchableAlert,
  limit: number,
): AlertSearchRequest[] {
  if (!hasAlertCriteria(alert)) return [];

  const fields = alertFields(alert);
  const locations = alertLocations(alert);
  const searchLocations = locations.length > 0 ? locations : [null];
  const season = alert.season === 'summer' || alert.season === 'fall' ? alert.season : null;
  const requests: AlertSearchRequest[] = [];

  for (const location of searchLocations) {
    for (const field of fields) {
      requests.push({
        source: 'field',
        query: field,
        location,
        season,
        sort: 'newest',
        limit,
      });
    }

    for (const company of uniqueTrimmed(alert.companyNames)) {
      requests.push({
        source: 'company',
        query: 'internship',
        location,
        company,
        season,
        sort: 'newest',
        limit,
      });
    }

    if (fields.length === 0 && alert.companyNames.length === 0 && location) {
      requests.push({
        source: 'location',
        query: 'internship',
        location,
        season,
        sort: 'newest',
        limit,
      });
    }
  }

  return requests;
}
