// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { useEffect, useState } from 'react';
import {
  type MatrixClient,
  type OratioMessage,
  RoomEvent,
  type TimelineOptions,
  toOratioMessages,
} from '@eventuras/oratio-core';

// New events, our own messages moving from sending to sent, and redactions.
const roomEvents = [RoomEvent.Timeline, RoomEvent.LocalEchoUpdated, RoomEvent.Redaction] as const;

/** The loaded messages of a room's live timeline, oldest first. Empty without a room. */
export function useTimeline(
  client: MatrixClient | null,
  roomId: string | null,
  options: TimelineOptions = {},
): OratioMessage[] {
  const [messages, setMessages] = useState<OratioMessage[]>([]);
  const { locale } = options;

  useEffect(() => {
    if (!client || !roomId) {
      setMessages([]);
      return;
    }
    const update = () => {
      const room = client.getRoom(roomId);
      setMessages(room ? toOratioMessages(room.getLiveTimeline().getEvents(), { locale }) : []);
    };
    update();
    for (const event of roomEvents) client.on(event, update);
    return () => {
      for (const event of roomEvents) client.off(event, update);
    };
  }, [client, roomId, locale]);

  return messages;
}
