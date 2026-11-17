import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {theme} from './theme';

// Fonts are bundled locally (public/fonts) so renders work offline and never
// depend on a font server. Both families are open source (SIL OFL).
const files: Array<[family: string, file: string, weight: string]> = [
  [theme.fonts.serif, 'playfair-display-latin-500-normal.woff2', '500'],
  [theme.fonts.serif, 'playfair-display-latin-600-normal.woff2', '600'],
  [theme.fonts.sans, 'inter-latin-400-normal.woff2', '400'],
  [theme.fonts.sans, 'inter-latin-500-normal.woff2', '500'],
  [theme.fonts.sans, 'inter-latin-600-normal.woff2', '600'],
];

if (typeof window !== 'undefined') {
  for (const [family, file, weight] of files) {
    loadFont({family, url: staticFile(`fonts/${file}`), weight}).catch((err) =>
      console.error('Font failed to load', file, err),
    );
  }
}

export const serif = `'${theme.fonts.serif}', Georgia, serif`;
export const sans = `'${theme.fonts.sans}', Helvetica, Arial, sans-serif`;
