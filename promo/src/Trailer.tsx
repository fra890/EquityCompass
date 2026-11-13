import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import './fonts';
import {assets, trailer} from './copy';
import {Backdrop} from './components/Backdrop';
import {Grain} from './components/Grain';
import {PromoProps} from './Promo';
import {Chapters} from './scenes/Chapters';
import {EndCard} from './scenes/EndCard';
import {Here} from './scenes/Here';
import {Names} from './scenes/Names';
import {Paper} from './scenes/Paper';
import {Title} from './scenes/Title';
import {Turn} from './scenes/Turn';
import {color, TR} from './theme';

// The series trailer: who it's for, why it exists, what it covers, where to
// find it.
export const Trailer: React.FC<PromoProps> = ({hasAudio}) => (
	<AbsoluteFill style={{background: color.navy}}>
		<Backdrop />
		<Sequence name="Names" from={TR.names.from} durationInFrames={TR.names.dur}>
			<Names each={TR.names.each} />
		</Sequence>
		<Sequence name="If you work here" from={TR.here.from} durationInFrames={TR.here.dur}>
			<Here dur={TR.here.dur} afterAt={26} />
		</Sequence>
		<Sequence name="On paper" from={TR.paper.from} durationInFrames={TR.paper.dur}>
			<Paper dur={TR.paper.dur} />
		</Sequence>
		<Sequence name="Chapters" from={TR.chapters.from} durationInFrames={TR.chapters.dur}>
			<Chapters />
		</Sequence>
		<Sequence name="Turn" from={TR.turn.from} durationInFrames={TR.turn.dur}>
			<Turn dur={TR.turn.dur} lines={trailer.turn} />
		</Sequence>
		<Sequence name="Title" from={TR.title.from} durationInFrames={TR.title.dur}>
			<Title dur={TR.title.dur} />
		</Sequence>
		<Sequence name="End card" from={TR.end.from} durationInFrames={TR.end.dur}>
			<EndCard variant="trailer" />
		</Sequence>

		<Grain />

		{hasAudio ? (
			<Audio
				src={staticFile(assets.trailerAudio)}
				volume={(f) =>
					0.6 *
					interpolate(f, [0, 12, TR.total - 30, TR.total], [0, 1, 1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})
				}
			/>
		) : null}
	</AbsoluteFill>
);
