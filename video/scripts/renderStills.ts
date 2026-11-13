/**
 * One PNG still per scene, for both formats, into out/stills/.
 *   npm run stills            (all scenes)
 *   npm run stills -- trap    (one scene)
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { FPS, SCENES, SCENE_TIMING, STILL_AT } from "../src/timeline";

const main = async () => {
  mkdirSync("out/stills", { recursive: true });
  const only = process.argv[2];
  const browserExecutable = process.env.REMOTION_CHROME || undefined;
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  for (const [id, tag] of [
    ["IsoAmt4x5", "4x5"],
    ["IsoAmt1x1", "1x1"],
  ] as const) {
    const composition = await selectComposition({ serveUrl, id, browserExecutable });
    for (const [i, scene] of SCENES.entries()) {
      if (only && only !== scene.id) continue;
      const times = [STILL_AT[scene.id]].flat();
      for (const [k, sec] of times.entries()) {
        const frame = SCENE_TIMING[scene.id].from + Math.round(sec * FPS);
        const suffix = times.length > 1 ? String.fromCharCode(97 + k) : "";
        const output = `out/stills/${String(i + 1).padStart(2, "0")}${suffix}_${scene.id}_${tag}.png`;
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
