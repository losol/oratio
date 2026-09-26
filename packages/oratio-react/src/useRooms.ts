// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { useEffect, useState } from 'react';
import {
  ClientEvent,
  directRoomIds,
  EventType,
  joinedRooms,
  type MatrixClient,
  type OratioRoom,
  RoomEvent,
  toOratioRoom,
} from '@eventuras/oratio-core';

function readRooms(client: MatrixClient): OratioRoom[] {
  const direct = directRoomIds(client.getAccountData(EventType.Direct)?.getContent());
  return joinedRooms(client.getRooms()).map((room) => toOratioRoom(room, direct));
}

// Anything that can change a room's name, membership or kind. Unread counts
// arrive with every sync.
const clientEvents = [
  ClientEvent.Sync,
  ClientEvent.Room,
  ClientEvent.DeleteRoom,
  ClientEvent.AccountData,
] as const;
const roomEvents = [RoomEvent.Name, RoomEvent.MyMembership, RoomEvent.Receipt] as const;

/** The joined rooms, kept current as the client syncs. Empty while `client` is null. */
export function useRooms(client: MatrixClient | null): OratioRoom[] {
  const [rooms, setRooms] = useState<OratioRoom[]>([]);

  useEffect(() => {
    if (!client) {
      setRooms([]);
      return;
    }
    const update = () => setRooms(readRooms(client));
    update();
    for (const event of clientEvents) client.on(event, update);
    for (const event of roomEvents) client.on(event, update);
    return () => {
      for (const event of clientEvents) client.off(event, update);
      for (const event of roomEvents) client.off(event, update);
    };
  }, [client]);

  return rooms;
}
