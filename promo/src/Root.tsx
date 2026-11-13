import React from 'react';
import {Composition, getStaticFiles} from 'remotion';
import {assets} from './copy';
import {Promo, PromoProps} from './Promo';
import {FORMAT, FPS, SIZES, T} from './theme';

export const Root: React.FC = () => (
	<Composition
		id="Promo"
		component={Promo}
		durationInFrames={T.total}
		fps={FPS}
		width={SIZES[FORMAT].width}
		height={SIZES[FORMAT].height}
		defaultProps={{hasAudio: false} satisfies PromoProps}
		// Audio is optional: only mounted if public/audio/promo.mp3 exists.
		calculateMetadata={() => ({
			props: {hasAudio: getStaticFiles().some((f) => f.name === assets.audio)},
		})}
	/>
);
