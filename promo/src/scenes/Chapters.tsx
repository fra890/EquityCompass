import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {trailer} from '../copy';
import {Headline, MaskLine, Num} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, paperA, TR} from '../theme';
import {VH, vignettes, VW} from './Vignettes';

const pad2 = (n: number) => String(n).padStart(2, '0');

// The syllabus rail: one tick per chapter, filling as the trailer moves.
const Rail: React.FC<{active: number; count: number}> = ({active, count}) => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	return (
		<div style={{display: 'flex', gap: px(10), marginBottom: px(34)}}>
			{Array.from({length: count}).map((_, i) => (
				<div key={i} style={{flex: 1, height: px(5), background: paperA(0.22), position: 'relative'}}>
					{i <= active ? (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: color.paper,
								transform: `scaleX(${i < active ? 1 : easeOut(frame, 0, 20)})`,
								transformOrigin: 'left center',
							}}
						/>
					) : null}
				</div>
			))}
		</div>
	);
};

const Chapter: React.FC<{index: number; dur: number}> = ({index, dur}) => {
	const frame = useCurrentFrame();
	const {px, contentW} = useLayout();
	const c = trailer.chapters[index];
	const Vignette = vignettes[c.id];
	const count = trailer.chapters.length;
	return (
		<Stage
			dur={dur}
			header={
				<>
					<Rail active={index} count={count} />
					<div
						style={{
							display: 'flex',
							alignItems: 'baseline',
							gap: px(22),
							fontFamily: font.sans,
							fontSize: px(32),
							fontWeight: 600,
							letterSpacing: '0.16em',
							textTransform: 'uppercase',
							color: paperA(0.78),
						}}
					>
						<MaskLine at={2} dur={14} style={{letterSpacing: 0}}>
							<Num scale={1.1}>{pad2(index + 1)}</Num>
						</MaskLine>
						<MaskLine at={2} dur={14}>
							{c.tag}
						</MaskLine>
					</div>
				</>
			}
		>
			{/* The last chapter has no diagram: just the sentence, larger. */}
			<Headline lines={c.lines} at={4} size={px(Vignette ? 96 : 132)} />
			{Vignette ? (
				<>
					<div style={{height: px(64)}} />
					<svg width={contentW} height={(contentW * VH) / VW} viewBox={`0 0 ${VW} ${VH}`} style={{overflow: 'visible'}}>
						<Vignette f={frame} />
					</svg>
				</>
			) : null}
		</Stage>
	);
};

export const Chapters: React.FC = () => {
	const n = trailer.chapters.length;
	return (
		<>
			{trailer.chapters.map((_, i) => {
				const dur = i === n - 1 ? TR.chapters.last : TR.chapters.each;
				return (
					<Sequence key={i} from={i * TR.chapters.each} durationInFrames={dur} layout="none">
						<Chapter index={i} dur={dur} />
					</Sequence>
				);
			})}
		</>
	);
};
