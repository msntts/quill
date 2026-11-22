import { describe, expect, it } from 'vitest';
import { buildGmailPrompt, buildGmailQuery } from './gmail-query';

describe('buildGmailQuery', () => {
  it('searches the primary inbox from the local day before the window start', () => {
    const windowStart = Date.parse('2026-11-22T00:05:00+09:00');

    expect(buildGmailQuery(windowStart, 'Asia/Tokyo')).toBe('in:inbox category:primary after:2026/11/21');
  });

  it('uses the given time zone to pick the date', () => {
    // 2026-11-22 00:30 in Tokyo is still 2026-11-21 in UTC.
    const windowStart = Date.parse('2026-11-21T15:30:00Z');

    expect(buildGmailQuery(windowStart, 'Asia/Tokyo')).toBe('in:inbox category:primary after:2026/11/21');
    expect(buildGmailQuery(windowStart, 'UTC')).toBe('in:inbox category:primary after:2026/11/20');
  });

  it('crosses month and year boundaries', () => {
    expect(buildGmailQuery(Date.parse('2027-01-01T12:00:00Z'), 'UTC')).toBe('in:inbox category:primary after:2026/12/31');
  });
});

describe('buildGmailPrompt', () => {
  it('names the exact query and the required tool options', () => {
    const query = 'in:inbox category:primary after:2026/11/21';

    const prompt = buildGmailPrompt(query);

    expect(prompt).toContain(`"${query}"`);
    expect(prompt).toContain('THREAD_VIEW_IDS_ONLY');
    expect(prompt).toContain('pageSize');
    expect(prompt).toContain('pageToken');
    expect(prompt).toContain('PLAIN_TEXT');
  });
});
