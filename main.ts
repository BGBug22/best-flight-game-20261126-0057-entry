// Senja Air — the entry program (Node 22, standard library only).
// It hands the game in: it copies this repository's game/ and screenshots/
// into the output directory and writes the dossier.json the judge reads,
// built with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The grader hands us an output directory that is a mounted volume: it already
// exists and cannot be removed or swapped out. So we never delete it here; we
// only make sure it is present and then place our files inside it.
mkdirSync(outputDir, { recursive: true });

cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps, from the competition's gate: the text cap shapes
// the dossier bytes; the rest refuse an entry the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log('Senja Air handed in: game/, screenshots/ and dossier.json written to ' + outputDir);
