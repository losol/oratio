import { NotificationCountType } from 'matrix-js-sdk';
import { describe, expect, it } from 'vitest';
import { directRoomIds, type RoomLike, toOratioRoom } from './rooms';

function room(id: string, name: string, total = 0, highlight = 0, members = 2): RoomLike {
  return {
    roomId: id,
    name,
    getJoinedMemberCount: () => members,
    getUnreadNotificationCount: (type) =>
      type === NotificationCountType.Highlight ? highlight : total,
  };
}

describe('toOratioRoom', () => {
  it('maps a quiet room to a channel with its member count', () => {
    expect(toOratioRoom(room('!a', 'general', 0, 0, 12), new Set())).toEqual({
      id: '!a',
      kind: 'channel',
      name: 'general',
      members: 12,
    });
  });

  it('marks rooms from m.direct as direct messages', () => {
    expect(toOratioRoom(room('!b', 'Ingrid'), new Set(['!b'])).kind).toBe('dm');
  });

  it('carries unread counts and mentions', () => {
    expect(toOratioRoom(room('!c', 'kurs', 3, 1), new Set())).toMatchObject({
      unread: 3,
      mention: true,
    });
  });
});

describe('directRoomIds', () => {
  it('flattens m.direct into a set of room IDs', () => {
    expect(directRoomIds({ '@a:x': ['!1', '!2'], '@b:x': ['!3'] })).toEqual(
      new Set(['!1', '!2', '!3']),
    );
    expect(directRoomIds(undefined).size).toBe(0);
  });
});
