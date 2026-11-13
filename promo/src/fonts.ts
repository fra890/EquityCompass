import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';

// Fonts are bundled locally (public/fonts) so renders never touch the network.
const handle = delayRender('Loading fonts');

Promise.all([
	loadFont({family: 'Source Serif 4', url: staticFile('fonts/SourceSerif4.woff2'), weight: '200 900'}),
	loadFont({family: 'Inter', url: staticFile('fonts/Inter.woff2'), weight: '100 900'}),
	loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono.woff2'), weight: '100 800'}),
])
	.then(() => continueRender(handle))
	.catch((err) => {
		console.error('Font load failed', err);
		continueRender(handle);
	});
