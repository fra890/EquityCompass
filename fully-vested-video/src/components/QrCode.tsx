import QRCode from 'qrcode';
import React, {useMemo} from 'react';
import {sans} from '../fonts';
import {theme} from '../theme';

/** QR code drawn as vectors, navy on a white plate with a proper quiet zone. */
export const QrCode: React.FC<{value: string; size: number; label?: string}> = ({
  value,
  size,
  label,
}) => {
  const qr = useMemo(() => QRCode.create(value, {errorCorrectionLevel: 'M'}), [value]);
  const n = qr.modules.size;
  const quiet = 3;
  const total = n + quiet * 2;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(x, y)) {
        rects.push(<rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width={1.02} height={1.02} />);
      }
    }
  }
  return (
    <div style={{width: size}}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${total} ${total}`}
        shapeRendering="crispEdges"
        style={{display: 'block', backgroundColor: theme.colors.white, borderRadius: 8}}
      >
        <g fill={theme.colors.navy}>{rects}</g>
      </svg>
      {label ? (
        <div
          style={{
            marginTop: 12,
            textAlign: 'center',
            fontFamily: sans,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            color: theme.colors.neutral,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
