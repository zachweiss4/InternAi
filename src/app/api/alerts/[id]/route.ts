import 'server-only';
import { ensureJobAlertSchema } from '@/lib/alerts/ensure-schema';
import { normalizeAlertInput, serializeJobAlert } from '@/lib/alerts/normalize';
import { hasAlertCriteria } from '@/lib/alerts/search-requests';
import { AlertResponse, AlertUpdate } from '@/lib/contracts/alerts';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = AlertUpdate.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const data = normalizeAlertInput(parsed.data);
  if (!hasAlertCriteria(data)) {
    return Response.json(
      { error: 'Add at least one company, field, or location to save an alert.' },
      { status: 400 },
    );
  }

  try {
    await ensureJobAlertSchema();
    const alert = await prisma.jobAlert.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!alert) return Response.json({ error: 'Not found' }, { status: 404 });

    const [row] = await prisma.$transaction([
      prisma.jobAlert.update({
        where: { id },
        data: { ...data, lastCheckedAt: null, lastNotifiedAt: null },
      }),
      prisma.jobAlertSentJob.deleteMany({ where: { alertId: id } }),
    ]);

    return Response.json(AlertResponse.parse(serializeJobAlert(row)));
  } catch (error) {
    console.error('Failed to update alert', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    await ensureJobAlertSchema();
    const alert = await prisma.jobAlert.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (alert) {
      await prisma.$transaction([
        prisma.jobAlertSentJob.deleteMany({ where: { alertId: id } }),
        prisma.jobAlert.delete({ where: { id } }),
      ]);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete alert', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
