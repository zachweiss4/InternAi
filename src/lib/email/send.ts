// Server-only sendEmail transport using Resend.

import 'server-only';
import { env } from '@/lib/env';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  // Thread a reply onto a received message (its company_emails id, from the /api/proxy/email/inbox
  // feed). Genuine replies skip the cold-send cap. Omit to start a new thread.
  replyToEmailId?: string;
}

export interface SendEmailResult {
  // company_emails id of the stored outbound message. Empty string when the recipient was
  // suppressed (unsubscribed/bounced) - the proxy accepted the call but sent nothing.
  id: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const body =
    input.text ??
    input.html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  if (!env.RESEND_API_KEY) {
    throw new Error('Email is not configured. Set RESEND_API_KEY.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: body,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`resend send failed: ${res.status} ${detail}`.trim());
  }
  const json = (await res.json()) as { id?: string };
  return { id: json.id ?? '' };
}
