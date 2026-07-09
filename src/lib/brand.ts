// @:user-owned - brand identity. Edit freely. `site.ts` re-exports
// siteName/siteDescription; `manifest.ts` + `opengraph-image.tsx` read `brandVisual`.

export const siteName = 'InternAI';
export const siteDescription =
  'Source-first internship search that helps students find real postings, understand fit, and act with clarity.';

// PWA + social-share colors. HEX only (the oklch() tokens in globals.css aren't
// readable here) - set to match your brand seed.
export const brandVisual = {
  /** PWA browser-UI / status-bar color. */
  themeColor: '#526b4b',
  /** PWA splash + install background. */
  backgroundColor: '#f2e7d2',
  /** Social-share (OG/Twitter) image. */
  og: {
    background: '#263023',
    foreground: '#fbf1df',
    /** Second line under the site name; '' hides it. */
    tagline: 'Find work worth growing into.',
  },
} as const;
