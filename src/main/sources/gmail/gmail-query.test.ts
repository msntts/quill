import { describe, expect, it } from 'vitest';
import { buildGmailPrompt, buildGmailQuery } from './gmail-query';

describe('buildGmailQuery', () => {
  it('searches the whole inbox for exactly one UTC day', () => {
    const slice = { label: '2026-11-20', startsAt: Date.parse('2026-11-20T00:00:00Z'), endsAt: Date.parse('2026-11-21T00:00:00Z') };

    expect(buildGmailQuery(slice)).toBe('in:inbox after:2026/11/20 before:2026/11/21');
  });

  it('crosses month and year boundaries', () => {
    const slice = { label: '2026-12-31', startsAt: Date.parse('2026-12-31T00:00:00Z'), endsAt: Date.parse('2027-01-01T00:00:00Z') };

    expect(buildGmailQuery(slice)).toBe('in:inbox after:2026/12/31 before:2027/01/01');
  });
});

describe('buildGmailPrompt', () => {
  it('names the exact query and the required tool options', () => {
    const query = 'in:inbox after:2026/11/20 before:2026/11/21';

    const prompt = buildGmailPrompt(query);

    expect(prompt).toContain(`"${query}"`);
    expect(prompt).toContain('THREAD_VIEW_IDS_ONLY');
    expect(prompt).toContain('pageSize');
    expect(prompt).toContain('PLAIN_TEXT');
  });

  it('does not ask for further pages (the connector has none)', () => {
    expect(buildGmailPrompt('in:inbox after:2026/11/20 before:2026/11/21')).not.toContain('pageToken');
  });
});
