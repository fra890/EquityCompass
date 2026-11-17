import React from 'react';
import {Img, staticFile} from 'remotion';
import {sans} from '../fonts';
import {theme} from '../theme';
import {useStaticFileExists} from './useStaticFileExists';

/**
 * The firm logo on a light plate (the logo artwork is dark, so it needs a
 * light background to stay legible on navy). Falls back to a placeholder
 * rectangle if the file is missing from /public.
 */
export const Logo: React.FC<{file: string | null | undefined; width: number}> = ({
  file,
  width,
}) => {
  const exists = useStaticFileExists(file);
  const height = Math.round(width * 0.25);
  if (exists === null) return <div style={{width, height}} />;

  if (!exists || !file) {
    return (
      <div
        style={{
          width,
          height,
          boxSizing: 'border-box',
          border: `2px dashed ${theme.colors.neutral}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: sans,
          fontSize: Math.round(height * 0.24),
          letterSpacing: '0.12em',
          color: theme.colors.neutral,
          opacity: 0.8,
        }}
      >
        LOGO: public/tidemark-logo.png
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        boxSizing: 'border-box',
        padding: `${Math.round(height * 0.24)}px ${Math.round(width * 0.07)}px`,
        backgroundColor: theme.colors.neutral,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={staticFile(file)}
        style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
      />
    </div>
  );
};
