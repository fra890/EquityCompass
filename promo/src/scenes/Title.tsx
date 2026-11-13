import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {copy} from '../copy';
import {Headline, Tag} from '../components/Type';
import {useLayout} from '../layout';
import {fadeOut} from '../motion';
import {color, paperA, T} from '../theme';

type Pt = [number, number];

const DRAW_AT = 0;
const DRAW_DUR = 50;
const STEPS = 4;

// The vesting schedule: flat, then a step up at each vest.
const schedule = (w: number, yBase: number, yTop: number): Pt[] => {
	const rise = (yBase - yTop) / STEPS;
	const pts: Pt[] = [[0, yBase]];
	for (let i = 0; i < STEPS; i++) {
		const x = w * (0.2 + i * 0.22);
		pts.push([x, yBase - rise * i], [x, yBase - rise * (i + 1)]);
	}
	pts.push([w, yTop]);
	return pts;
};

const lengths = (pts: Pt[]) =>
	pts.slice(1).map(([x, y], i) => Math.hypot(x - pts[i][0], y - pts[i][1]));

// The polyline up to distance d along it.
const partial = (pts: Pt[], d: number): Pt[] => {
	const out: Pt[] = [pts[0]];
	let left = d;
	const segs = lengths(pts);
	for (let i = 0; i < segs.length; i++) {
		if (left >= segs[i]) {
			out.push(pts[i + 1]);
			left -= segs[i];
		} else {
			const t = segs[i] === 0 ? 0 : left / segs[i];
			out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
			break;
		}
	}
	return out;
};

export const Title: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, portrait, safeTop, marginX, px} = useLayout();

	const yBase = height * (portrait ? 0.735 : 0.86);
	const yTop = height * (portrait ? 0.5 : 0.52);
	const pts = schedule(width, yBase, yTop);
	const segs = lengths(pts);
	const total = segs.reduce((a, b) => a + b, 0);

	const ease = Easing.out(Easing.quad);
	const p = interpolate(frame, [DRAW_AT, DRAW_AT + DRAW_DUR], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: ease,
	});
	const drawn = partial(pts, total * p);
	const tip = drawn[drawn.length - 1];

	// The title lands as the line starts its final step.
	const finalStepStart = segs.slice(0, segs.length - 2).reduce((a, b) => a + b, 0) / total;
	const landAt = Math.round(DRAW_AT + DRAW_DUR * (1 - Math.sqrt(1 - finalStepStart)));

	const line = drawn.map(([x, y]) => `${x},${y}`).join(' ');
	const area = `${line} ${tip[0]},${height} 0,${height}`;

	// A marker at each vest, set as the line passes it.
	let run = 0;
	const vests = pts.slice(1, -1).flatMap((pt, i) => {
		run += segs[i];
		return i % 2 === 1 ? [{pt, on: total * p >= run}] : [];
	});

	return (
		<AbsoluteFill style={{opacity: fadeOut(frame, T.title.dur)}}>
			<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
				<defs>
					<linearGradient id="vest-fill" x1="0" y1={yTop} x2="0" y2={height} gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor={color.blue} stopOpacity={1} />
						<stop offset="1" stopColor={color.blue} stopOpacity={0.15} />
					</linearGradient>
				</defs>
				<polygon points={area} fill="url(#vest-fill)" />
				<polyline points={line} fill="none" stroke={color.paper} strokeWidth={px(4)} strokeLinejoin="miter" />
				{vests.map(({pt, on}, i) =>
					on ? <circle key={i} cx={pt[0]} cy={pt[1]} r={px(9)} fill={color.paper} /> : null,
				)}
			</svg>

			<div style={{position: 'absolute', left: marginX, right: marginX, top: safeTop + height * (portrait ? 0.075 : 0.06)}}>
				<Headline lines={[copy.title.name]} at={landAt} size={px(168)} />
				<div style={{height: px(34)}} />
				<Tag size={px(30)} at={landAt + 12} tone={paperA(0.85)}>
					{copy.title.sub}
				</Tag>
			</div>
		</AbsoluteFill>
	);
};
