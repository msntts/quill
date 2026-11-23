import { describe, expect, it } from 'vitest';
import { planGmailSlices } from './gmail-slices';

const utc = (iso: string) => Date.parse(iso);

describe('planGmailSlices', () => {
  it('GS-19 複数の日にまたがる', () => {
    const slices = planGmailSlices(utc('2026-11-20T08:50:00Z'), utc('2026-11-23T00:30:00Z'));

    expect(slices).toEqual([
      { label: '2026-11-20', startsAt: utc('2026-11-20T00:00:00Z'), endsAt: utc('2026-11-21T00:00:00Z') },
      { label: '2026-11-21', startsAt: utc('2026-11-21T00:00:00Z'), endsAt: utc('2026-11-22T00:00:00Z') },
      { label: '2026-11-22', startsAt: utc('2026-11-22T00:00:00Z'), endsAt: utc('2026-11-23T00:00:00Z') },
      { label: '2026-11-23', startsAt: utc('2026-11-23T00:00:00Z'), endsAt: utc('2026-11-24T00:00:00Z') },
    ]);
  });

  it('GS-20 1日に収まる', () => {
    const slices = planGmailSlices(utc('2026-11-23T01:00:00Z'), utc('2026-11-23T01:30:00Z'));

    expect(slices.map((s) => s.label)).toEqual(['2026-11-23']);
  });

  it('GS-21 日付は UTC で数える', () => {
    // 2026-11-20 08:37 in Tokyo is 2026-11-19 23:37 UTC.
    const slices = planGmailSlices(Date.parse('2026-11-20T08:37:00+09:00'), Date.parse('2026-11-20T09:30:00+09:00'));

    expect(slices.map((s) => s.label)).toEqual(['2026-11-19', '2026-11-20']);
  });

  it('crosses month and year boundaries', () => {
    const slices = planGmailSlices(utc('2026-12-31T23:00:00Z'), utc('2027-01-01T01:00:00Z'));

    expect(slices.map((s) => s.label)).toEqual(['2026-12-31', '2027-01-01']);
  });
});
