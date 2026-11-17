// Renders every deliverable into /out.
//   npm run render       -> all videos and stills
//   npm run storyboard   -> approval storyboards only
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
const storyboardOnly = process.argv.includes('--storyboard');
// Optional: point at an existing Chrome if Remotion cannot download its own.
const browserExecutable = process.env.CHROME_PATH || null;

for (const [file, what] of [
  ['tidemark-logo.png', 'logo (a placeholder box will be shown)'],
  ['sting.mp3', 'audio sting (videos will render silent)'],
]) {
  if (!fs.existsSync(path.join(root, 'public', file))) {
    console.log(`Note: public/${file} not found. Rendering without the ${what}.`);
  }
}

console.log('Bundling project...');
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts')});

const comp = (id, inputProps = {}) =>
  selectComposition({serveUrl, id, inputProps, browserExecutable});

const video = async (id, file, opts = {}, inputProps = {}) => {
  const composition = await comp(id, inputProps);
  process.stdout.write(`Rendering ${file} ...`);
  await renderMedia({
    composition,
    serveUrl,
    inputProps,
    browserExecutable,
    codec: 'h264',
    crf: 16,
    outputLocation: path.join(out, file),
    ...opts,
  });
  console.log(' done');
};

const still = async (id, file, frame, inputProps = {}) => {
  const composition = await comp(id, inputProps);
  process.stdout.write(`Rendering ${file} ...`);
  await renderStill({
    composition,
    serveUrl,
    inputProps,
    browserExecutable,
    frame,
    imageFormat: 'png',
    output: path.join(out, file),
  });
  console.log(' done');
};

if (storyboardOnly) {
  await still('Storyboard-Intro', 'storyboard/storyboard-intro.png', 0);
  await still('Storyboard-Outro', 'storyboard/storyboard-outro.png', 0);
} else {
  const alpha = {
    codec: 'prores',
    proResProfile: '4444',
    pixelFormat: 'yuva444p10le',
    imageFormat: 'png',
    crf: undefined,
  };
  for (const f of ['16x9', '9x16']) {
    await video(`Intro-${f}`, `fully-vested-intro-${f}.mp4`);
    await video(`Outro-${f}`, `fully-vested-outro-${f}.mp4`, {}, {showGuides: false});
    await video(`Outro-${f}`, `fully-vested-outro-${f}-alpha.mov`, alpha, {
      transparent: true,
      showGuides: false,
    });
    // Thumbnail base: the settled end card (last frame), no guides.
    const last = (await comp(`Outro-${f}`)).durationInFrames - 1;
    await still(`Outro-${f}`, `fully-vested-endcard-${f}.png`, last, {showGuides: false});
  }
}

console.log(`\nAll files are in ${out}`);
