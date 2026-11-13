import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import './fonts';
import {assets} from './copy';
import {Grain} from './components/Grain';
import {Cards} from './scenes/Cards';
import {EndCard} from './scenes/EndCard';
import {Hook} from './scenes/Hook';
import {Ledger} from './scenes/Ledger';
import {Title} from './scenes/Title';
import {Turn} from './scenes/Turn';
import {color, T} from './theme';

export type PromoProps = {hasAudio: boolean};

export const Promo: React.FC<PromoProps> = ({hasAudio}) => (
	<AbsoluteFill style={{background: color.navy}}>
		<Sequence name="Hook" from={T.hook.from} durationInFrames={T.hook.dur}>
			<Hook />
		</Sequence>
		<Sequence name="The math" from={T.ledger.from} durationInFrames={T.ledger.dur}>
			<Ledger />
		</Sequence>
		<Sequence name="Three cards" from={T.cards.from} durationInFrames={T.cards.dur}>
			<Cards />
		</Sequence>
		<Sequence name="Turn" from={T.turn.from} durationInFrames={T.turn.dur}>
			<Turn />
		</Sequence>
		<Sequence name="Title" from={T.title.from} durationInFrames={T.title.dur}>
			<Title />
		</Sequence>
		<Sequence name="End card" from={T.end.from} durationInFrames={T.end.dur}>
			<EndCard />
		</Sequence>

		<Grain />

		{/* Optional bed. The piece is built to work fully on mute. */}
		{hasAudio ? (
			<Audio
				src={staticFile(assets.audio)}
				volume={(f) =>
					0.3 *
					interpolate(f, [0, 12, T.total - 30, T.total], [0, 1, 1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})
				}
			/>
		) : null}
	</AbsoluteFill>
);
