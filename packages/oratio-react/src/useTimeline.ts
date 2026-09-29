// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { useEffect, useState } from 'react';
import {
  type OratioMessage,
  RoomEvent,
  type TimelineOptions,
  toOratioMessages,
} from '@eventuras/oratio-core';
import { type ClientOption, useResolvedClient } from './OratioProvider';

// New events, our own messages moving from sending to sent, and redactions.
const roomEvents = [RoomEvent.Timeline, RoomEvent.LocalEchoUpdated, RoomEvent.Redaction] as const;

export interface UseTimelineOptions extends TimelineOptions, ClientOption {}

/** The loaded messages of a room's live timeline, oldest first. Empty without a room. */
export function useTimeline(
  roomId: string | null,
  options: UseTimelineOptions = {},
): OratioMessage[] {
  const client = useResolvedClient(options.client);
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
