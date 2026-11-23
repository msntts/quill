import { describe, expect, it } from 'vitest';
import { QUILL_STATES as RENDERER_STATES } from '../../renderer/quill-assets';
import { nextQuillState, QUILL_STATES } from './quill-status';

describe('nextQuillState', () => {
  it('QS-01 取得を始める', () => {
    expect(nextQuillState('idle', { type: 'fetch-started' })).toBe('fetching');
  });

  it('QS-02 取得が失敗する', () => {
    expect(nextQuillState('fetching', { type: 'fetch-failed' })).toBe('error');
  });

  it('QS-03 失敗のあとの取得中', () => {
    expect(nextQuillState('error', { type: 'fetch-started' })).toBe('fetching');
  });

  it('QS-04 成功して新着なし', () => {
    expect(nextQuillState('fetching', { type: 'fetch-succeeded', newCount: 0 })).toBe('idle');
  });

  it('QS-05 成功して新着あり', () => {
    expect(nextQuillState('fetching', { type: 'fetch-succeeded', newCount: 3 })).toBe('idle');
  });

  it('QS-06 失敗のあとに成功する', () => {
    const afterFailure = nextQuillState('fetching', { type: 'fetch-failed' });
    const restarted = nextQuillState(afterFailure, { type: 'fetch-started' });

    expect(nextQuillState(restarted, { type: 'fetch-succeeded', newCount: 0 })).toBe('idle');
  });

  it('keeps the same state names as the renderer', () => {
    expect([...QUILL_STATES]).toEqual([...RENDERER_STATES]);
  });
});
