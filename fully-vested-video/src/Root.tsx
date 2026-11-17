import React from 'react';
import {Composition, Folder} from 'remotion';
import episode from '../episode.json';
import './fonts';
import {Intro} from './Intro';
import {Outro} from './Outro';
import {introSchema, outroSchema, type IntroProps, type OutroProps} from './schema';
import {Storyboard} from './Storyboard';
import {sec, theme} from './theme';

// Per-episode text comes from episode.json so the editor never touches code.
const introDefaults: IntroProps = {
  episodeNumber: episode.episodeNumber,
  episodeTitle: episode.episodeTitle,
  logoFile: episode.logoFile,
  audioFile: episode.audioFile,
  beatSeconds: episode.introBeatSeconds,
};

const outroDefaults: OutroProps = {
  hostName: episode.hostName,
  hostTitle: episode.hostTitle,
  firmName: episode.firmName,
  cta: episode.cta,
  url: episode.url,
  disclosure: episode.disclosure,
  transparent: false,
  logoFile: episode.logoFile,
  audioFile: episode.audioFile,
  beatSeconds: episode.outroBeatSeconds,
};

const formats = [
  {suffix: '16x9', width: 1920, height: 1080},
  {suffix: '9x16', width: 1080, height: 1920},
] as const;

export const Root: React.FC = () => {
  const {fps, introSeconds, outroSeconds} = theme.timing;
  return (
    <>
      {formats.map((f) => (
        <Composition
          key={`intro-${f.suffix}`}
          id={`Intro-${f.suffix}`}
          component={Intro}
          schema={introSchema}
          defaultProps={introDefaults}
          durationInFrames={sec(introSeconds)}
          fps={fps}
          width={f.width}
          height={f.height}
        />
      ))}
      {formats.map((f) => (
        <Composition
          key={`outro-${f.suffix}`}
          id={`Outro-${f.suffix}`}
          component={Outro}
          schema={outroSchema}
          defaultProps={outroDefaults}
          durationInFrames={sec(outroSeconds)}
          fps={fps}
          width={f.width}
          height={f.height}
        />
      ))}
      <Folder name="Storyboards">
        <Composition
          // A long duration so the frozen frames inside are not clamped.
          durationInFrames={sec(outroSeconds)}
          fps={fps}
          id="Storyboard-Intro"
          component={Storyboard}
          width={2400}
          height={1960}
          defaultProps={{
            kind: 'intro' as const,
            frames: [8, 30, 52, 66, 80, 104],
            introProps: introDefaults,
            outroProps: outroDefaults,
          }}
        />
        <Composition
          // A long duration so the frozen frames inside are not clamped.
          durationInFrames={sec(outroSeconds)}
          fps={fps}
          id="Storyboard-Outro"
          component={Storyboard}
          width={2400}
          height={1960}
          defaultProps={{
            kind: 'outro' as const,
            frames: [2, 16, 30, 44, 66, 359],
            introProps: introDefaults,
            outroProps: outroDefaults,
          }}
        />
      </Folder>
    </>
  );
};
