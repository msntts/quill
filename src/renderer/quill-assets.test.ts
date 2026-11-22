import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUILL_STATES, assetFileFor } from './quill-assets.js';

const statesDir = path.resolve(__dirname, '..', '..', 'assets', 'states');

describe('quill state assets', () => {
  it('maps each of the six states to an existing SVG file', () => {
    expect(QUILL_STATES).toEqual(['idle', 'fetching', 'triaging', 'todo', 'unsure', 'error']);
    for (const state of QUILL_STATES) {
      const file = assetFileFor(state);
      expect(file).toBe(`quill-${state}.svg`);
      expect(existsSync(path.join(statesDir, file))).toBe(true);
    }
  });
});
