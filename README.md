# InternAI

InternAI is an AI powered platform I built to help university students discover, organize, and apply for internships more efficiently.

## Why I Built InternAI

I built InternAI because as someone who was trying to find an internship I found the process of searching for an internship super tedious. I believed there must be a way to automate it so I did that. I built InternAI to simplify that process by combining AI powered search, resume analysis, and application tracking into one platform focused on university students.

## Features

### Search
- Company-first internship discovery
- AI-powered search refinement

### Application Management
- Save internships
- Track applications

### Resume Tools
- Resume upload
- AI feedback

### Notifications
- Daily internship alerts

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 6
- PostgreSQL, tested with Neon on Vercel
- Better Auth
- Stripe
- Resend
- Vercel Blob
- Tailwind CSS
- Biome
- Vitest
## Architecture

```bash
Browser
     │
     ▼
Next.js Frontend
     │
     ▼
API Routes
     │
 ┌───┴────┐
 ▼        ▼
PostgreSQL   AI Services
     │
     ▼
Internship Search APIs
```
## Local Setup

Install Node.js 20+ and pnpm 11.

```bash
pnpm install
cp .env.example .env.local
```

Fill in the required variables in `.env.local`, then run:


pnpm db:migrate:dev
pnpm dev
```

Open `http://localhost:3000`.

## Required Environment Variables

For production on Vercel, set these at minimum:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
BETTER_AUTH_URL=
```

Recommended production variables:

```env
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
SERPAPI_API_KEY=
OPENAI_API_KEY=
BLOB_READ_WRITE_TOKEN=
RESEND_API_KEY=
RESEND_FROM=
STRIPE_SECRET_KEY=
STRIPE_BASIC_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
CRON_SECRET=
OWNER_EMAIL=
```

Do not commit `.env.local` or any real secrets. This repo only includes `.env.example`.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Vercel deployment checklist.

## Useful Commands

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm db:migrate:deploy
pnpm db:studio
```

## Notes

The search system prioritizes company career pages and verified public sources.
