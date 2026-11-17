# Explainer videos (Remotion)

Three animated explainers for native LinkedIn posting, sharing one set of style components
(paper background, highlighter swipe, caption system, end card, disclosure card).
Captions are burned in; there is no narration.

1. **ISO / AMT** (`IsoAmt4x5`, `IsoAmt1x1`) — source in `src/`, ~90s.
2. **Loaded to the door sticker** (`DoorSticker4x5`, `DoorSticker1x1`) — source in `src/doorSticker/`, ~90s.
3. **Work log** (`WorkLog4x5`, `WorkLog1x1`) — what a few months of work for one couple were; source in `src/workLog/`, ~90s.

**DRAFTS. Advertising under the SEC Marketing Rule: each requires CCO approval before use.**

## Work log

| File | What |
| --- | --- |
| `out/work_log_4x5.mp4` | 1080x1350, 30fps, H.264. |
| `out/work_log_1x1.mp4` | 1080x1080 variant, same scenes. |
| `out/stills/work_log_*.png` | One PNG per scene per format (allocation and family have two each). |
| `voiceover_script_work_log.txt` | Timed caption lines. |

```bash
cd video
npm install
npm run stills:log         # review stills -> out/stills/work_log_*.png
npm run render:log:4x5     # out/work_log_4x5.mp4
npm run render:log:1x1     # out/work_log_1x1.mp4
npm run render:log         # script + both MP4s
npm run render:log:4x5 -- --props='{"music":false}'   # silent cut (music is on by default here)
```

Captions, figures and the disclosure text are in `src/workLog/script.ts`; pacing is in `src/workLog/timeline.ts`;
one component per section in `src/workLog/scenes/`.

## Loaded to the door sticker

| File | What |
| --- | --- |
| `out/door_sticker_4x5.mp4` | 1080x1350, 30fps, H.264. |
| `out/door_sticker_1x1.mp4` | 1080x1080 variant, same scenes. |
| `out/stills/door_sticker_*.png` | One PNG per scene per format (the truck has two: `10a`, `10b`). |
| `voiceover_script_door_sticker.txt` | Timed caption lines, for recording narration later. |

```bash
cd video
npm install
npm run stills:door        # review stills -> out/stills/door_sticker_*.png
npm run render:door:4x5    # out/door_sticker_4x5.mp4 (silent)
npm run render:door:1x1    # out/door_sticker_1x1.mp4 (silent)
npm run render:door        # script + both MP4s
npm run script:door        # rewrite voiceover_script_door_sticker.txt

# with the music bed (off by default for this video):
npm run render:door:4x5 -- --props='{"music":true,"musicVolume":0.6}'
```

| To change | Edit |
| --- | --- |
| Pacing | `src/doorSticker/timeline.ts` (`CHARS_PER_SECOND`, `LEAD`, `GAP`, `TAIL`, `SCENE_PACING`) |
| Captions, the quote, cost lines, disclosure | `src/doorSticker/script.ts` |
| Any figure on screen | `src/doorSticker/script.ts` (`FIG`). Figures are shown as given; nothing is summed or derived. |
| A scene's visuals | `src/doorSticker/scenes/<Scene>.tsx` |

The delivered MP4s were rendered with the music bed on. Run the plain render commands for a silent cut.

## ISO / AMT

### Deliverables

| File | What |
| --- | --- |
| `out/iso_amt_4x5.mp4` | 1080x1350, 30fps, H.264. Main LinkedIn feed cut. |
| `out/iso_amt_1x1.mp4` | 1080x1080 variant, same scenes. |
| `out/stills/` | One PNG per scene per format (scene 6 has two: `06a`, `06b`). |
| `numbers.md` | Every computed value, exact and as rounded on screen. |
| `voiceover_script.txt` | Timed narration lines, for recording your own voice. |

### Commands

```bash
cd video
npm install

npm run numbers      # print the numbers table; rewrite numbers.md + voiceover_script.txt
npm run stills       # one PNG per scene -> out/stills/   (npm run stills -- iso trap  for one scene)
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

### Where to change things

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
