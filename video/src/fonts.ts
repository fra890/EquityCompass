import { continueRender, delayRender } from "remotion";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/inter-tight/800.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Fonts are bundled from npm (Google Fonts' Inter Tight + Inter), so renders
// work offline. Hold rendering until they are ready.
if (typeof document !== "undefined") {
  const handle = delayRender("Loading fonts");
  Promise.all(
    [
      '600 40px "Inter Tight"',
      '700 40px "Inter Tight"',
      '800 40px "Inter Tight"',
      '500 40px "Inter"',
      '600 40px "Inter"',
      '700 40px "Inter"',
    ].map((f) => document.fonts.load(f)),
  )
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
