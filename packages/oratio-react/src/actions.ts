// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { useCallback } from 'react';
import { type MatrixClient, Preset, parseUserId } from '@eventuras/oratio-core';
import { type ClientOption, useResolvedClient } from './OratioProvider';

/**
 * Sends a message to a room. `/me waves` is sent as an emote, the `action`
 * row of the log. Blank text is not sent. Resolves once the homeserver has
 * the message; it shows in the timeline as soon as it is sent.
 */
export function useSendMessage(
  roomId: string | null,
  options: ClientOption = {},
): (text: string) => Promise<void> {
  const client = useResolvedClient(options.client);
  return useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!client || !roomId || !body) return;
      const emote = /^\/me\s+(.+)$/s.exec(body);
      if (emote?.[1]) {
        await client.sendEmoteMessage(roomId, emote[1]);
      } else {
        await client.sendTextMessage(roomId, body);
      }
    },
    [client, roomId],
  );
}

/**
 * Creates an invite-only room with the user as its only member and resolves
 * with its ID. Invite-only because on a federated server a public room is
 * open to anyone who learns its ID.
 */
export function useCreateRoom(options: ClientOption = {}): (name: string) => Promise<string> {
  const client = useResolvedClient(options.client);
  return useCallback(
    async (name: string) => {
      if (!client) throw new Error('No Matrix client yet.');
      const { room_id } = await client.createRoom({ name, preset: Preset.PrivateChat });
      return room_id;
    },
    [client],
  );
}

/**
 * The user's name in a room, as the log shows their messages: the room
 * member's display name, else the localpart of their ID.
 */
export function myName(client: MatrixClient | null, roomId: string | null): string | undefined {
  const userId = client?.getUserId();
  if (!client || !userId) return undefined;
  const member = roomId ? client.getRoom(roomId)?.getMember(userId) : null;
  return member?.name ?? parseUserId(userId)?.localpart ?? userId;
}
