// Renders one approval still per beat: `npm run stills`
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';

const beats = [
	['01-hook', 84],
	['02-math', 262],
	['03-card-isos', 320],
	['04-card-lockup', 390],
	['05-card-ticker', 470],
	['06-turn', 552],
	['07-title', 650],
	['08-end', 830],
];

mkdirSync('stills', {recursive: true});
const extra = process.argv.slice(2);
for (const [name, frame] of beats) {
	execFileSync(
		'npx',
		['remotion', 'still', 'src/index.ts', 'Promo', `stills/${name}.png`, `--frame=${frame}`, '--log=error', ...extra],
		{stdio: 'inherit'},
	);
	console.log(`stills/${name}.png  (frame ${frame})`);
}
