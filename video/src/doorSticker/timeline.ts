/**
 * Pacing for "Loaded to the door sticker". There is no narration, so each
 * caption stays up for a reading-speed estimate (CHARS_PER_SECOND) plus GAP.
 * A scene lasts as long as its captions plus LEAD and TAIL, or `min` seconds
 * if that is longer. Scene animations key off `cue(scene, lineIndex)`.
 *
 * To tweak pacing: change the constants below, a scene's `min` / `extra`,
 * or put `secs` on a line in script.ts to pin its length.
 */
import { buildTimeline, type Pacing } from "../lib/buildTimeline";
import { SCENE_IDS, SCRIPT, type SceneId } from "./script";

export type { SceneId };
export const FPS = 30;

export const LEAD = 0.2;
export const GAP = 0.2;
export const TAIL = 0.3;
export const CHARS_PER_SECOND = 21;

export const SCENE_PACING: Record<SceneId, Pacing> = {
  hook: { min: 6, extra: 0 },
  squeeze: { min: 10, extra: 0 },
  wants: { min: 7, extra: 0 },
  coworkers: { min: 7, extra: 0 },
  planTender: { min: 4.6, extra: 0 },
  planLots: { min: 4.8, extra: 0 },
  planWithholding: { min: 5, extra: 0 },
  planDebt: { min: 4.6, extra: 0 },
  planBackstop: { min: 4.6, extra: 0 },
  truck: { min: 8.4, extra: 0 },
  cost: { min: 8, extra: 0 },
  principle: { min: 5, extra: 0 },
  endcard: { min: 3.4, extra: 0 },
  disclosure: { min: 4.4, extra: 0 }, // hold at least 4s
};

const built = buildTimeline(SCENE_IDS, SCRIPT, SCENE_PACING, {
  fps: FPS,
  lead: LEAD,
  gap: GAP,
  tail: TAIL,
  charsPerSecond: CHARS_PER_SECOND,
});

export const f = built.f;
export const LINES = built.lines;
export const SCENE_TIMING = built.timing;
export const SCENES = built.scenes;
export const TOTAL_SECONDS = built.totalSeconds;
export const TOTAL_FRAMES = built.totalFrames;
export const cue = built.cue;
export const sceneSeconds = built.sceneSeconds;

/** Scene-relative second(s) for each scene's review still. */
export const STILL_AT: Record<SceneId, number[]> = Object.fromEntries(
  SCENE_IDS.map((id) => [id, [sceneSeconds(id) - 0.5]]),
) as Record<SceneId, number[]>;
STILL_AT.truck = [cue("truck", 1) + 0.3, sceneSeconds("truck") - 0.4];
STILL_AT.disclosure = [3];
