import React from 'react';
import {getRemotionEnvironment} from 'remotion';
import {sans} from '../fonts';
import {theme} from '../theme';

/** Guides show in the Studio preview only, unless a prop forces them on or off. */
export const useShowGuides = (override: boolean | undefined) => {
  if (typeof override === 'boolean') return override;
  return !getRemotionEnvironment().isRendering;
};

export const Guide: React.FC<{
  label: string;
  note?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  round?: boolean;
  fontSize?: number;
}> = ({label, note, left, top, width, height, round, fontSize = 20}) => {
  const c = theme.colors.guide;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        boxSizing: 'border-box',
        border: `3px dashed ${c}`,
        borderRadius: round ? '50%' : 4,
        backgroundColor: `${c}14`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        textAlign: 'center',
        fontFamily: sans,
        color: c,
        padding: 10,
      }}
    >
      <div style={{fontSize, fontWeight: 600, letterSpacing: '0.12em'}}>{label}</div>
      {note ? <div style={{fontSize: fontSize * 0.8, fontWeight: 500}}>{note}</div> : null}
    </div>
  );
};
