import { EventEmitter } from 'node:events';
import { ClientEvent, type MatrixClient } from '@eventuras/oratio-core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRooms } from './useRooms';

// Just enough of a MatrixClient: an event emitter with rooms and account data.
function fakeClient(names: string[]) {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  const room = (name: string) => ({
    roomId: `!${name}`,
    name,
    getMyMembership: () => 'join',
    getJoinedMemberCount: () => 2,
    getUnreadNotificationCount: () => 0,
  });
  const rooms = names.map(room);
  client.getRooms = () => rooms;
  client.getAccountData = () => undefined;
  return { client: client as unknown as MatrixClient, rooms, room, emitter: client };
}

describe('useRooms', () => {
  it('is empty without a client', () => {
    const { result } = renderHook(() => useRooms(null));
    expect(result.current).toEqual([]);
  });

  it('lists joined rooms by name and follows sync', () => {
    const { client, rooms, room, emitter } = fakeClient(['kurs', 'general']);
    const { result } = renderHook(() => useRooms(client));
    expect(result.current.map((room) => room.name)).toEqual(['general', 'kurs']);

    rooms.push(room('ny'));
    act(() => {
      emitter.emit(ClientEvent.Sync);
    });
    expect(result.current.map((room) => room.name)).toEqual(['general', 'kurs', 'ny']);
  });
});
