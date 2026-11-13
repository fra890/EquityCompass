import React from 'react';
import {trailer} from '../copy';
import {easeOut} from '../motion';
import {color, font, paperA} from '../theme';

// One small diagram per chapter, drawn in a 904 x 430 box. Diagrams are
// conceptual: shapes and labels, no outcomes.
export const VW = 904;
export const VH = 430;

const L = trailer.labels;
const label = {fontFamily: font.sans, fontSize: 32, fill: paperA(0.8)} as const;
const strong = {fontFamily: font.sans, fontSize: 34, fontWeight: 600, fill: color.paper} as const;
const mono = {fontFamily: font.mono, fontSize: 40, fontWeight: 500, fill: color.paper, letterSpacing: '-0.03em'} as const;
const track = paperA(0.12);

type V = React.FC<{f: number}>;

const Rsu: V = ({f}) => {
	const scale = VW / 40; // 40% spans the box
	const a = 22 * scale * easeOut(f, 10, 20);
	const b0 = 22 * scale * easeOut(f, 20, 20);
	const b1 = 13 * scale * easeOut(f, 36, 18);
	return (
		<>
			<text x={0} y={34} {...label}>{L.rsu.withheld}</text>
			<rect x={0} y={54} width={VW} height={60} fill={track} />
			<rect x={0} y={54} width={a} height={60} fill={color.paper} />
			<text x={a + 20} y={98} {...mono} opacity={easeOut(f, 24, 10)}>{L.rsu.a}</text>

			<text x={0} y={192} {...label}>{L.rsu.owed}</text>
			<rect x={0} y={212} width={VW} height={60} fill={track} />
			<rect x={0} y={212} width={b0} height={60} fill={color.paper} />
			<rect x={22 * scale} y={212} width={b1} height={60} fill={color.blue} />
			<text x={35 * scale + 20} y={256} {...mono} opacity={easeOut(f, 50, 10)}>{L.rsu.b}</text>
			<text x={22 * scale} y={318} {...strong} opacity={easeOut(f, 46, 12)}>{L.rsu.gap}</text>

			<text x={0} y={414} {...label} fontSize={30} fill={paperA(0.68)}>{L.rsu.note}</text>
		</>
	);
};

const Iso: V = ({f}) => {
	const y = 270;
	const x1 = 90;
	const x2 = 470;
	const x3 = 770;
	const draw = VW * easeOut(f, 8, 34);
	const bill = 190 * easeOut(f, 38, 18);
	return (
		<>
			<rect x={x3 - 80} y={y - bill} width={160} height={bill} fill={color.blue} />
			<text x={x3} y={y - 78} textAnchor="middle" {...strong} opacity={easeOut(f, 48, 10)}>{L.iso.bill}</text>
			<line x1={0} y1={y} x2={draw} y2={y} stroke={color.paper} strokeWidth={4} />
			<line x1={x2} y1={y - 150} x2={x2} y2={y + 26} stroke={paperA(0.5)} strokeWidth={3} strokeDasharray="8 10" opacity={draw > x2 ? 1 : 0} />
			{draw > x1 ? <circle cx={x1} cy={y} r={13} fill={color.paper} /> : null}
			{draw > x3 ? <circle cx={x3} cy={y} r={13} fill={color.paper} /> : null}
			<text x={x1} y={y + 70} textAnchor="middle" {...label} opacity={draw > x1 ? 1 : 0}>{L.iso.exercise}</text>
			<text x={x2} y={y + 70} textAnchor="middle" {...label} opacity={draw > x2 ? 1 : 0}>{L.iso.yearEnd}</text>
			<text x={x3} y={y + 70} textAnchor="middle" {...label} opacity={draw > x3 ? 1 : 0}>{L.iso.april}</text>
		</>
	);
};

const Nqso: V = ({f}) => {
	const top = 110;
	const bottom = 330;
	const lineA = VW * easeOut(f, 8, 22);
	const lineB = VW * easeOut(f, 16, 22);
	const h = (bottom - top) * easeOut(f, 30, 20);
	return (
		<>
			<rect x={500} y={bottom - h} width={340} height={h} fill={color.blue} />
			<line x1={0} y1={bottom} x2={lineA} y2={bottom} stroke={color.paper} strokeWidth={4} />
			<line x1={0} y1={top} x2={lineB} y2={top} stroke={color.paper} strokeWidth={4} strokeDasharray="10 10" />
			<text x={0} y={bottom + 46} {...label} opacity={easeOut(f, 10, 12)}>{L.nqso.strike}</text>
			<text x={0} y={top - 24} {...label} opacity={easeOut(f, 18, 12)}>{L.nqso.market}</text>
			{L.nqso.spread.map((t, i) => (
				<text key={t} x={670} y={206 + i * 46} textAnchor="middle" {...strong} opacity={easeOut(f, 44, 12)}>{t}</text>
			))}
		</>
	);
};

const Concentration: V = ({f}) => {
	const cols = 20;
	const rows = 5;
	const gap = VW / cols;
	const filled = Math.round(70 * easeOut(f, 10, 40));
	const dots = [];
	for (let c = 0; c < cols; c++) {
		for (let r = 0; r < rows; r++) {
			const on = c * rows + r < filled;
			dots.push(
				<circle key={`${c}-${r}`} cx={gap / 2 + c * gap} cy={30 + r * gap} r={15} fill={on ? color.paper : paperA(0.16)} />,
			);
		}
	}
	return (
		<>
			{dots}
			<g opacity={easeOut(f, 46, 12)}>
				<circle cx={15} cy={318} r={15} fill={color.paper} />
				<text x={48} y={330} {...strong}>{L.concentration.one}</text>
				<circle cx={15} cy={382} r={15} fill={paperA(0.16)} />
				<text x={48} y={394} {...label}>{L.concentration.rest}</text>
			</g>
		</>
	);
};

const Divest: V = ({f}) => {
	const heights = [300, 250, 200, 150, 100, 60];
	const bw = 112;
	const gap = (VW - bw * 6) / 5;
	const base = 330;
	return (
		<>
			{heights.map((h, i) => {
				const x = i * (bw + gap);
				const g = easeOut(f, 8 + i * 6, 16);
				const sold = i === 0 ? 0 : (heights[i - 1] - h) * easeOut(f, 20 + i * 6, 14);
				return (
					<g key={i}>
						<rect x={x} y={base - h * g} width={bw} height={h * g} fill={color.paper} />
						<rect x={x} y={base - h - sold} width={bw} height={sold} fill={color.blue} />
						<text x={x + bw / 2} y={base + 48} textAnchor="middle" {...mono} fontSize={32} fill={paperA(0.8)} opacity={g}>
							{L.divest.quarters[i]}
						</text>
					</g>
				);
			})}
			<line x1={0} y1={base} x2={VW} y2={base} stroke={paperA(0.4)} strokeWidth={3} />
		</>
	);
};

const Location: V = ({f}) => {
	const bw = 270;
	const gap = (VW - bw * 3) / 2;
	const top = 20;
	const h = 290;
	// [box, slot from the bottom, kind, start frame]
	const blocks: [number, number, 'a' | 'b', number][] = [
		[0, 0, 'a', 22],
		[0, 1, 'a', 28],
		[1, 0, 'b', 34],
		[1, 1, 'a', 40],
		[1, 2, 'b', 46],
		[2, 0, 'b', 52],
	];
	return (
		<>
			{L.location.boxes.map((name, i) => {
				const x = i * (bw + gap);
				const g = easeOut(f, 6 + i * 5, 16);
				return (
					<g key={name} opacity={g}>
						<rect x={x + 2} y={top} width={bw - 4} height={h} fill="none" stroke={color.paper} strokeWidth={4} />
						<text x={x + bw / 2} y={top + h + 54} textAnchor="middle" {...label}>{name}</text>
					</g>
				);
			})}
			{blocks.map(([b, slot, kind, at], i) => {
				const g = easeOut(f, at, 14);
				const x = b * (bw + gap) + 26;
				const y = top + h - 26 - 62 - slot * 78;
				return (
					<rect key={i} x={x} y={y - (1 - g) * 60} width={bw - 52} height={62} fill={kind === 'a' ? color.paper : color.blue} opacity={g} />
				);
			})}
		</>
	);
};

const Retire: V = ({f}) => {
	const y = 270;
	const x0 = 40;
	const step = (VW - 80) / 5;
	const draw = VW * easeOut(f, 6, 28);
	const mx = x0 + step * 5 - step * 2.5 * easeOut(f, 32, 30);
	const on = easeOut(f, 26, 10);
	return (
		<>
			<rect x={mx} y={y - 8} width={x0 + step * 5 - mx} height={16} fill={color.blue} opacity={on} />
			<line x1={0} y1={y} x2={draw} y2={y} stroke={color.paper} strokeWidth={4} />
			{L.retire.ages.map((age, i) => {
				const x = x0 + i * step;
				return (
					<g key={age} opacity={draw > x ? 1 : 0}>
						<line x1={x} y1={y - 14} x2={x} y2={y + 14} stroke={color.paper} strokeWidth={4} />
						<text x={x} y={y + 70} textAnchor="middle" {...mono} fontSize={34} fill={paperA(0.8)}>{age}</text>
					</g>
				);
			})}
			<g opacity={on}>
				<line x1={mx} y1={y - 130} x2={mx} y2={y} stroke={color.paper} strokeWidth={4} />
				<circle cx={mx} cy={y} r={15} fill={color.paper} />
				<text x={Math.min(mx, VW - 130)} y={y - 152} textAnchor="middle" {...strong}>{L.retire.marker}</text>
			</g>
		</>
	);
};

export const vignettes: Record<string, V | undefined> = {
	rsu: Rsu,
	iso: Iso,
	nqso: Nqso,
	concentration: Concentration,
	divest: Divest,
	location: Location,
	retire: Retire,
};
