# Fully Vested: intro and outro

Reusable intro and end card for the "Fully Vested" video series, built with
[Remotion](https://www.remotion.dev) (React + TypeScript).

You do not need to know how to code to use this. You edit one text file and
run one command.

## One-time setup

1. Install [Node.js](https://nodejs.org) (the "LTS" version).
2. Open a terminal in this folder (`fully-vested-video`) and run:

   ```
   npm install
   ```

## Change the text for an episode

Open **`episode.json`** in any text editor. Change the words between the
quotes, save, then re-render (next section).

| Line in episode.json | What it changes |
| --- | --- |
| `episodeNumber` | Number shown in the last second of the intro. Use `null` to hide it. |
| `episodeTitle` | Title shown in the last second of the intro. Use `""` to hide it. |
| `cta` | Call to action button on the end card. |
| `url` | Web address under the button. |
| `disclosure` | Compliance text on the end card. Paste the CCO-approved wording here. |
| `hostName`, `hostTitle`, `firmName` | Name lines on the end card. |
| `logoFile` | File name of the logo inside the `public` folder. |
| `audioFile` | File name of the sting inside the `public` folder. |
| `introBeatSeconds` | The moment the bar completes in the intro (default 2.2). |
| `outroBeatSeconds` | The moment the bar completes in the outro (default 1.0). |

Rules of thumb:

- Keep the quotes and the comma at the end of each line.
- Do not type em dashes. If one slips in, it is replaced with a comma on screen.
- The disclosure never drops below 22px. About 400 characters fit comfortably;
  check the end card PNG after rendering if yours is longer.

## Re-render everything (the one command)

```
npm run render
```

Files land in the `out` folder:

| File | Use |
| --- | --- |
| `fully-vested-intro-16x9.mp4` | Intro for YouTube and LinkedIn (1920x1080) |
| `fully-vested-intro-9x16.mp4` | Intro for Shorts and Reels (1080x1920) |
| `fully-vested-outro-16x9.mp4` | End card on a solid navy background |
| `fully-vested-outro-9x16.mp4` | Vertical end card on a solid navy background |
| `fully-vested-outro-16x9-alpha.mov` | ProRes 4444 with transparency. Lay it over the host footage. |
| `fully-vested-outro-9x16-alpha.mov` | Vertical version of the same |
| `fully-vested-endcard-16x9.png` | Still of the end card, thumbnail base |
| `fully-vested-endcard-9x16.png` | Vertical still |

The first render downloads a small copy of Chrome and takes a little longer.

## Swap the logo

Drop the logo into the `public` folder and name it **`tidemark-logo.png`**
(replace the existing file). A wide PNG with a transparent background works
best. If the file is missing, the end card shows a dashed placeholder box
instead of failing.

The logo artwork is dark, so it sits on a light plate to stay readable on navy.

## Add the audio sting

Drop the sound file into `public` and name it **`sting.mp3`**. If the file is
missing the videos render silent. The bar finishes filling exactly at
`introBeatSeconds` (2.2 seconds by default), so the sound designer should place
the hit there. Change the number if the hit lands somewhere else.

## Preview while you edit (optional)

```
npm run studio
```

This opens a preview in your browser. The pink dashed boxes (host video zone,
YouTube end screen slots, subscribe button, Shorts and Reels app areas) are
guides. They show in the preview only and never appear in rendered files.

To get the approval storyboards again: `npm run storyboard`
(saved in `out/storyboard`).

## Using the end card in the edit

- **Host video zone:** left 720px of the frame in 16:9, top 740px in 9:16. It is
  transparent in the `.mov` files, so put the alpha file on the track above the
  host footage. The `.mp4` versions are solid navy there (MP4 cannot carry
  transparency).
- **YouTube end screen:** in YouTube Studio, place the two video elements and
  the subscribe button on the empty areas at the right of the card (see the
  guides in the preview). No text sits under them.
- **Shorts and Reels:** the bottom 420px and the right edge are kept clear for
  the app's own buttons and captions. YouTube end screens do not exist on Shorts.
- **Intro:** the last 10 frames are a clean hold, so cut straight to the host.

## Change the brand (developers)

Everything brand related is in **`src/theme.ts`**: colors, font names, series
wordmark and tagline, durations, and safe zone sizes. Font files are in
`public/fonts` and registered in `src/fonts.ts`.

| Path | What it is |
| --- | --- |
| `episode.json` | Per-episode text. The only file an editor needs. |
| `src/theme.ts` | Brand colors, fonts, wording, timings |
| `src/Intro.tsx` | Intro composition (both formats) |
| `src/Outro.tsx` | End card composition, with the two layouts at the top |
| `src/components/VestingBar.tsx` | The vesting bar animation |
| `scripts/render-all.mjs` | What `npm run render` runs |

## Licence note

Remotion is free for individuals and very small companies. Larger companies
need a paid company licence: see https://www.remotion.dev/license. Playfair
Display and Inter are open source (SIL Open Font License).
