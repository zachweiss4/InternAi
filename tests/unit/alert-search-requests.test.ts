import { describe, expect, it } from 'vitest';
import {
  buildAlertSearchRequests,
  hasAlertCriteria,
} from '@/lib/alerts/search-requests';

describe('alert search requests', () => {
  it('does not create a broad search for empty alerts', () => {
    const alert = {
      field: null,
      fieldNames: [],
      location: null,
      locations: [],
      season: null,
      companyNames: [],
    };

    expect(hasAlertCriteria(alert)).toBe(false);
    expect(buildAlertSearchRequests(alert, 12)).toEqual([]);
  });

  it('builds one search per selected field, company, and location', () => {
    const requests = buildAlertSearchRequests(
      {
        field: null,
        fieldNames: ['Product Management', 'Data Science'],
        location: null,
        locations: ['United States', 'Remote'],
        season: 'summer',
        companyNames: ['Google'],
      },
      12,
    );

    expect(requests).toEqual([
      {
        source: 'field',
        query: 'Product Management',
        location: 'United States',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
      {
        source: 'field',
        query: 'Data Science',
        location: 'United States',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
      {
        source: 'company',
        query: 'internship',
        location: 'United States',
        company: 'Google',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
      {
        source: 'field',
        query: 'Product Management',
        location: 'Remote',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
      {
        source: 'field',
        query: 'Data Science',
        location: 'Remote',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
      {
        source: 'company',
        query: 'internship',
        location: 'Remote',
        company: 'Google',
        season: 'summer',
        sort: 'newest',
        limit: 12,
      },
    ]);
  });

  it('supports location-only alerts without falling back to an unfiltered search', () => {
    expect(
      buildAlertSearchRequests(
        {
          field: null,
          fieldNames: [],
          location: null,
          locations: ['Miami, FL'],
          season: null,
          companyNames: [],
        },
        8,
      ),
    ).toEqual([
      {
        source: 'location',
        query: 'internship',
        location: 'Miami, FL',
        season: null,
        sort: 'newest',
        limit: 8,
      },
    ]);
  });
});
