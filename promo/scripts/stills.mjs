// Renders one approval still per beat: `npm run stills`
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';

const beats = [
	['01a-names', 20],
	['01b-names-hold', 60],
	['02-if-you-work-here', 136],
	['03-hook', 214],
	['04-math', 386],
	['05-card-isos', 436],
	['06-card-lockup', 500],
	['07-card-ticker', 578],
	['08-turn', 652],
	['09-title', 738],
	['10-end', 930],
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
