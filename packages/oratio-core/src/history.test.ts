import { Direction, type EventTimeline, MatrixEvent } from 'matrix-js-sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  backfill,
  eventsFrom,
  type HistoryClient,
  hasNewer,
  hasOlder,
  loadOlder,
  openAt,
} from './history';
import { toOratioMessages } from './timeline';

let seq = 0;
function message(body: string, extra: Record<string, unknown> = {}) {
  return new MatrixEvent({
    event_id: `$m${++seq}`,
    type: 'm.room.message',
    content: { msgtype: 'm.text', body, ...extra },
    sender: '@ingrid:losol.no',
    origin_server_ts: seq,
    room_id: '!r',
  });
}
function state(type = 'm.room.topic') {
  return new MatrixEvent({
    event_id: `$s${++seq}`,
    type,
    state_key: '',
    content: {},
    sender: '@bot:losol.no',
    origin_server_ts: seq,
    room_id: '!r',
  });
}

/**
 * A timeline that holds the newest `loaded` of `history` (oldest first), and
 * a client that pages the rest in from that history, as /messages would.
 */
function fakeRoom(history: MatrixEvent[], loaded: number) {
  let start = Math.max(0, history.length - loaded);
  const timeline = {
    getEvents: () => history.slice(start),
    getPaginationToken: (dir: Direction) =>
      dir === Direction.Backward ? (start > 0 ? `t${start}` : null) : null,
    getNeighbouringTimeline: () => null,
  } as unknown as EventTimeline;
  const paginateEventTimeline = vi.fn(async (_t: EventTimeline, opts: { limit?: number }) => {
    start = Math.max(0, start - (opts.limit ?? 50));
    return start > 0;
  });
  const getEventTimeline = vi.fn(async () => null);
  const client = { paginateEventTimeline, getEventTimeline } as unknown as HistoryClient;
  const room = {
    getLiveTimeline: () => timeline,
    getUnfilteredTimelineSet: () => ({}),
  } as never;
  return { timeline, client, room, paginateEventTimeline, getEventTimeline };
}

describe('backfill', () => {
  it('pages back past state events until there are messages', async () => {
    // A few messages, then 60 topic changes: sync's 50 hold no message.
    const history = [
      state('m.room.create'),
      ...['a', 'b', 'c'].map((t) => message(t)),
      ...Array.from({ length: 60 }, () => state()),
    ];
    const { timeline, client, paginateEventTimeline } = fakeRoom(history, 50);
    expect(toOratioMessages(timeline.getEvents())).toEqual([]);

    const count = await backfill(client, timeline, { minMessages: 20 });

    expect(count).toBe(3);
    expect(toOratioMessages(timeline.getEvents()).map((m) => m.text)).toEqual(['a', 'b', 'c']);
    // Stopped at the room's start, not after five pages.
    expect(paginateEventTimeline).toHaveBeenCalledTimes(1);
    expect(hasOlder(timeline)).toBe(false);
  });

  it('stops once there are enough messages', async () => {
    const history = Array.from({ length: 200 }, (_, i) => (i % 2 ? message(`${i}`) : state()));
    const { timeline, client, paginateEventTimeline } = fakeRoom(history, 10);
    const count = await backfill(client, timeline, { minMessages: 20, pageSize: 10 });
    expect(count).toBeGreaterThanOrEqual(20);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(3);
  });

  it('gives up after maxPages', async () => {
    const history = Array.from({ length: 1000 }, () => state());
    const { timeline, client, paginateEventTimeline } = fakeRoom(history, 50);
    expect(await backfill(client, timeline, { maxPages: 5 })).toBe(0);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(5);
    expect(hasOlder(timeline)).toBe(true);
  });
});

describe('loadOlder', () => {
  it('pages back and resolves false at the start', async () => {
    const history = Array.from({ length: 80 }, (_, i) => message(`${i}`));
    const { timeline, client } = fakeRoom(history, 50);
    expect(hasOlder(timeline)).toBe(true);
    expect(await loadOlder(client, timeline, 50)).toBe(false);
    expect(timeline.getEvents()).toHaveLength(80);
    expect(hasOlder(timeline)).toBe(false);
    // Nothing more to ask for.
    expect(await loadOlder(client, timeline)).toBe(false);
  });
});

describe('openAt', () => {
  it('finds a loaded event without asking the homeserver', async () => {
    const history = Array.from({ length: 10 }, (_, i) => message(`${i}`));
    const { client, room, paginateEventTimeline } = fakeRoom(history, 10);
    const result = await openAt(client, room, history[3]?.getId() ?? '');
    expect(result?.live).toBe(true);
    expect(paginateEventTimeline).not.toHaveBeenCalled();
  });

  it('pages the live timeline back to a recent event', async () => {
    const history = Array.from({ length: 120 }, (_, i) => message(`${i}`));
    const { client, room, paginateEventTimeline, getEventTimeline } = fakeRoom(history, 50);
    const result = await openAt(client, room, history[30]?.getId() ?? '');
    expect(result?.live).toBe(true);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(1);
    expect(getEventTimeline).not.toHaveBeenCalled();
  });

  it('loads a timeline around an older event through /context', async () => {
    const history = Array.from({ length: 1000 }, (_, i) => message(`${i}`));
    const { client, room, getEventTimeline } = fakeRoom(history, 50);
    const around = { getEvents: () => [history[5]] } as unknown as EventTimeline;
    getEventTimeline.mockResolvedValue(around as never);

    const result = await openAt(client, room, history[5]?.getId() ?? '', { maxPages: 2 });
    expect(result).toEqual({ timeline: around, live: false });
    expect(getEventTimeline).toHaveBeenCalledTimes(1);
  });

  it('resolves null for an event the homeserver does not give', async () => {
    const { client, room, getEventTimeline } = fakeRoom([message('a')], 1);
    getEventTimeline.mockRejectedValue(new Error('M_NOT_FOUND'));
    expect(await openAt(client, room, '$missing')).toBeNull();
  });
});

describe('hasNewer', () => {
  it('is false for the live timeline and one linked to it', () => {
    const live = {
      getPaginationToken: () => 'f',
      getNeighbouringTimeline: () => null,
      getEvents: () => [],
    } as unknown as EventTimeline;
    const linked = {
      getPaginationToken: () => 'f',
      getNeighbouringTimeline: (dir: Direction) => (dir === Direction.Forward ? live : null),
      getEvents: () => [],
    } as unknown as EventTimeline;
    const apart = { ...linked, getNeighbouringTimeline: () => null } as unknown as EventTimeline;
    expect(hasNewer(live, live)).toBe(false);
    expect(hasNewer(linked, live)).toBe(false);
    expect(hasNewer(apart, live)).toBe(true);
  });
});

describe('eventsFrom', () => {
  it('runs on through the timelines linked forwards', () => {
    const [a, b, c] = [message('a'), message('b'), message('c')];
    const live = {
      getEvents: () => [c],
      getNeighbouringTimeline: () => null,
    } as unknown as EventTimeline;
    const around = {
      getEvents: () => [a, b],
      getNeighbouringTimeline: (dir: Direction) => (dir === Direction.Forward ? live : null),
    } as unknown as EventTimeline;
    expect(eventsFrom(around)).toEqual([a, b, c]);
    expect(eventsFrom(live)).toEqual([c]);
  });
});
