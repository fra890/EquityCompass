/**
 * Single source of pacing.
 *
 * Each narration line gets a slot as long as its voice clip (src/voDurations.json,
 * written by scripts/makeVoiceover.py) plus GAP. A scene lasts as long as its
 * lines plus LEAD and TAIL, or `min` seconds if that is longer. Scene
 * animations key off `cue(scene, lineIndex)`, so visuals stay in step with
 * the words whatever you change here.
 *
 * To tweak pacing: change LEAD / GAP / TAIL, or a scene's `min` / `extra`.
 */
import { SCENE_IDS, type SceneId } from "./sceneIds";
import { SCRIPT, stripMarks } from "./script";
import voDurations from "./voDurations.json";

export type { SceneId };
export const FPS = 30;

export const LEAD = 0.2; // silence before a scene's first line
export const GAP = 0.2; // pause between lines
export const TAIL = 0.3; // hold after a scene's last line

/** `min`: shortest the scene may be. `extra`: added hold at the end. */
export const SCENE_PACING: Record<SceneId, { min: number; extra: number }> = {
  hook: { min: 4.5, extra: 0 },
  iso: { min: 7, extra: 0 },
  roads: { min: 9, extra: 0 },
  trap: { min: 8, extra: 0.1 },
  refund: { min: 8, extra: 0 },
  intersection: { min: 14, extra: 0 },
  principle: { min: 4.2, extra: 0 },
  endcard: { min: 3.4, extra: 0 },
  disclosure: { min: 4.4, extra: 0 }, // hold at least 4s
};

/** Seconds a line takes to say: the voice clip if there is one, else an estimate. */
const lineSeconds = (id: string, text: string) =>
  (voDurations as Record<string, number>)[id] ?? Math.max(1.6, stripMarks(text).length / 16);

export type TimedLine = { id: string; text: string; hero?: boolean; at: number; to: number; speak: number };

const round1 = (n: number) => Math.ceil(n * 10) / 10;
export const f = (seconds: number) => Math.round(seconds * FPS);

const built = (() => {
  let cursor = 0;
  const lines = {} as Record<SceneId, TimedLine[]>;
  const timing = {} as Record<SceneId, { from: number; duration: number; startSec: number; seconds: number }>;
  for (const id of SCENE_IDS) {
    let t = LEAD;
    const timed: TimedLine[] = SCRIPT[id].map((l, i) => {
      const speak = lineSeconds(`${id}_${i}`, l.text);
      const line = { id: `${id}_${i}`, ...l, at: t, to: t + speak + GAP, speak };
      t += speak + GAP;
      return line;
    });
    const seconds = round1(Math.max(SCENE_PACING[id].min, t - GAP + TAIL) + SCENE_PACING[id].extra);
    if (timed.length) timed[timed.length - 1].to = seconds;
    lines[id] = timed;
    timing[id] = { from: f(cursor), duration: f(seconds), startSec: cursor, seconds };
    cursor = Math.round((cursor + seconds) * 10) / 10;
  }
  return { lines, timing, total: cursor };
})();

export const LINES = built.lines;
export const SCENE_TIMING = built.timing;
export const SCENES = SCENE_IDS.map((id) => ({ id, seconds: built.timing[id].seconds }));
export const TOTAL_SECONDS = built.total;
export const TOTAL_FRAMES = f(TOTAL_SECONDS);

/** Scene-relative start time (seconds) of narration line `i`; scenes animate from these. */
export const cue = (scene: SceneId, i: number) => LINES[scene][i].at;
/** Scene length in seconds. */
export const sceneSeconds = (scene: SceneId) => SCENE_TIMING[scene].seconds;

/**
 * Scene-relative second(s) used for each scene's review still, counted back
 * from the end of the scene (or from a cue) so they survive retiming.
 */
export const STILL_AT: Record<SceneId, number[]> = {
  hook: [sceneSeconds("hook") - 0.6],
  iso: [sceneSeconds("iso") - 0.6],
  roads: [sceneSeconds("roads") - 0.9],
  trap: [sceneSeconds("trap") - 0.6],
  refund: [sceneSeconds("refund") - 0.6],
  intersection: [cue("intersection", 3) - 0.5, sceneSeconds("intersection") - 0.6],
  principle: [sceneSeconds("principle") - 0.6],
  endcard: [sceneSeconds("endcard") - 0.6],
  disclosure: [3],
};
