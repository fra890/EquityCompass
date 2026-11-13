import React from 'react';
import {Sequence, useCurrentFrame} from 'remotion';
import {copy} from '../copy';
import {Headline, Tag} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, paperA, T} from '../theme';

// Three ticks: where you are in the run of cards.
const Ticks: React.FC<{active: number; count: number}> = ({active, count}) => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	return (
		<div style={{display: 'flex', gap: px(12), marginBottom: px(36)}}>
			{Array.from({length: count}).map((_, i) => (
				<div key={i} style={{width: px(84), height: px(5), background: paperA(0.22), position: 'relative'}}>
					{i <= active ? (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: color.paper,
								transform: `scaleX(${i < active ? 1 : easeOut(frame, 0, 18)})`,
								transformOrigin: 'left center',
							}}
						/>
					) : null}
				</div>
			))}
		</div>
	);
};

const Card: React.FC<{index: number}> = ({index}) => {
	const {px} = useLayout();
	const c = copy.cards[index];
	const dur = T.cards.each;
	const last = index === copy.cards.length - 1;
	return (
		<Stage
			dur={last ? dur : dur + 1000}
			header={
				<>
					<Ticks active={index} count={copy.cards.length} />
					<Tag size={px(32)} at={2} tone={paperA(0.72)}>
						{c.tag}
					</Tag>
				</>
			}
		>
			<Headline lines={c.lines} at={2} size={px(128)} accentAt={20} out={last ? undefined : dur - 12} />
		</Stage>
	);
};

export const Cards: React.FC = () => (
	<>
		{copy.cards.map((_, i) => (
			<Sequence key={i} from={i * T.cards.each} durationInFrames={T.cards.each} layout="none">
				<Card index={i} />
			</Sequence>
		))}
	</>
);
