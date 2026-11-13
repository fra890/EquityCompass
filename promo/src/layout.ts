import {useVideoConfig} from 'remotion';

// Everything is sized off `u` and the safe box, so switching FORMAT in
// theme.ts to 'wide' reflows the piece without touching the scenes.
export const useLayout = () => {
	const {width, height} = useVideoConfig();
	const portrait = height >= width;
	// Type sizes are authored for a 1080-wide vertical frame.
	const u = portrait ? width / 1080 : (height / 1080) * 0.78;
	// App UI covers the top 12% and bottom 20% of a vertical video.
	const safeTop = portrait ? height * 0.12 : height * 0.09;
	const safeBottom = portrait ? height * 0.2 : height * 0.1;
	const marginX = portrait ? width * 0.082 : width * 0.085;
	return {
		width,
		height,
		portrait,
		u,
		safeTop,
		safeBottom,
		marginX,
		contentW: width - marginX * 2,
		px: (n: number) => n * u,
	};
};
