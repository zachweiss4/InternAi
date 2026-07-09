import 'server-only';
import { ensureJobAlertSchema } from '@/lib/alerts/ensure-schema';
import {
  alertFields,
  alertLocations,
  buildAlertSearchRequests,
} from '@/lib/alerts/search-requests';
import { assertCronAuthorized } from '@/lib/cron';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { jobAlertEmail } from '@/lib/email/templates';
import { env } from '@/lib/env';
import { searchInternships, type InternshipSearchResult } from '@/lib/search/internships';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const ALERT_RESULT_LIMIT = 12;
const SENT_JOB_RETENTION_DAYS = 180;
const TIMEFRAME_DAYS: Record<string, number> = {
  daily: 1,
  three_days: 3,
  weekly: 7,
};

function dedupeJobs(jobs: InternshipSearchResult[]): InternshipSearchResult[] {
  const seen = new Map<string, InternshipSearchResult>();
  for (const job of jobs) {
    const key = (job.applyUrl || `${job.company}|${job.title}|${job.location}`).toLowerCase();
    const current = seen.get(key);
    if (!current || (job.matchScore ?? 0) > (current.matchScore ?? 0)) {
      seen.set(key, job);
    }
  }
  return [...seen.values()];
}

function searchUrlForAlert(alert: {
  field: string | null;
  fieldNames?: string[];
  location: string | null;
  locations?: string[];
  season?: string | null;
  companyNames: string[];
}): string {
  const fields = alertFields(alert);
  const locations = alertLocations(alert);
  const params = new URLSearchParams({
    q: `${fields[0] ?? 'internship'} internship`.replace(
      /\binternship internship\b/i,
      'internship',
    ),
    sort: 'newest',
  });
  if (locations[0]) params.set('location', locations[0]);
  if (alert.season === 'summer' || alert.season === 'fall') params.set('season', alert.season);
  const onlyCompany = alert.companyNames.length === 1 ? alert.companyNames[0] : null;
  if (onlyCompany) params.set('company', onlyCompany);
  return `${env.NEXT_PUBLIC_APP_URL}/search?${params.toString()}`;
}

async function fetchAlertJobs(alert: {
  field: string | null;
  fieldNames: string[];
  location: string | null;
  locations: string[];
  season: string | null;
  companyNames: string[];
}): Promise<InternshipSearchResult[]> {
  const searches = buildAlertSearchRequests(alert, ALERT_RESULT_LIMIT).map((request) =>
    searchInternships(request),
  );

  const settled = await Promise.allSettled(searches);

  return dedupeJobs(
    settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  ).slice(0, ALERT_RESULT_LIMIT);
}

function seenJobRows(alertId: string, jobs: InternshipSearchResult[]) {
  return jobs.map((job) => ({
    alertId,
    jobId: job.id,
  }));
}

export async function GET(req: Request) {
  const unauthorized = assertCronAuthorized(req);
  if (unauthorized) return unauthorized;

  await ensureJobAlertSchema();
  const allAlerts = await prisma.jobAlert.findMany();
  if (allAlerts.length === 0) {
    return Response.json({ sent: 0, checked: 0 });
  }

  const userIds = [...new Set(allAlerts.map((alert) => alert.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  await prisma.jobAlertSentJob.deleteMany({
    where: {
      sentAt: { lt: new Date(Date.now() - SENT_JOB_RETENTION_DAYS * DAY_MS) },
    },
  });

  let sent = 0;
  let initialized = 0;
  let checked = 0;
  let skipped = 0;
  let errors = 0;
  for (const alert of allAlerts) {
    try {
      const timeframeDays = TIMEFRAME_DAYS[alert.timeframe] ?? 1;
      if (
        alert.lastCheckedAt &&
        Date.now() - alert.lastCheckedAt.getTime() < timeframeDays * DAY_MS
      ) {
        skipped++;
        continue;
      }
      checked++;

      const user = userMap.get(alert.userId);
      if (!user?.email) {
        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: new Date() },
        });
        continue;
      }

      const jobs = await fetchAlertJobs(alert);
      if (jobs.length === 0) {
        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: new Date() },
        });
        continue;
      }

      const alreadySent = await prisma.jobAlertSentJob.findMany({
        where: { alertId: alert.id },
        select: { jobId: true },
      });
      const alreadySentIds = new Set(alreadySent.map((job) => job.jobId));
      const newJobs = jobs.filter((job) => !alreadySentIds.has(job.id));

      if (!alert.lastCheckedAt) {
        await prisma.jobAlertSentJob.createMany({
          data: seenJobRows(alert.id, jobs),
          skipDuplicates: true,
        });
        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: new Date() },
        });
        initialized++;
        continue;
      }

      if (newJobs.length === 0) {
        await prisma.jobAlert.update({
          where: { id: alert.id },
          data: { lastCheckedAt: new Date() },
        });
        continue;
      }

      const searchUrl = searchUrlForAlert(alert);
      await sendEmail({
        to: user.email,
        ...jobAlertEmail({
          name: user.name ?? 'there',
          field: alert.field,
          fieldNames: alertFields(alert),
          companyNames: alert.companyNames,
          location: alert.location,
          locations: alertLocations(alert),
          season: alert.season,
          jobs: newJobs.slice(0, 5),
          searchUrl,
        }),
      });

      await prisma.jobAlertSentJob.createMany({
        data: seenJobRows(alert.id, newJobs),
        skipDuplicates: true,
      });

      await prisma.jobAlert.update({
        where: { id: alert.id },
        data: { lastCheckedAt: new Date(), lastNotifiedAt: new Date() },
      });
      sent++;
    } catch {
      errors++;
    }
  }

  return Response.json({ sent, checked, total: allAlerts.length, skipped, initialized, errors });
}
