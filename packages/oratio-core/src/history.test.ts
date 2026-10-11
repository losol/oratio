import { Direction, type EventTimeline, MatrixEvent } from 'matrix-js-sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  backfill,
  eventsFrom,
  fillAround,
  type HistoryClient,
  hasNewer,
  hasOlder,
  loadNewer,
  loadOlder,
  openAt,
} from './history';
import { toOratioMessages } from './timeline';

let seq = 0;
function message(body: string) {
  return new MatrixEvent({
    event_id: `$m${++seq}`,
    type: 'm.room.message',
    content: { msgtype: 'm.text', body },
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

/** A room's history, oldest first: `messages` messages, each followed by `stateBetween` state events. */
function mostlyState(messages: number, stateBetween: number) {
  return Array.from({ length: messages }, (_, i) => [
    message(`${i}`),
    ...Array.from({ length: stateBetween }, () => state()),
  ]).flat();
}

/**
 * A timeline over the events `history[start..end)`. Paging moves the edges
 * through `history`, as /messages would; going forwards it stops where the
 * next timeline starts and links to it, as matrix-js-sdk joins timelines.
 */
interface FakeTimeline {
  start: number;
  end: number;
  next: FakeTimeline | null;
  backToken: boolean;
  getEvents(): MatrixEvent[];
  getPaginationToken(dir: Direction): string | null;
  setPaginationToken(token: string | null, dir: Direction): void;
  getNeighbouringTimeline(dir: Direction): FakeTimeline | null;
  getTimelineSet(): { getLiveTimeline(): FakeTimeline };
}

/**
 * A room over `history` whose live timeline holds the newest `loaded`
 * events, and a client that pages through it. `/context` returns only the
 * event, as matrix-js-sdk asks for `limit=0`.
 */
function fakeRoom(history: MatrixEvent[], loaded: number) {
  const timelines: FakeTimeline[] = [];
  const make = (start: number, end: number): FakeTimeline => {
    const t: FakeTimeline = {
      start,
      end,
      next: null,
      backToken: start > 0,
      getEvents: () => history.slice(t.start, t.end),
      getPaginationToken: (dir) =>
        dir === Direction.Backward
          ? t.backToken
            ? `b${t.start}`
            : null
          : t === live
            ? null
            : `f${t.end}`,
      setPaginationToken: (token, dir) => {
        if (dir === Direction.Backward) t.backToken = token !== null;
      },
      getNeighbouringTimeline: (dir) => (dir === Direction.Forward ? t.next : null),
      getTimelineSet: () => ({ getLiveTimeline: () => live }),
    };
    timelines.push(t);
    return t;
  };
  const live = make(Math.max(0, history.length - loaded), history.length);

  const paginateEventTimeline = vi.fn(
    async (t: FakeTimeline, opts: { backwards?: boolean; limit?: number }) => {
      const limit = opts.limit ?? 50;
      if (opts.backwards) {
        t.start = Math.max(0, t.start - limit);
        t.backToken = t.start > 0;
        return t.start > 0;
      }
      // Forwards, up to the next timeline after this one, then join it.
      const following = timelines
        .filter((other) => other !== t && other.start >= t.end)
        .sort((a, b) => a.start - b.start)[0];
      const stop = following ? following.start : history.length;
      t.end = Math.min(stop, t.end + limit);
      if (following && t.end === following.start) t.next = following;
      return t.end < history.length;
    },
  );
  const getEventTimeline = vi.fn(async (_set: unknown, eventId: string) => {
    const at = history.findIndex((event) => event.getId() === eventId);
    if (at < 0) throw new Error('M_NOT_FOUND');
    if (at >= live.start) return live;
    return make(at, at + 1);
  });
  const client = { paginateEventTimeline, getEventTimeline } as unknown as HistoryClient;
  const room = {
    getLiveTimeline: () => live,
    getUnfilteredTimelineSet: () => ({}),
  } as never;
  const asTimeline = (t: FakeTimeline) => t as unknown as EventTimeline;
  return { live: asTimeline(live), client, room, paginateEventTimeline, getEventTimeline };
}

const texts = (timeline: EventTimeline) =>
  toOratioMessages(eventsFrom(timeline)).map((m) => m.text);

describe('backfill', () => {
  it('pages back past state events until there are messages', async () => {
    // A few messages, then 60 topic changes: sync's 50 hold no message.
    const history = [
      state('m.room.create'),
      ...['a', 'b', 'c'].map((t) => message(t)),
      ...Array.from({ length: 60 }, () => state()),
    ];
    const { live, client, paginateEventTimeline } = fakeRoom(history, 50);
    expect(texts(live)).toEqual([]);

    expect(await backfill(client, live, { minMessages: 20 })).toBe(3);
    expect(texts(live)).toEqual(['a', 'b', 'c']);
    // Stopped at the room's start, not after five pages.
    expect(paginateEventTimeline).toHaveBeenCalledTimes(1);
    expect(hasOlder(live)).toBe(false);
  });

  it('gives up after maxPages', async () => {
    const { live, client, paginateEventTimeline } = fakeRoom(
      Array.from({ length: 1000 }, () => state()),
      50,
    );
    expect(await backfill(client, live, { maxPages: 5 })).toBe(0);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(5);
    expect(hasOlder(live)).toBe(true);
  });
});

describe('loadOlder', () => {
  it('counts messages, not events: pages past state until it has added enough', async () => {
    // One message per 30 events: a page of 50 brings one or two.
    const { live, client, paginateEventTimeline } = fakeRoom(mostlyState(100, 29), 50);
    const before = texts(live).length;
    await loadOlder(client, live, { minMessages: 10, maxPages: 10 });
    expect(texts(live).length - before).toBeGreaterThanOrEqual(10);
    expect(paginateEventTimeline.mock.calls.length).toBeLessThanOrEqual(7);
  });

  it('stops after maxPages when there are no messages to find', async () => {
    const { live, client, paginateEventTimeline } = fakeRoom(
      Array.from({ length: 1000 }, () => state()),
      50,
    );
    expect(await loadOlder(client, live)).toBe(true);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(5);
  });

  it('stops at the room’s start and says so', async () => {
    const { live, client } = fakeRoom(mostlyState(5, 29), 50);
    expect(await loadOlder(client, live)).toBe(false);
    expect(texts(live)).toHaveLength(5);
    expect(hasOlder(live)).toBe(false);
    expect(await loadOlder(client, live)).toBe(false);
  });

  it('takes a number as one request of that many events, as in 0.2', async () => {
    const { live, client, paginateEventTimeline } = fakeRoom(mostlyState(100, 29), 50);
    await loadOlder(client, live, 50);
    expect(paginateEventTimeline).toHaveBeenCalledTimes(1);
    expect(paginateEventTimeline.mock.calls[0]?.[1]).toEqual({ backwards: true, limit: 50 });
  });

  it('treats a page that brings nothing as the room’s start', async () => {
    const { live, client, paginateEventTimeline } = fakeRoom([message('a')], 1);
    // A homeserver that hands out a token at the start, leading nowhere.
    (live as unknown as FakeTimeline).backToken = true;
    paginateEventTimeline.mockResolvedValueOnce(true);
    expect(hasOlder(live)).toBe(true);
    expect(await loadOlder(client, live)).toBe(false);
    expect(hasOlder(live)).toBe(false);
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

  it('pages the live timeline back to a recent event, never forwards', async () => {
    const history = Array.from({ length: 120 }, (_, i) => message(`${i}`));
    const { client, room, paginateEventTimeline, getEventTimeline } = fakeRoom(history, 50);
    const result = await openAt(client, room, history[30]?.getId() ?? '');
    expect(result?.live).toBe(true);
    expect(getEventTimeline).not.toHaveBeenCalled();
    for (const [, opts] of paginateEventTimeline.mock.calls) expect(opts.backwards).toBe(true);
  });

  it('opens an old event from /context with messages on both sides', async () => {
    // 3 messages, then 300 more; the live timeline holds the last 50 events.
    const history = Array.from({ length: 303 }, (_, i) => message(`${i}`));
    const { client, room, getEventTimeline } = fakeRoom(history, 50);
    const target = history[1];
    const result = await openAt(client, room, target?.getId() ?? '', {
      minMessages: 20,
      maxPages: 2,
    });
    expect(getEventTimeline).toHaveBeenCalledTimes(1);
    expect(result?.live).toBe(false);

    const rows = texts(result?.timeline as EventTimeline);
    const at = rows.indexOf('1');
    // Back to the room's start (one message before), and ten or more after.
    expect(at).toBe(1);
    expect(rows.length - at - 1).toBeGreaterThanOrEqual(10);
  });

  it('fills both sides through state, within maxPages each way', async () => {
    const history = mostlyState(400, 9);
    const { client, room, paginateEventTimeline } = fakeRoom(history, 50);
    const target = history[200 * 10];
    const result = await openAt(client, room, target?.getId() ?? '', {
      minMessages: 20,
      maxPages: 3,
      pageSize: 50,
    });
    const timeline = result?.timeline as EventTimeline;
    const rows = toOratioMessages(eventsFrom(timeline));
    const at = rows.findIndex((m) => m.id === target?.getId());
    expect(at).toBeGreaterThanOrEqual(10);
    expect(rows.length - at - 1).toBeGreaterThanOrEqual(10);
    // 3 back to look for the event, then at most 3 each way around it.
    expect(paginateEventTimeline.mock.calls.length).toBeLessThanOrEqual(9);
  });

  it('resolves null for an event the homeserver does not give', async () => {
    const { client, room } = fakeRoom([message('a')], 1);
    expect(await openAt(client, room, '$missing')).toBeNull();
  });
});

describe('loadNewer', () => {
  it('pages an old part forwards through state until it meets the live timeline', async () => {
    const history = mostlyState(300, 9);
    const { client, room, live } = fakeRoom(history, 50);
    const target = history[10];
    const result = await openAt(client, room, target?.getId() ?? '', { minMessages: 2 });
    const timeline = result?.timeline as EventTimeline;
    expect(hasNewer(timeline, live)).toBe(true);

    const before = texts(timeline).length;
    await loadNewer(client, timeline, { minMessages: 10 });
    expect(texts(timeline).length - before).toBeGreaterThanOrEqual(10);

    // Keep going: it ends where the live timeline starts, and runs on into it.
    while (await loadNewer(client, timeline, { maxPages: 50 }));
    expect(hasNewer(timeline, live)).toBe(false);
    expect(texts(timeline).at(-1)).toBe('299');
  });

  it('does not page the live timeline forwards', async () => {
    const { client, live, paginateEventTimeline } = fakeRoom([message('a')], 1);
    expect(await loadNewer(client, live)).toBe(false);
    expect(paginateEventTimeline).not.toHaveBeenCalled();
  });
});

describe('fillAround', () => {
  it('stops at the room’s start behind and at the live timeline ahead', async () => {
    const history = Array.from({ length: 8 }, (_, i) => message(`${i}`));
    const { client, room } = fakeRoom(history, 3);
    const result = await openAt(client, room, history[2]?.getId() ?? '', { maxPages: 0 });
    const timeline = result?.timeline as EventTimeline;
    await fillAround(client, timeline, history[2]?.getId() ?? '', { minMessages: 20 });
    expect(texts(timeline)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
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
