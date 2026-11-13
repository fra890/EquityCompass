import React from 'react';
import {Composition, getStaticFiles} from 'remotion';
import {assets} from './copy';
import {Promo, PromoProps} from './Promo';
import {Teaser} from './Teaser';
import {Trailer} from './Trailer';
import {FORMAT, FPS, SIZES, T, TR, TT} from './theme';

const audioProps = (file: string) => () => ({
	props: {hasAudio: getStaticFiles().some((f) => f.name === file)},
});

export const Root: React.FC = () => (
	<>
	<Composition
		id="Promo"
		component={Promo}
		durationInFrames={T.total}
		fps={FPS}
		width={SIZES[FORMAT].width}
		height={SIZES[FORMAT].height}
		defaultProps={{hasAudio: false} satisfies PromoProps}
		// Audio is optional: only mounted if public/audio/promo.mp3 exists.
		calculateMetadata={audioProps(assets.audio)}
	/>
	<Composition
		id="Teaser"
		component={Teaser}
		durationInFrames={TT.total}
		fps={FPS}
		width={SIZES[FORMAT].width}
		height={SIZES[FORMAT].height}
		defaultProps={{hasAudio: false} satisfies PromoProps}
		calculateMetadata={audioProps(assets.teaserAudio)}
	/>
	<Composition
		id="Trailer"
		component={Trailer}
		durationInFrames={TR.total}
		fps={FPS}
		width={SIZES[FORMAT].width}
		height={SIZES[FORMAT].height}
		defaultProps={{hasAudio: false} satisfies PromoProps}
		calculateMetadata={audioProps(assets.trailerAudio)}
	/>
	</>
);
