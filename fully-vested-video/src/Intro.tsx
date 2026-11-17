import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {useStaticFileExists} from './components/useStaticFileExists';
import {VestingBar, vestingAt} from './components/VestingBar';
import {Wordmark, fadeUp} from './components/Wordmark';
import {sans} from './fonts';
import type {IntroProps} from './schema';
import {clean, sec, theme} from './theme';

export type SceneSize = {width: number; height: number; durationInFrames: number};

/** Optional sting. Renders silent when the file is not in /public. */
export const Sting: React.FC<{file: string | null | undefined}> = ({file}) => {
  const exists = useStaticFileExists(file);
  return exists && file ? <Audio src={staticFile(file)} /> : null;
};

export const IntroScene: React.FC<IntroProps & SceneSize & {muted?: boolean}> = ({
  width,
  height,
  durationInFrames,
  episodeNumber,
  episodeTitle,
  audioFile,
  beatSeconds,
  muted,
}) => {
  const frame = useCurrentFrame();
  const vertical = height > width;
  const {white, neutral} = theme.colors;

  // Layout, rebuilt per format (not a crop).
  const L = vertical
    ? {barW: 820, barH: 14, barY: 900, word: 92, wordGap: 84, tag: 38, tagGap: 70, label: 20, epY: 1250, epSize: 34}
    : {barW: 920, barH: 12, barY: 566, word: 104, wordGap: 76, tag: 34, tagGap: 62, label: 18, epY: 876, epSize: 30};

  // Timing. Everything keys off the beat so a sound designer can sync to it.
  const beat = sec(beatSeconds);
  const settled = durationInFrames - theme.timing.introHoldFrames;
  const {progress, merge} = vestingAt(frame, {startFrame: 6, beatFrame: beat});
  const barIn = fadeUp(frame, 0, 10, 0).opacity;
  const tagStart = Math.min(beat + 12, settled - 14);
  const epStart = Math.min(Math.max(beat + 9, durationInFrames - sec(1)), settled - 14);

  const number = clean(episodeNumber);
  const title = clean(episodeTitle);
  const hasEpisode = number !== '' || title !== '';

  const episodeLabel = (
    <span style={{fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase'}}>
      {theme.series.episodeLabel} {number}
    </span>
  );

  return (
    <AbsoluteFill>
      <Backdrop glowAt={vertical ? '50% 62%' : '30% 80%'} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          width,
          top: L.barY - L.wordGap - L.word,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Wordmark frame={frame} startFrame={beat + 2} fontSize={L.word} />
      </div>

      <div style={{position: 'absolute', left: (width - L.barW) / 2, top: L.barY, opacity: barIn}}>
        <VestingBar
          width={L.barW}
          height={L.barH}
          progress={progress}
          merge={merge}
          labelSize={L.label}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          width,
          top: L.barY + L.barH + L.tagGap - L.tag / 2,
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 400,
          fontSize: L.tag,
          letterSpacing: '0.02em',
          color: neutral,
          ...fadeUp(frame, tagStart),
        }}
      >
        {clean(theme.series.tagline)}
      </div>

      {hasEpisode ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            width,
            top: L.epY,
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: vertical ? 18 : 26,
            padding: '0 90px',
            boxSizing: 'border-box',
            textAlign: 'center',
            fontFamily: sans,
            fontSize: L.epSize,
            color: white,
            ...fadeUp(frame, epStart),
          }}
        >
          {number !== '' ? <div style={{fontSize: L.epSize * 0.74, opacity: 0.75}}>{episodeLabel}</div> : null}
          {number !== '' && title !== '' && !vertical ? (
            <div style={{width: 1, height: L.epSize * 1.1, backgroundColor: white, opacity: 0.4}} />
          ) : null}
          {title !== '' ? <div style={{fontWeight: 500}}>{title}</div> : null}
        </div>
      ) : null}

      {muted ? null : <Sting file={audioFile} />}
    </AbsoluteFill>
  );
};

export const Intro: React.FC<IntroProps> = (props) => {
  const {width, height, durationInFrames} = useVideoConfig();
  return <IntroScene {...props} width={width} height={height} durationInFrames={durationInFrames} />;
};
