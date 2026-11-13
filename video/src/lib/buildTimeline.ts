/**
 * Shared timeline builder. Each caption line gets a slot as long as it takes
 * to read (or say), plus a gap; a scene lasts as long as its lines plus lead
 * and tail, or `min` seconds if that is longer.
 */
export type Line = {
  text: string;
  /** The line is already the scene's large on-screen text, so no caption box. */
  hero?: boolean;
  /** Force this line's slot length in seconds instead of estimating it. */
  secs?: number;
};
export type TimedLine = Line & { id: string; at: number; to: number; speak: number };
export type Pacing = { min: number; extra: number };

export const stripMarks = (t: string) => t.replace(/\[\[|\]\]/g, "");

export function buildTimeline<Id extends string>(
  ids: readonly Id[],
  script: Record<Id, Line[]>,
  pacing: Record<Id, Pacing>,
  opts: {
    fps: number;
    lead: number;
    gap: number;
    tail: number;
    /** Measured clip lengths by line id (`<scene>_<n>`), if narration exists. */
    durations?: Record<string, number>;
    /** Reading speed used when there is no measured length. */
    charsPerSecond?: number;
  },
) {
  const f = (seconds: number) => Math.round(seconds * opts.fps);
  const cps = opts.charsPerSecond ?? 16;
  let cursor = 0;
  const lines = {} as Record<Id, TimedLine[]>;
  const timing = {} as Record<Id, { from: number; duration: number; startSec: number; seconds: number }>;
  for (const id of ids) {
    let t = opts.lead;
    const timed: TimedLine[] = script[id].map((l, i) => {
      const lineId = `${id}_${i}`;
      const speak = l.secs ?? opts.durations?.[lineId] ?? Math.max(1.6, stripMarks(l.text).length / cps);
      const line = { ...l, id: lineId, at: t, to: t + speak + opts.gap, speak };
      t += speak + opts.gap;
      return line;
    });
    const natural = timed.length ? t - opts.gap + opts.tail : 0;
    const seconds = Math.ceil((Math.max(pacing[id].min, natural) + pacing[id].extra) * 10) / 10;
    if (timed.length) timed[timed.length - 1].to = seconds;
    lines[id] = timed;
    timing[id] = { from: f(cursor), duration: f(seconds), startSec: cursor, seconds };
    cursor = Math.round((cursor + seconds) * 10) / 10;
  }
  return {
    f,
    lines,
    timing,
    scenes: ids.map((id) => ({ id, seconds: timing[id].seconds })),
    totalSeconds: cursor,
    totalFrames: f(cursor),
    /** Scene-relative start (seconds) of caption line `i`. */
    cue: (scene: Id, i: number) => lines[scene][i].at,
    sceneSeconds: (scene: Id) => timing[scene].seconds,
  };
}
