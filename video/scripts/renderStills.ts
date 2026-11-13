/**
 * One PNG still per scene, for both formats, into out/stills/.
 *   npm run stills                 ISO/AMT video, all scenes
 *   npm run stills -- iso trap     ISO/AMT video, one scene
 *   npm run stills:door            door-sticker video, all scenes
 *   npm run stills -- door truck   door-sticker video, one scene
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import * as door from "../src/doorSticker/timeline";
import * as iso from "../src/timeline";

const VIDEOS = {
  iso: { comp: "IsoAmt", prefix: "", t: iso },
  door: { comp: "DoorSticker", prefix: "door_sticker_", t: door },
} as const;

const main = async () => {
  mkdirSync("out/stills", { recursive: true });
  const which = (process.argv[2] as keyof typeof VIDEOS) || "iso";
  const only = process.argv[3];
  const v = VIDEOS[which];
  if (!v) throw new Error(`unknown video "${which}" (use iso or door)`);
  const timing = v.t.SCENE_TIMING as Record<string, { from: number }>;
  const stillAt = v.t.STILL_AT as Record<string, number[]>;
  const browserExecutable = process.env.REMOTION_CHROME || undefined;
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  for (const tag of ["4x5", "1x1"]) {
    const composition = await selectComposition({ serveUrl, id: `${v.comp}${tag}`, browserExecutable });
    for (const [i, scene] of v.t.SCENES.entries()) {
      if (only && only !== scene.id) continue;
      const times = stillAt[scene.id];
      for (const [k, sec] of times.entries()) {
        const frame = timing[scene.id].from + Math.round(sec * v.t.FPS);
        const suffix = times.length > 1 ? String.fromCharCode(97 + k) : "";
        const output = `out/stills/${v.prefix}${String(i + 1).padStart(2, "0")}${suffix}_${scene.id}_${tag}.png`;
        await renderStill({ composition, serveUrl, output, frame, imageFormat: "png", browserExecutable });
        console.log("wrote", output);
      }
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
