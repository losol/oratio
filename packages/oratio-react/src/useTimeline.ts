// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  backfill,
  ClientEvent,
  countMessages,
  defaultPageSize,
  type EventTimeline,
  eventsFrom,
  hasNewer,
  hasOlder,
  loadNewer as loadNewerEvents,
  loadOlder as loadOlderEvents,
  type MatrixClient,
  type OratioMessage,
  openAt,
  RoomEvent,
  type TimelineOptions,
  toOratioMessages,
} from '@eventuras/oratio-core';
import { type ClientOption, useResolvedClient } from './OratioProvider';

// New events (in any of the room's timelines), our own messages moving from
// sending to sent, redactions, and a live timeline started afresh after a gap.
const roomEvents = [
  RoomEvent.Timeline,
  RoomEvent.LocalEchoUpdated,
  RoomEvent.Redaction,
  RoomEvent.TimelineReset,
] as const;

export interface UseTimelineOptions extends TimelineOptions, ClientOption {
  /**
   * Open the room at this event, e.g. from a link to a message: it is loaded
   * if need be, and returned as `focusId` to scroll to and highlight.
   */
  around?: string;
  /** When a room opens with fewer messages, older ones are loaded. @default 20 */
  minMessages?: number;
  /** Requests to make for `minMessages` or `around` before giving up. @default 5 */
  maxPages?: number;
}

export interface OratioTimeline {
  /** The loaded messages, oldest first. */
  messages: OratioMessage[];
  /** Older messages can be loaded: false at the room's start. */
  hasOlder: boolean;
  /** Older messages are being loaded, when the room opens or on request. */
  loadingOlder: boolean;
  /** Loads up to `limit` older events, for a "load older" control or infinite scroll. */
  loadOlder: (limit?: number) => Promise<void>;
  /**
   * Later messages can be loaded: true while showing a part of the room
   * loaded around an older message, until it meets the latest messages.
   */
  hasNewer: boolean;
  loadingNewer: boolean;
  /** Loads up to `limit` later events, as the user scrolls towards the end. */
  loadNewer: (limit?: number) => Promise<void>;
  /** Leaves the part around an older message for the latest messages. */
  jumpToLatest: () => void;
  /** The message `around` points at, once it is loaded. */
  focusId?: string;
  /** `around` was not found: unknown to the homeserver, or not visible to this user. */
  focusMissing: boolean;
}

interface Focus {
  focusId?: string;
  focusMissing: boolean;
}
const noFocus: Focus = { focusMissing: false };
const missing: Focus = { focusMissing: true };

const idle = {
  messages: [] as OratioMessage[],
  hasOlder: false,
  hasNewer: false,
  ...noFocus,
};

/**
 * A room's messages, oldest first, with what a log needs to load more. A room
 * that opens with fewer than `minMessages` messages, e.g. because its latest
 * events are memberships and power levels, gets older ones loaded at once.
 * Uses the provider's client unless one is passed. Empty without a room.
 */
export function useTimeline(
  roomId: string | null,
  options: UseTimelineOptions = {},
): OratioTimeline {
  const client = useResolvedClient(options.client);
  const { locale, around, minMessages = 20, maxPages = 5 } = options;
  const [view, setView] = useState(idle);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  // Bumped when the room shows up in the client, e.g. after the first sync.
  const [roomSeen, setRoomSeen] = useState(0);
  // The timeline shown when it is not the live one: the part of the room
  // around an older message. And what became of `around`. Both are read by
  // the SDK's listeners; `view` is what renders.
  const detachedRef = useRef<EventTimeline | null>(null);
  const focusRef = useRef<Focus>(noFocus);
  // One request each way at a time, whoever asks.
  const pending = useRef({ older: false, newer: false });

  const shown = useCallback(
    (c: MatrixClient): EventTimeline | null =>
      detachedRef.current ?? (roomId ? (c.getRoom(roomId)?.getLiveTimeline() ?? null) : null),
    [roomId],
  );

  const read = useCallback(
    (c: MatrixClient) => {
      const timeline = shown(c);
      const live = roomId ? c.getRoom(roomId)?.getLiveTimeline() : undefined;
      if (!timeline || !live) {
        setView({ ...idle, ...focusRef.current });
        return;
      }
      setView({
        messages: toOratioMessages(eventsFrom(timeline), { locale }),
        hasOlder: hasOlder(timeline),
        hasNewer: hasNewer(timeline, live),
        ...focusRef.current,
      });
    },
    [shown, roomId, locale],
  );

  // Opening a room: find `around`, then fill up a room that looks empty.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read and shown follow roomId and locale; roomSeen is a trigger
  useEffect(() => {
    detachedRef.current = null;
    focusRef.current = noFocus;
    if (!client || !roomId) {
      setView(idle);
      return;
    }
    const room = client.getRoom(roomId);
    if (!room) {
      setView(idle);
      const retry = () => {
        if (client.getRoom(roomId)) setRoomSeen((n) => n + 1);
      };
      client.on(ClientEvent.Room, retry);
      client.on(ClientEvent.Sync, retry);
      return () => {
        client.off(ClientEvent.Room, retry);
        client.off(ClientEvent.Sync, retry);
      };
    }
    let cancelled = false;
    const update = () => {
      if (!cancelled) read(client);
    };
    const fill = async () => {
      const live = room.getLiveTimeline();
      if (detachedRef.current || pending.current.older) return;
      if (countMessages(live) >= minMessages || !hasOlder(live)) return;
      pending.current.older = true;
      setLoadingOlder(true);
      try {
        await backfill(client, live, { minMessages, maxPages });
      } catch {
        // Offline or refused: the log shows what it has, and loadOlder can retry.
      } finally {
        pending.current.older = false;
        if (!cancelled) setLoadingOlder(false);
        update();
      }
    };
    const onEvent = (...args: unknown[]) => {
      update();
      // A gap in sync starts the live timeline afresh: fill it up again.
      if (args[0] === room && !detachedRef.current) void fill();
    };

    update();
    for (const event of roomEvents) {
      client.on(event, event === RoomEvent.TimelineReset ? onEvent : update);
    }
    void (async () => {
      if (around) {
        setLoadingOlder(true);
        const found = await openAt(client, room, around, { maxPages }).catch(() => null);
        if (cancelled) return;
        focusRef.current = found ? { focusId: around, focusMissing: false } : missing;
        if (found && !found.live) detachedRef.current = found.timeline;
        setLoadingOlder(false);
        update();
      }
      await fill();
    })();

    return () => {
      cancelled = true;
      for (const event of roomEvents) {
        client.off(event, event === RoomEvent.TimelineReset ? onEvent : update);
      }
    };
  }, [client, roomId, around, minMessages, maxPages, locale, roomSeen]);

  const loadOlder = useCallback(
    async (limit = defaultPageSize) => {
      const timeline = client && shown(client);
      if (!client || !timeline || pending.current.older) return;
      pending.current.older = true;
      setLoadingOlder(true);
      try {
        await loadOlderEvents(client, timeline, limit);
      } finally {
        pending.current.older = false;
        setLoadingOlder(false);
        read(client);
      }
    },
    [client, shown, read],
  );

  const loadNewer = useCallback(
    async (limit = defaultPageSize) => {
      const timeline = detachedRef.current;
      if (!client || !timeline || pending.current.newer) return;
      pending.current.newer = true;
      setLoadingNewer(true);
      try {
        await loadNewerEvents(client, timeline, limit);
      } finally {
        pending.current.newer = false;
        setLoadingNewer(false);
        read(client);
      }
    },
    [client, read],
  );

  const jumpToLatest = useCallback(() => {
    detachedRef.current = null;
    focusRef.current = noFocus;
    if (client) read(client);
  }, [client, read]);

  return { ...view, loadingOlder, loadingNewer, loadOlder, loadNewer, jumpToLatest };
}
