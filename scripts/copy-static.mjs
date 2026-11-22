// Copies non-TypeScript renderer files and state SVGs into dist/.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRenderer = path.join(root, 'src', 'renderer');
const outRenderer = path.join(root, 'dist', 'renderer');

mkdirSync(outRenderer, { recursive: true });
for (const name of readdirSync(srcRenderer)) {
  if (name.endsWith('.html') || name.endsWith('.css')) {
    cpSync(path.join(srcRenderer, name), path.join(outRenderer, name));
  }
}

const statesDir = path.join(outRenderer, 'states');
mkdirSync(statesDir, { recursive: true });
const srcStates = path.join(root, 'assets', 'states');
for (const name of readdirSync(srcStates)) {
  if (name.endsWith('.svg')) {
    cpSync(path.join(srcStates, name), path.join(statesDir, name));
  }
}
