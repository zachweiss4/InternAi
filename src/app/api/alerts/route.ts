import 'server-only';
import { ensureJobAlertSchema } from '@/lib/alerts/ensure-schema';
import { normalizeAlertInput, serializeJobAlert } from '@/lib/alerts/normalize';
import { hasAlertCriteria } from '@/lib/alerts/search-requests';
import { AlertCreate, AlertResponse, AlertsListResponse } from '@/lib/contracts/alerts';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  try {
    await ensureJobAlertSchema();
    const rows = await prisma.jobAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(
      AlertsListResponse.parse({
        alerts: rows.map(serializeJobAlert),
      }),
    );
  } catch (error) {
    console.error('Failed to load alerts', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = AlertCreate.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = normalizeAlertInput(parsed.data);
  if (!hasAlertCriteria(data)) {
    return Response.json(
      { error: 'Add at least one company, field, or location to create an alert.' },
      { status: 400 },
    );
  }

  try {
    await ensureJobAlertSchema();
    const row = await prisma.jobAlert.create({
      data: { userId: user.id, ...data },
    });
    return Response.json(AlertResponse.parse(serializeJobAlert(row)), { status: 201 });
  } catch (error) {
    console.error('Failed to create alert', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
