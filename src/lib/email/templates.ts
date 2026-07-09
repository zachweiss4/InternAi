// @:user-owned - your email templates. Edit, add, or delete freely.
// Each template returns { subject, html, text }; send it via the framework transport:
//   import { sendEmail } from '@/lib/email/send';
//   import { welcomeEmail } from '@/lib/email/templates';
//   await sendEmail({ to: user.email, ...welcomeEmail({ name: user.name }) });
// renderEmail() is a plain inline-styled shell - email clients drop <style>/<link>, so style inline.
// renderEmail() auto-escapes its heading/body/cta/footer, so pass RAW values (don't escapeHtml() them
// first - that double-escapes). escapeHtml() is only for when you hand-build an html string yourself.

/** Subject + rendered bodies - spread into sendEmail({ to, ... }). */
export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

export interface RenderEmailOptions {
  heading: string;
  /** Body paragraphs (plain text; escaped for you). */
  body: string[];
  /** Optional call-to-action button. */
  cta?: { label: string; url: string };
  /** Optional footer line under the divider. */
  footer?: string;
}

/** Escape a value for safe interpolation into an HTML attribute or text node. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap content in a minimal, inline-styled email shell. Restyle to match the brand. */
export function renderEmail(options: RenderEmailOptions): { html: string; text: string } {
  const paragraphs = options.body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>`,
    )
    .join('');
  const button = options.cta
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(options.cta.url)}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;font-size:15px;">${escapeHtml(options.cta.label)}</a></p>`
    : '';
  const footer = options.footer
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;color:#999999;font-size:12px;">${escapeHtml(options.footer)}</div>`
    : '';
  const html = [
    '<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">',
    `<h1 style="margin:0 0 16px;color:#111111;font-size:22px;">${escapeHtml(options.heading)}</h1>`,
    paragraphs,
    button,
    footer,
    '</div>',
  ].join('');
  const text = [
    options.heading,
    '',
    ...options.body,
    ...(options.cta ? ['', `${options.cta.label}: ${options.cta.url}`] : []),
    ...(options.footer ? ['', options.footer] : []),
  ].join('\n');
  return { html, text };
}

// ─── Example templates - edit / add / remove to fit the app ───

/** Welcome email for a new signup. */
export function welcomeEmail(input: { name: string; ctaUrl?: string }): EmailContent {
  const { html, text } = renderEmail({
    heading: `Welcome to InternAI, ${input.name}!`,
    body: [
      "You're all set to find your next internship. Our AI matches you with roles that fit your skills, location, and goals.",
      'Start searching now and track every application in one place.',
    ],
    cta: input.ctaUrl
      ? { label: 'Search internships →', url: input.ctaUrl }
      : { label: 'Search internships →', url: 'https://internai.app/search' },
    footer: 'You received this because you created an InternAI account.',
  });
  return { subject: 'Welcome to InternAI - start your search', html, text };
}

/** Generic notification email. */
export function notificationEmail(input: {
  subject: string;
  title: string;
  lines: string[];
  cta?: { label: string; url: string };
}): EmailContent {
  const { html, text } = renderEmail({ heading: input.title, body: input.lines, cta: input.cta });
  return { subject: input.subject, html, text };
}

/** Job alert notification email - lists matching internships. */
export function jobAlertEmail(input: {
  name: string;
  field: string | null;
  fieldNames?: string[];
  companyNames?: string[];
  location: string | null;
  locations?: string[];
  season?: string | null;
  jobs: Array<{
    title: string;
    company: string;
    location: string;
    applyUrl: string;
    salaryMin?: number;
    salaryMax?: number;
  }>;
  searchUrl: string;
}): EmailContent {
  const {
    name,
    field,
    fieldNames = [],
    companyNames = [],
    location,
    locations = [],
    season,
    jobs,
    searchUrl,
  } = input;
  const fields = fieldNames.length > 0 ? fieldNames : field ? [field] : [];
  const fieldLabel = fields.length > 0 ? fields.join(', ') : 'any field';
  const companyLabel = companyNames.length > 0 ? companyNames.join(', ') : 'any company';
  const locationList = locations.length > 0 ? locations : location ? [location] : [];
  const locationLabel = locationList.length > 0 ? locationList.join(', ') : 'any location';
  const seasonLabel = season === 'summer' ? 'Summer' : season === 'fall' ? 'Fall' : 'any season';
  const subject = `New internships matching your alert: ${fieldLabel} in ${locationLabel}`;

  const jobItems = jobs
    .map((j) => {
      const salary =
        j.salaryMin && j.salaryMax
          ? ` · $${j.salaryMin.toLocaleString()}–$${j.salaryMax.toLocaleString()}`
          : '';
      return `<li style="margin-bottom:14px;"><a href="${escapeHtml(j.applyUrl)}" style="color:#111111;font-weight:600;text-decoration:underline;">${escapeHtml(j.title)}</a><br><span style="color:#555555;font-size:14px;">${escapeHtml(j.company)} · ${escapeHtml(j.location)}${salary}</span></li>`;
    })
    .join('');

  const html = [
    '<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;">',
    '<h1 style="margin:0 0 16px;color:#111111;font-size:22px;">New internships for you</h1>',
    `<p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)}, here are new ${escapeHtml(seasonLabel)} internships from <strong>${escapeHtml(companyLabel)}</strong> or matching <strong>${escapeHtml(fieldLabel)}</strong> in <strong>${escapeHtml(locationLabel)}</strong>:</p>`,
    `<ul style="padding-left:20px;color:#333333;font-size:15px;line-height:1.6;">${jobItems}</ul>`,
    `<p style="margin:24px 0 0;"><a href="${escapeHtml(searchUrl)}" style="display:inline-block;padding:10px 20px;background:#111111;color:#ffffff;text-decoration:none;font-size:15px;">Search more internships →</a></p>`,
    '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e5e5;color:#999999;font-size:12px;">You received this because you have a job alert set up on InternAI.</div>',
    '</div>',
  ].join('');

  const { text } = renderEmail({
    heading: `New internships: ${fieldLabel} in ${locationLabel}`,
    body: [
      `Hi ${name},`,
      `Here are new ${seasonLabel} internships from ${companyLabel} or matching ${fieldLabel} in ${locationLabel}:`,
      ...jobs.map(
        (j) =>
          `- ${j.title} at ${j.company} (${j.location})${j.salaryMin && j.salaryMax ? ` · $${j.salaryMin.toLocaleString()}–$${j.salaryMax.toLocaleString()}` : ''}: ${j.applyUrl}`,
      ),
    ],
    cta: { label: 'Search more internships →', url: searchUrl },
    footer: 'You received this because you have a job alert set up on InternAI.',
  });

  return { subject, html, text };
}
