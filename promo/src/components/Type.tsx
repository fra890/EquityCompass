import React from 'react';
import {useCurrentFrame} from 'remotion';
import {color, font} from '../theme';
import {easeOut} from '../motion';

// Every number on screen: JetBrains Mono, tabular.
export const Num: React.FC<{children: React.ReactNode; scale?: number}> = ({children, scale = 0.9}) => (
	<span
		style={{
			fontFamily: font.mono,
			fontVariantNumeric: 'tabular-nums',
			fontSize: `${scale}em`,
			fontWeight: 500,
			letterSpacing: '-0.03em',
		}}
	>
		{children}
	</span>
);

// The accent: a blue plate that wipes in behind off-white text. Blue text on
// navy fails contrast (1.9:1); off-white on blue is 6:1 and stays on-palette.
export const Plate: React.FC<{children: React.ReactNode; at: number; dur?: number}> = ({children, at, dur = 14}) => {
	const frame = useCurrentFrame();
	const p = easeOut(frame, at, dur);
	return (
		<span style={{position: 'relative', display: 'inline-block', padding: '0 0.12em', margin: '0 -0.02em'}}>
			<span
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: '0.08em',
					bottom: '0.04em',
					background: color.blue,
					transform: `scaleX(${p})`,
					transformOrigin: 'left center',
				}}
			/>
			<span style={{position: 'relative'}}>{children}</span>
		</span>
	);
};

// Parses the {mono} / [accent] markup from copy.ts.
export const Rich: React.FC<{text: string; accentAt?: number}> = ({text, accentAt = 0}) => {
	const render = (s: string, key: string): React.ReactNode[] =>
		s
			.split(/(\{[^}]+\})/)
			.filter(Boolean)
			.map((part, i) =>
				part.startsWith('{') ? <Num key={`${key}-${i}`}>{part.slice(1, -1)}</Num> : <span key={`${key}-${i}`}>{part}</span>,
			);
	return (
		<>
			{text
				.split(/(\[[^\]]+\])/)
				.filter(Boolean)
				.map((part, i) =>
					part.startsWith('[') ? (
						<Plate key={i} at={accentAt}>
							{render(part.slice(1, -1), `a${i}`)}
						</Plate>
					) : (
						render(part, `t${i}`)
					),
				)}
		</>
	);
};

// Masked reveal from below. `out` (optional) slides the line up and away.
export const MaskLine: React.FC<{
	children: React.ReactNode;
	at: number;
	dur?: number;
	out?: number;
	style?: React.CSSProperties;
}> = ({children, at, dur = 16, out, style}) => {
	const frame = useCurrentFrame();
	const inP = easeOut(frame, at, dur);
	const outP = out === undefined ? 0 : easeOut(frame, out, 12);
	const y = (1 - inP) * 112 - outP * 112;
	return (
		<div style={{overflow: 'hidden', padding: '0.1em 0.1em 0.16em', margin: '-0.1em -0.1em -0.16em', ...style}}>
			<div style={{transform: `translateY(${y}%)`, whiteSpace: 'nowrap'}}>{children}</div>
		</div>
	);
};

export const Headline: React.FC<{
	lines: readonly string[];
	at: number;
	size: number;
	stagger?: number;
	accentAt?: number;
	out?: number;
	opacity?: number;
}> = ({lines, at, size, stagger = 4, accentAt, out, opacity = 1}) => (
	<div
		style={{
			fontFamily: font.serif,
			fontSize: size,
			lineHeight: 1.1,
			fontWeight: 400,
			letterSpacing: '-0.018em',
			color: color.paper,
			opacity,
		}}
	>
		{lines.map((l, i) => (
			<MaskLine key={i} at={at + i * stagger} out={out === undefined ? undefined : out + i * 2}>
				<Rich text={l} accentAt={accentAt} />
			</MaskLine>
		))}
	</div>
);

// Small-caps label, Inter.
export const Tag: React.FC<{children: React.ReactNode; size: number; at?: number; tone?: string}> = ({
	children,
	size,
	at = 0,
	tone,
}) => (
	<div
		style={{
			fontFamily: font.sans,
			fontSize: size,
			fontWeight: 600,
			letterSpacing: '0.16em',
			textTransform: 'uppercase',
			color: tone ?? color.paper,
			lineHeight: 1.2,
		}}
	>
		<MaskLine at={at} dur={14}>
			{children}
		</MaskLine>
	</div>
);
