# ISO / AMT explainer video

A ~88 second animated explainer (Remotion, TypeScript) for native LinkedIn posting.
Captions are burned in; there is no narration track.

**DRAFT. Advertising under the SEC Marketing Rule: requires CCO approval before use.**

## Deliverables

| File | What |
| --- | --- |
| `out/iso_amt_4x5.mp4` | 1080x1350, 30fps, H.264. Main LinkedIn feed cut. |
| `out/iso_amt_1x1.mp4` | 1080x1080 variant, same scenes. |
| `out/stills/` | One PNG per scene per format (scene 6 has two: `06a`, `06b`). |
| `numbers.md` | Every computed value, exact and as rounded on screen. |
| `voiceover_script.txt` | Timed narration lines, for recording later. |

## Commands

```bash
cd video
npm install

npm run numbers      # print the numbers table; rewrite numbers.md + voiceover_script.txt
npm run stills       # one PNG per scene -> out/stills/   (npm run stills -- trap  for one scene)
npm run render:4x5   # out/iso_amt_4x5.mp4
npm run render:1x1   # out/iso_amt_1x1.mp4
npm run render       # numbers + both MP4s
npm run studio       # live preview / scrubbing in the browser
```

Music bed (off by default, silent track otherwise):

```bash
npm run render:4x5 -- --props='{"music":true,"musicVolume":0.5}'
```

`public/ambient.mp3` is a synthesized sine-tone pad made by `npm run music` (nothing to license).
Swap in your own royalty-free file under the same name if you want something else.

If Remotion cannot download its own browser, point it at a local Chrome Headless Shell:

```bash
export REMOTION_CHROME=/path/to/chrome-headless-shell
```

## Where to change things

| To change | Edit |
| --- | --- |
| Scene lengths / pacing | `src/timeline.ts` (`SCENES`; everything downstream shifts) |
| Caption / narration copy and line timing | `src/script.ts` |
| Tax parameters and the hypothetical employee | `src/taxModel.ts` (`TAX_CONFIG`, `SCENARIO`; look for `FRANK: VERIFY`) |
| Rounding on screen | `src/numbers.ts` |
| Colors and fonts | `src/theme.ts` |
| A scene's visuals | `src/scenes/<Scene>.tsx` (one component per scene) |
| Disclosure text | `src/script.ts` (`DISCLOSURE_TEXT`, `DISCLOSURE_FIRM_LINE`) |

No number is typed into a scene. Change `taxModel.ts`, run `npm run numbers`, re-render.

## Notes

- Charts are SVG drawn in React. The only image is the Tidemark logo on the end card (`public/tidemark_logo.jpg`).
- Fonts (Inter Tight, Inter) are bundled from npm via `@fontsource`, so rendering works offline.
- No company logos or brand marks, no photos of people, no 409A values, tender prices, or vest dates.
