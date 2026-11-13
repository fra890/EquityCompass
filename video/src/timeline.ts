/**
 * Single source of pacing. Change a scene's `seconds` and everything
 * downstream (scene starts, total duration, captions, voiceover script)
 * shifts with it. Caption timings live in script.ts, relative to each scene.
 */
export const FPS = 30;

export const SCENES = [
  { id: "hook", seconds: 6 },
  { id: "iso", seconds: 10 },
  { id: "roads", seconds: 13 },
  { id: "trap", seconds: 12 },
  { id: "refund", seconds: 11 },
  { id: "intersection", seconds: 19 },
  { id: "principle", seconds: 6 },
  { id: "endcard", seconds: 5 },
  { id: "disclosure", seconds: 6 }, // hold at least 4s
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

export const f = (seconds: number) => Math.round(seconds * FPS);

export const SCENE_TIMING = (() => {
  let cursor = 0;
  const out = {} as Record<SceneId, { from: number; duration: number; startSec: number; seconds: number }>;
  for (const s of SCENES) {
    out[s.id] = { from: f(cursor), duration: f(s.seconds), startSec: cursor, seconds: s.seconds };
    cursor += s.seconds;
  }
  return out;
})();

export const TOTAL_SECONDS = SCENES.reduce((a, s) => a + s.seconds, 0);
export const TOTAL_FRAMES = f(TOTAL_SECONDS);

/** Frame (within the whole video) used for each scene's review still. */
export const STILL_AT: Record<SceneId, number | number[]> = {
  hook: 5.2,
  iso: 9.2,
  roads: 11.5,
  trap: 10.5,
  refund: 10,
  intersection: [10.6, 18.2],
  principle: 4.5,
  endcard: 4,
  disclosure: 3,
};
