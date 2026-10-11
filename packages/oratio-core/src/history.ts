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

export interface LoadOptions {
  /** Stop once this call has added this many messages. @default 10 */
  minMessages?: number;
  /** Give up after this many requests. @default 5 */
  maxPages?: number;
  /** Events per request. @default 50 */
  pageSize?: number;
}

/** Shown messages in the timeline and the timelines it runs on into. */
function messagesIn(timeline: TimelineLike): number {
  return eventsFrom(timeline).filter(isShownMessage).length;
}

/** The live timeline of its room, which only sync extends forwards. */
function isLive(timeline: EventTimeline): boolean {
  return timeline.getTimelineSet?.()?.getLiveTimeline?.() === timeline;
}

/**
 * Whether paging the timeline forwards can bring anything: not for the live
 * one, nor once it has met another timeline. matrix-js-sdk links timelines
 * that meet but keeps the old token, so the link, not the token, says so.
 */
function canPageForward(timeline: EventTimeline): boolean {
  return (
    !isLive(timeline) &&
    timeline.getNeighbouringTimeline(Direction.Forward) === null &&
    timeline.getPaginationToken(Direction.Forward) !== null
  );
}

/** One request back. A page that brings nothing ends the paging there. */
async function pageBack(
  client: HistoryClient,
  timeline: EventTimeline,
  pageSize: number,
): Promise<boolean> {
  if (!hasOlder(timeline)) return false;
  const before = timeline.getEvents().length;
  const more = await client.paginateEventTimeline(timeline, { backwards: true, limit: pageSize });
  // Some homeservers hand out a token at the room's start that only leads to
  // an empty page: treat that page as the start.
  if (
    more &&
    timeline.getEvents().length === before &&
    timeline.getNeighbouringTimeline(Direction.Backward) === null
  ) {
    timeline.setPaginationToken(null, Direction.Backward);
    return false;
  }
  return more;
}

/** One request forwards, for a timeline that is not the live one. */
async function pageForward(
  client: HistoryClient,
  timeline: EventTimeline,
  pageSize: number,
): Promise<boolean> {
  if (!canPageForward(timeline)) return false;
  await client.paginateEventTimeline(timeline, { backwards: false, limit: pageSize });
  return canPageForward(timeline);
}

/**
 * Loads older events until this call has added `minMessages` messages, the
 * room's start is reached, or `maxPages` requests are made: a room full of
 * memberships and power levels still gets messages to show. Resolves false
 * at the room's start.
 *
 * A number instead of options is one request for that many events, as in
 * 0.2.
 */
export async function loadOlder(
  client: HistoryClient,
  timeline: EventTimeline,
  options: number | LoadOptions = {},
): Promise<boolean> {
  if (typeof options === 'number') return pageBack(client, timeline, options);
  const { minMessages = 10, maxPages = 5, pageSize = defaultPageSize } = options;
  const start = messagesIn(timeline);
  for (let page = 0; page < maxPages; page++) {
    const more = await pageBack(client, timeline, pageSize);
    if (!more || messagesIn(timeline) - start >= minMessages) break;
  }
  return hasOlder(timeline);
}

/**
 * Loads later events into a timeline that is not the live one, e.g. the
 * part of a room loaded around an older message, until this call has added
 * `minMessages` messages, the timeline meets the live one, or `maxPages`
 * requests are made. Resolves false once there is nothing newer to page in.
 *
 * A number instead of options is one request for that many events, as in
 * 0.2.
 */
export async function loadNewer(
  client: HistoryClient,
  timeline: EventTimeline,
  options: number | LoadOptions = {},
): Promise<boolean> {
  if (typeof options === 'number') return pageForward(client, timeline, options);
  const { minMessages = 10, maxPages = 5, pageSize = defaultPageSize } = options;
  const start = messagesIn(timeline);
  for (let page = 0; page < maxPages; page++) {
    const more = await pageForward(client, timeline, pageSize);
    if (!more || messagesIn(timeline) - start >= minMessages) break;
  }
  return canPageForward(timeline);
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
  for (let page = 0; page < maxPages && countMessages(timeline) < minMessages; page++) {
    if (!(await pageBack(client, timeline, pageSize))) break;
  }
  return countMessages(timeline);
}

/**
 * Loads messages on both sides of an event, about `minMessages / 2` each,
 * at most `maxPages` requests each way: back to the room's start, and
 * forwards until the timeline meets the live one. A timeline from `/context`
 * holds only the event itself, as matrix-js-sdk asks for no context.
 */
export async function fillAround(
  client: HistoryClient,
  timeline: EventTimeline,
  eventId: string,
  options: BackfillOptions = {},
): Promise<void> {
  const { minMessages = 20, maxPages = 5, pageSize = defaultPageSize } = options;
  const half = Math.ceil(minMessages / 2);
  const split = () => {
    const events = eventsFrom(timeline);
    const at = events.findIndex((event) => event.getId() === eventId);
    return {
      before: events.slice(0, Math.max(at, 0)).filter(isShownMessage).length,
      after: events.slice(at + 1).filter(isShownMessage).length,
    };
  };
  for (let page = 0; page < maxPages && split().before < half; page++) {
    if (!(await pageBack(client, timeline, pageSize))) break;
  }
  for (let page = 0; page < maxPages && split().after < half; page++) {
    if (!(await pageForward(client, timeline, pageSize))) break;
  }
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
 * the homeserver's `/context` API. Either way, about `minMessages` messages
 * are then loaded around it ({@link fillAround}). The client must be created
 * with `timelineSupport`, as `startClient` does.
 */
export async function openAt(
  client: HistoryClient,
  room: HistoryRoom,
  eventId: string,
  options: BackfillOptions = {},
): Promise<OpenAtResult> {
  const { maxPages = 5, pageSize = defaultPageSize } = options;
  const live = room.getLiveTimeline();
  for (let page = 0; !holds(live, eventId); page++) {
    if (page >= maxPages || !(await pageBack(client, live, pageSize))) break;
  }
  if (holds(live, eventId)) {
    await fillAround(client, live, eventId, options);
    return { timeline: live, live: true };
  }

  const timeline = await client
    .getEventTimeline(room.getUnfilteredTimelineSet(), eventId)
    .catch(() => null);
  if (!timeline) return null;
  await fillAround(client, timeline, eventId, options);
  // The live timeline may have caught up while /context was on its way.
  return timeline === room.getLiveTimeline() ? { timeline, live: true } : { timeline, live: false };
}
