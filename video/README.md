# ISO / AMT explainer video

A ~90 second animated explainer (Remotion, TypeScript) for native LinkedIn posting.
Captions are burned in and a soft music bed plays underneath; there is no narration.

**DRAFT. Advertising under the SEC Marketing Rule: requires CCO approval before use.**

## Deliverables

| File | What |
| --- | --- |
| `out/iso_amt_4x5.mp4` | 1080x1350, 30fps, H.264. Main LinkedIn feed cut. |
| `out/iso_amt_1x1.mp4` | 1080x1080 variant, same scenes. |
| `out/stills/` | One PNG per scene per format (scene 6 has two: `06a`, `06b`). |
| `numbers.md` | Every computed value, exact and as rounded on screen. |
| `voiceover_script.txt` | Timed narration lines, for recording your own voice. |

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

Audio options (pass as props to either render command):

```bash
npm run render:4x5 -- --props='{"music":false}'                      # silent cut, captions only
npm run render:4x5 -- --props='{"musicVolume":0.4}'                  # quieter music
npm run render:4x5 -- --props='{"voiceover":true,"musicVolume":0.18}' # add narration over the music
```

- **Music** is on by default. `public/ambient.mp3` is a soft ambient bed synthesized from scratch by
  `npm run music` (`scripts/makeMusic.py`), so there is nothing to license. Swap in your own royalty-free
  file under the same name if you want something else.
- **Narration** is off by default; the video is captions and music only. The clips in `public/vo/` are
  synthetic placeholders (`scripts/makeVoiceover.py`). Their lengths in `src/voDurations.json` set how long each
  caption stays up, so the pacing matches a comfortable read. To add your own voice, record each line from
  `voiceover_script.txt`, save it over the matching `public/vo/<scene>_<n>.mp3`, update its length in
  `src/voDurations.json`, and render with `"voiceover":true`.

If Remotion cannot download its own browser, point it at a local Chrome Headless Shell:

```bash
export REMOTION_CHROME=/path/to/chrome-headless-shell
```

## Where to change things

| To change | Edit |
| --- | --- |
| Scene lengths / pacing | `src/timeline.ts` (`LEAD`, `GAP`, `TAIL`, `SCENE_PACING`; scenes are as long as their narration plus these) |
| Caption / narration copy | `src/script.ts` (then `npm run numbers`, and regenerate or re-record the changed clips) |
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
