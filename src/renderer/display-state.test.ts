import { describe, expect, it } from 'vitest';
import { INITIAL_DISPLAY_STATE, resolveDisplayState } from './display-state';

describe('resolveDisplayState', () => {
  it.each(['idle', 'fetching', 'error'] as const)('QS-07 状態に対応する画像を表示する (%s)', (state) => {
    expect(resolveDisplayState('idle', state)).toBe(state);
  });

  it.each(['sleeping', '', 42, null, undefined, { state: 'idle' }])('QS-08 知らない状態名は無視する (%s)', (incoming) => {
    expect(resolveDisplayState('fetching', incoming)).toBe('fetching');
  });

  it('QS-09 起動直後', () => {
    expect(INITIAL_DISPLAY_STATE).toBe('idle');
  });
});
