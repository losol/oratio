import { describe, expect, it } from 'vitest';
import { oratioChatLabelsEn, oratioChatLabelsNb, resolveLabels } from './labels';

describe('resolveLabels', () => {
  it('gives English hosts English room list and log text', () => {
    const labels = resolveLabels(oratioChatLabelsEn);
    expect(labels.roomList?.muted).toBe('Muted');
    expect(labels.roomList?.unread?.(3)).toBe('3 unread');
    expect(labels.log?.mentionsYou).toBe('Mentions you');
  });

  it('keeps the other defaults when a host overrides one entry', () => {
    const labels = resolveLabels({ roomList: { muted: 'Stille' } });
    expect(labels.roomList?.muted).toBe('Stille');
    expect(labels.roomList?.mention).toBe(oratioChatLabelsNb.roomList?.mention);
    expect(labels.log).toEqual(oratioChatLabelsNb.log);
  });

  it('defines every entry in both languages', () => {
    for (const labels of [oratioChatLabelsNb, oratioChatLabelsEn]) {
      expect(Object.keys(labels.roomList ?? {}).sort()).toEqual(
        ['members', 'mention', 'muted', 'presence', 'unread'].sort(),
      );
      expect(Object.keys(labels.log ?? {}).sort()).toEqual(['mentionsYou', 'reactions']);
    }
  });
});
