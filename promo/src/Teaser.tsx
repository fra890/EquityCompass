import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile} from 'remotion';
import './fonts';
import {assets, teaser} from './copy';
import {Backdrop} from './components/Backdrop';
import {Grain} from './components/Grain';
import {PromoProps} from './Promo';
import {EndCard} from './scenes/EndCard';
import {Gap} from './scenes/Gap';
import {Here} from './scenes/Here';
import {Hook} from './scenes/Hook';
import {Names} from './scenes/Names';
import {Title} from './scenes/Title';
import {color, TT} from './theme';

// The teaser: who it's for, the number, three open loops, the title. No
// ledger walk-through and no episode list; those are the reason to follow.
export const Teaser: React.FC<PromoProps> = ({hasAudio}) => (
	<AbsoluteFill style={{background: color.navy}}>
		<Backdrop />
		<Sequence name="Names" from={TT.names.from} durationInFrames={TT.names.dur}>
			<Names each={TT.names.each} />
		</Sequence>
		<Sequence name="If you work here" from={TT.here.from} durationInFrames={TT.here.dur}>
			<Here dur={TT.here.dur} afterAt={24} />
		</Sequence>
		<Sequence name="Hook" from={TT.hook.from} durationInFrames={TT.hook.dur}>
			<Hook dur={TT.hook.dur} secondAt={34} />
		</Sequence>
		<Sequence name="The gap" from={TT.gap.from} durationInFrames={TT.gap.dur}>
			<Gap dur={TT.gap.dur} />
		</Sequence>
		<Sequence name="Open loops" from={TT.flash.from} durationInFrames={TT.flash.dur}>
			<Names items={teaser.flashes} each={TT.flash.each} />
		</Sequence>
		<Sequence name="Title" from={TT.title.from} durationInFrames={TT.title.dur}>
			<Title dur={TT.title.dur} />
		</Sequence>
		<Sequence name="End card" from={TT.end.from} durationInFrames={TT.end.dur}>
			<EndCard variant="teaser" />
		</Sequence>

		<Grain />

		{hasAudio ? (
			<Audio
				src={staticFile(assets.teaserAudio)}
				volume={(f) =>
					0.6 *
					interpolate(f, [0, 12, TT.total - 30, TT.total], [0, 1, 1, 0], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					})
				}
			/>
		) : null}
	</AbsoluteFill>
);
