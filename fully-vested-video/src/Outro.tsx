import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from './components/Backdrop';
import {Guide, useShowGuides} from './components/Guides';
import {Logo} from './components/Logo';
import {QrCode} from './components/QrCode';
import {VestingBar, vestingAt} from './components/VestingBar';
import {Wordmark, fadeUp} from './components/Wordmark';
import {sans} from './fonts';
import {Sting, type SceneSize} from './Intro';
import type {OutroProps} from './schema';
import {clean, sec, theme} from './theme';

type Box = {left: number; top: number; width: number; height: number};

/**
 * Two hand-built layouts. Every number is a pixel position on the final frame.
 * hostZone, slots, subscribe and platformUi are keep-clear zones: nothing is
 * drawn there in a render, they only show as dashed guides in preview.
 */
const landscape = {
  panel: {left: 720, top: 0, width: 1200, height: 932} as Box,
  strip: {left: 0, top: 932, width: 1920, height: 148} as Box,
  hostZone: {left: 0, top: 0, width: 720, height: 932} as Box,
  text: {left: 808, top: 112, width: 600},
  word: 58,
  barH: 10,
  name: 34,
  firm: 29,
  cta: 29,
  url: 31,
  qr: {left: 808, top: 622, size: 200},
  logo: {left: 1052, top: 737, width: 340},
  slots: [
    {left: 1464, top: 104, width: 392, height: 220},
    {left: 1464, top: 364, width: 392, height: 220},
  ] as Box[],
  subscribe: {left: 1575, top: 642, width: 170, height: 170} as Box,
  platformUi: [] as Array<Box & {label: string}>,
  disclosure: {left: 96, top: 932, width: 1728, height: 148, size: 24, align: 'center' as const},
};

const portrait = {
  panel: {left: 0, top: 740, width: 1080, height: 1180} as Box,
  strip: null as Box | null,
  hostZone: {left: 0, top: 0, width: 1080, height: 740} as Box,
  text: {left: 80, top: 806, width: 820},
  word: 78,
  barH: 12,
  name: 36,
  firm: 30,
  cta: 30,
  url: 32,
  qr: {left: 716, top: 1046, size: 184},
  logo: {left: 80, top: 1556, width: 360},
  slots: [] as Box[],
  subscribe: null as Box | null,
  platformUi: [
    {
      left: 0,
      top: 1920 - theme.safeZones.verticalBottom,
      width: 1080,
      height: theme.safeZones.verticalBottom,
      label: 'SHORTS / REELS CAPTION AREA',
    },
    {
      left: 1080 - theme.safeZones.verticalRight,
      top: 900,
      width: theme.safeZones.verticalRight,
      height: 600,
      label: 'APP BUTTONS',
    },
  ] as Array<Box & {label: string}>,
  disclosure: {left: 80, top: 1322, width: 820, height: 170, size: 24, align: 'left' as const},
};

export const OutroScene: React.FC<OutroProps & SceneSize & {muted?: boolean}> = ({
  width,
  height,
  hostName,
  hostTitle,
  firmName,
  cta,
  url,
  disclosure,
  qrUrl,
  qrLabel,
  transparent,
  logoFile,
  audioFile,
  beatSeconds,
  showGuides,
  muted,
}) => {
  const frame = useCurrentFrame();
  const guides = useShowGuides(showGuides);
  const vertical = height > width;
  const L = vertical ? portrait : landscape;
  const {white, neutral, blue} = theme.colors;

  // Timing: bar completes on the beat (about 1s), then the card settles.
  const beat = sec(beatSeconds);
  const {progress, merge} = vestingAt(frame, {startFrame: 0, beatFrame: beat, startProgress: 0.5});
  const cardIn = transparent
    ? interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'})
    : 1;
  const t0 = beat + 2;

  const disclosureText = clean(disclosure);
  // Never below 22px. Long disclosures step down from 24 to 22 to fit.
  const disclosureSize = disclosureText.length > 400 ? 22 : L.disclosure.size;

  return (
    <AbsoluteFill>
      {/* Background. Opaque version fills the frame, alpha version leaves the host zone clear. */}
      <AbsoluteFill style={{opacity: cardIn}}>
        {transparent ? (
          <>
            <Backdrop
              style={{left: L.panel.left, top: L.panel.top, width: L.panel.width, height: L.panel.height}}
              glowAt="20% 85%"
            />
            {L.strip ? (
              <Backdrop
                style={{left: L.strip.left, top: L.strip.top, width: L.strip.width, height: L.strip.height}}
                glowAt="20% 0%"
              />
            ) : null}
          </>
        ) : (
          <Backdrop glowAt={vertical ? '30% 70%' : '55% 85%'} />
        )}
        {L.strip ? (
          <div
            style={{
              position: 'absolute',
              ...L.strip,
              backgroundColor: 'rgba(0,0,0,0.30)',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              boxSizing: 'border-box',
            }}
          />
        ) : null}
      </AbsoluteFill>

      {/* Wordmark, bar and contact block */}
      <div
        style={{
          position: 'absolute',
          left: L.text.left,
          top: L.text.top,
          width: L.text.width,
          opacity: cardIn,
          fontFamily: sans,
          color: white,
        }}
      >
        <Wordmark frame={frame} startFrame={t0} fontSize={L.word} align="left" />
        <div style={{marginTop: L.word * 0.5}}>
          <VestingBar
            width={L.text.width}
            height={L.barH}
            progress={progress}
            merge={merge}
            showLabels={false}
          />
        </div>

        <div style={{marginTop: L.name * 1.7, fontSize: L.name, fontWeight: 600, ...fadeUp(frame, t0 + 12)}}>
          {clean(hostName)}
          {clean(hostTitle) ? `, ${clean(hostTitle)}` : ''}
        </div>
        <div
          style={{
            marginTop: L.firm * 0.45,
            fontSize: L.firm,
            fontWeight: 400,
            color: neutral,
            ...fadeUp(frame, t0 + 18),
          }}
        >
          {clean(firmName)}
        </div>

        <div style={{marginTop: L.cta * 1.9, ...fadeUp(frame, t0 + 28)}}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: blue,
              border: '1px solid rgba(255,255,255,0.28)',
              borderRadius: 8,
              padding: `${L.cta * 0.62}px ${L.cta}px`,
              fontSize: L.cta,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {clean(cta)}
          </div>
        </div>
        <div
          style={{
            marginTop: L.url * 0.75,
            fontSize: L.url,
            fontWeight: 500,
            letterSpacing: '0.01em',
            ...fadeUp(frame, t0 + 34),
          }}
        >
          {clean(url)}
        </div>
      </div>

      <div style={{position: 'absolute', left: L.logo.left, top: L.logo.top, ...fadeUp(frame, t0 + 40)}}>
        <Logo file={logoFile} width={L.logo.width} />
      </div>

      {qrUrl ? (
        <div style={{position: 'absolute', left: L.qr.left, top: L.qr.top, ...fadeUp(frame, t0 + 40)}}>
          <QrCode value={qrUrl} size={L.qr.size} label={clean(qrLabel)} />
        </div>
      ) : null}

      {/* Compliance disclosure: always from the prop, never hardcoded. */}
      <div
        style={{
          position: 'absolute',
          left: L.disclosure.left,
          top: L.disclosure.top,
          width: L.disclosure.width,
          height: L.disclosure.height,
          display: 'flex',
          alignItems: vertical ? 'flex-start' : 'center',
          justifyContent: L.disclosure.align === 'center' ? 'center' : 'flex-start',
          textAlign: L.disclosure.align,
          fontFamily: sans,
          fontSize: disclosureSize,
          fontWeight: 400,
          lineHeight: 1.35,
          color: neutral,
          opacity: 0.92 * cardIn,
          overflow: 'hidden',
        }}
      >
        <div
          style={
            vertical
              ? {borderTop: '1px solid rgba(255,255,255,0.22)', paddingTop: 22, width: '100%'}
              : undefined
          }
        >
          {disclosureText}
        </div>
      </div>

      {guides ? (
        <>
          <Guide {...L.hostZone} label="HOST VIDEO SAFE ZONE" note="Preview guide only. Transparent in the alpha render." fontSize={26} />
          {L.slots.map((s, i) => (
            <Guide key={i} {...s} label={`END SCREEN VIDEO ${i + 1}`} note="YouTube element" />
          ))}
          {L.subscribe ? <Guide {...L.subscribe} round label="SUBSCRIBE" fontSize={17} /> : null}
          {L.platformUi.map((z) => (
            <Guide key={z.label} {...z} label={z.label} note="Keep clear" fontSize={18} />
          ))}
        </>
      ) : null}

      {muted ? null : <Sting file={audioFile} />}
    </AbsoluteFill>
  );
};

export const Outro: React.FC<OutroProps> = (props) => {
  const {width, height, durationInFrames} = useVideoConfig();
  return <OutroScene {...props} width={width} height={height} durationInFrames={durationInFrames} />;
};
