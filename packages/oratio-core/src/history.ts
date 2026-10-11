// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import {
  Direction,
  type EventTimeline,
  type EventTimelineSet,
  EventType,
  type MatrixClient,
} from 'matrix-js-sdk';
import { type EventLike, isShownMessage } from './timeline';

/**
 * Loading a room's history beyond what sync brought. Sync gives the latest
 * events of a room, and not all events are messages: memberships, power
 * levels and pins are events too. A room whose latest events are all state
 * would look empty, so these functions page back until there are messages to
 * show, and load older ones or the part around a given event on request.
 *
 * Framework-agnostic: React bindings and native apps build on the same calls.
 */

/** The parts of a matrix-js-sdk `EventTimeline` these functions read. */
export type TimelineLike = Pick<EventTimeline, 'getPaginationToken' | 'getNeighbouringTimeline'> & {
  getEvents(): EventLike[];
};

/** The parts of a matrix-js-sdk `MatrixClient` these functions call. */
export type HistoryClient = Pick<MatrixClient, 'paginateEventTimeline' | 'getEventTimeline'>;

/** The parts of a matrix-js-sdk `Room` these functions read. */
export interface HistoryRoom {
  getLiveTimeline(): EventTimeline;
  getUnfilteredTimelineSet(): EventTimelineSet;
}

/** Events per request to the homeserver. */
export const defaultPageSize = 50;

export interface BackfillOptions {
  /** Page back until the timeline holds this many messages. @default 20 */
  minMessages?: number;
  /** Give up after this many requests. @default 5 */
  maxPages?: number;
  /** Events per request. @default 50 */
  pageSize?: number;
}

/** How many of the timeline's events show as messages. */
export function countMessages(timeline: TimelineLike): number {
  return timeline.getEvents().filter(isShownMessage).length;
}

/**
 * Whether the timeline can page further back. False at the room's start: the
 * homeserver has said there is nothing older, or the room's creation is loaded.
 */
export function hasOlder(timeline: TimelineLike): boolean {
  if (timeline.getPaginationToken(Direction.Backward) === null) return false;
  return !timeline.getEvents().some((event) => event.getType() === EventType.RoomCreate);
}

/**
 * The timeline's events, oldest first, followed by those of the timelines it
 * was linked to while paging forwards: a timeline loaded around an older
 * event runs on into the live one once they meet.
 */
export function eventsFrom<T extends TimelineLike>(timeline: T): ReturnType<T['getEvents']> {
  const events: EventLike[] = [];
  const seen = new Set<TimelineLike>();
  for (let current: TimelineLike | null = timeline; current && !seen.has(current); ) {
    seen.add(current);
    events.push(...current.getEvents());
    current = current.getNeighbouringTimeline(Direction.Forward);
  }
  return events as ReturnType<T['getEvents']>;
}

/**
 * Whether there are later events than the timeline holds: true for a timeline
 * loaded around an older event until it meets the live one.
 */
export function hasNewer(timeline: TimelineLike, live: TimelineLike): boolean {
  let current: TimelineLike | null = timeline;
  // Timelines that met while paging are linked; a few hops is plenty.
  for (let hops = 0; current && hops < 10; hops++) {
    if (current === live) return false;
    current = current.getNeighbouringTimeline(Direction.Forward);
  }
  return timeline.getPaginationToken(Direction.Forward) !== null;
}

/**
 * Loads up to `limit` older events into the timeline. Resolves false at the
 * room's start, when there is nothing older.
 */
export async function loadOlder(
  client: HistoryClient,
  timeline: EventTimeline,
  limit = defaultPageSize,
): Promise<boolean> {
  if (!hasOlder(timeline)) return false;
  return client.paginateEventTimeline(timeline, { backwards: true, limit });
}

/** Loads up to `limit` later events into a timeline that is not the live one. */
export async function loadNewer(
  client: HistoryClient,
  timeline: EventTimeline,
  limit = defaultPageSize,
): Promise<boolean> {
  return client.paginateEventTimeline(timeline, { backwards: false, limit });
}

/**
 * Pages back until the timeline holds `minMessages` messages, the room's
 * start is reached, or `maxPages` requests are made. Resolves with the
 * number of messages it ends with.
 */
export async function backfill(
  client: HistoryClient,
  timeline: EventTimeline,
  options: BackfillOptions = {},
): Promise<number> {
  const { minMessages = 20, maxPages = 5, pageSize = defaultPageSize } = options;
  let messages = countMessages(timeline);
  for (let page = 0; page < maxPages && messages < minMessages; page++) {
    // The last page before the room's start still brings events: count first.
    const more = await loadOlder(client, timeline, pageSize);
    messages = countMessages(timeline);
    if (!more) break;
  }
  return messages;
}

/** Where {@link openAt} found the event. */
export type OpenAtResult =
  /** In the live timeline, as loaded or after paging back. */
  | { timeline: EventTimeline; live: true }
  /** In a timeline of its own, loaded around it through `/context`. */
  | { timeline: EventTimeline; live: false }
  /** Nowhere: unknown to the homeserver, or not visible to this user. */
  | null;

function holds(timeline: TimelineLike, eventId: string): boolean {
  return timeline.getEvents().some((event) => event.getId() === eventId);
}

/**
 * Finds the timeline to show a room in so that `eventId` is in it. A recent
 * event is reached by paging the live timeline back, at most `maxPages`
 * requests; an older one gets a timeline of its own, loaded around it with
 * the homeserver's `/context` API. The client must be created with
 * `timelineSupport`, as `startClient` does.
 */
export async function openAt(
  client: HistoryClient,
  room: HistoryRoom,
  eventId: string,
  options: Pick<BackfillOptions, 'maxPages' | 'pageSize'> = {},
): Promise<OpenAtResult> {
  const { maxPages = 5, pageSize = defaultPageSize } = options;
  const live = room.getLiveTimeline();
  for (let page = 0; !holds(live, eventId); page++) {
    if (page >= maxPages || !(await loadOlder(client, live, pageSize))) break;
  }
  if (holds(live, eventId)) return { timeline: live, live: true };

  const timeline = await client
    .getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
    .catch(() => null);
  if (!timeline) return null;
  // The live timeline may have caught up while /context was on its way.
  return timeline === room.getLiveTimeline() ? { timeline, live: true } : { timeline, live: false };
}
