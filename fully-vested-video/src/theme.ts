/**
 * THEME: the one place to change the brand.
 * Colors, fonts, series wording and timings all live here.
 * Per-episode text (title, CTA, URL, disclosure) lives in ../episode.json.
 */

export const theme = {
  colors: {
    blue: '#006298', // primary
    navy: '#1B365D', // background
    white: '#FFFFFF',
    neutral: '#F4F6F8', // light neutral for secondary text and the logo plate
    // Preview-only guide color. Never appears in a final render.
    guide: '#FF5CA8',
  },

  fonts: {
    // Font files live in public/fonts. To swap a font, drop the new .woff2
    // files there and update the file names in src/fonts.ts.
    serif: 'Playfair Display',
    sans: 'Inter',
  },

  series: {
    wordmark: 'FULLY VESTED',
    tagline: 'Equity comp, made clear.',
    episodeLabel: 'Episode',
    // The vesting bar: 4 years, each split into quarters.
    years: 4,
    quartersPerYear: 4,
    yearLabel: 'Year',
  },

  timing: {
    fps: 30,
    introSeconds: 3.5,
    outroSeconds: 12,
    // Clean hold at the end of the intro so the editor can cut on it.
    introHoldFrames: 10,
    // How many frames the 4 segments take to merge into one bar.
    mergeFrames: 12,
    // How many frames the wordmark takes to resolve.
    wordmarkFrames: 18,
  },

  // Platform UI zones the layout keeps clear. Shown as guides in preview only.
  safeZones: {
    // Shorts and Reels cover the bottom and the right edge with their own UI.
    verticalBottom: 420,
    verticalRight: 150,
    verticalTop: 220,
  },
} as const;

export const sec = (seconds: number) => Math.round(seconds * theme.timing.fps);

/** House rule: no em dashes in on-screen text, even if one is typed into a prop. */
export const clean = (text: string | number | null | undefined): string =>
  String(text ?? '')
    .replace(/\s*[—―]\s*/g, ', ')
    .trim();
