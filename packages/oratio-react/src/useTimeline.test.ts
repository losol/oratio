import { EventEmitter } from 'node:events';
import { Direction, type MatrixClient } from '@eventuras/oratio-core';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTimeline } from './useTimeline';

// Just enough of a matrix-js-sdk MatrixEvent for the timeline mapping.
let seq = 0;
function fakeEvent(type: string, content: Record<string, unknown>) {
  const id = `$e${++seq}`;
  const ts = seq;
  return {
    getId: () => id,
    getType: () => type,
    getContent: () => content,
    getSender: () => '@ingrid:losol.no',
    getTs: () => ts,
    isRedacted: () => false,
    isRelation: () => false,
    sender: null,
  };
}
type MatrixEvent = ReturnType<typeof fakeEvent>;
const message = (body: string) => fakeEvent('m.room.message', { msgtype: 'm.text', body });
const state = () => fakeEvent('m.room.power_levels', {});

/** A timeline over `history[start..end)`, as the hook reads one. */
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
 * A client with one room, `!r`, whose live timeline holds the newest
 * `loaded` events of `history`. Paging moves a timeline's edges through
 * `history`, as /messages would, and forwards stops at the live timeline and
 * links to it, as matrix-js-sdk joins timelines. `/context` gives only the
 * event, as matrix-js-sdk asks for `limit=0`. Paging emits Room.timeline.
 */
function fakeClient(history: MatrixEvent[], loaded = 50) {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
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
    return t;
  };
  const live = make(Math.max(0, history.length - loaded), history.length);
  const room = {
    roomId: '!r',
    getLiveTimeline: () => live,
    getUnfilteredTimelineSet: () => ({}),
  };
  client.getRoom = (id: string) => (id === '!r' ? room : null);
  client.paginateEventTimeline = vi.fn(
    async (t: FakeTimeline, opts: { backwards?: boolean; limit?: number }) => {
      const limit = opts.limit ?? 50;
      if (opts.backwards) {
        t.start = Math.max(0, t.start - limit);
        t.backToken = t.start > 0;
      } else {
        t.end = Math.min(live.start, t.end + limit);
        if (t.end === live.start) t.next = live;
      }
      client.emit('Room.timeline');
      return opts.backwards ? t.start > 0 : t.next === null;
    },
  );
  client.getEventTimeline = vi.fn(async (_set: unknown, eventId: string) => {
    const at = history.findIndex((event) => event.getId() === eventId);
    if (at < 0) throw new Error('M_NOT_FOUND');
    return at >= live.start ? live : make(at, at + 1);
  });
  return {
    client: client as unknown as MatrixClient,
    live,
    paginate: client.paginateEventTimeline as ReturnType<typeof vi.fn>,
    getEventTimeline: client.getEventTimeline as ReturnType<typeof vi.fn>,
  };
}

const texts = (messages: { text: string }[]) => messages.map((m) => m.text);

describe('useTimeline', () => {
  it('fills a room whose latest events are not messages', async () => {
    const history = [...['a', 'b', 'c'].map(message), ...Array.from({ length: 60 }, state)];
    const { client } = fakeClient(history, 50);
    const { result } = renderHook(() => useTimeline('!r', { client }));
    await waitFor(() => expect(result.current.loadingOlder).toBe(false));
    expect(texts(result.current.messages)).toEqual(['a', 'b', 'c']);
    expect(result.current.hasOlder).toBe(false);
  });

  it('loads older messages on request and stops at the room’s start', async () => {
    const history = Array.from({ length: 120 }, (_, i) => message(`${i}`));
    const { client } = fakeClient(history, 50);
    const { result } = renderHook(() => useTimeline('!r', { client }));
    await waitFor(() => expect(result.current.messages).toHaveLength(50));
    expect(result.current.hasOlder).toBe(true);

    await act(() => result.current.loadOlder(50));
    expect(result.current.messages).toHaveLength(100);
    await act(() => result.current.loadOlder(50));
    expect(result.current.messages).toHaveLength(120);
    expect(result.current.hasOlder).toBe(false);
  });

  it('opens at a loaded message without asking the homeserver', async () => {
    const history = Array.from({ length: 30 }, (_, i) => message(`${i}`));
    const { client, paginate } = fakeClient(history, 30);
    const around = history[10]?.getId();
    const { result } = renderHook(() => useTimeline('!r', { client, around, minMessages: 0 }));
    await waitFor(() => expect(result.current.focusId).toBe(around));
    expect(paginate).not.toHaveBeenCalled();
    expect(result.current.hasNewer).toBe(false);
  });

  it('opens at a recent message by paging back to it', async () => {
    const history = Array.from({ length: 120 }, (_, i) => message(`${i}`));
    const { client } = fakeClient(history, 50);
    const around = history[40]?.getId();
    const { result } = renderHook(() => useTimeline('!r', { client, around }));
    await waitFor(() => expect(result.current.focusId).toBe(around));
    expect(result.current.messages.some((m) => m.id === around)).toBe(true);
    expect(result.current.hasNewer).toBe(false);
  });

  it('opens at an old message with messages on both sides, until it meets the latest', async () => {
    // Three messages, then 300 more; sync holds the last 50.
    const history = Array.from({ length: 303 }, (_, i) => message(`${i}`));
    const { client, live, getEventTimeline } = fakeClient(history, 50);
    const around = history[1]?.getId();

    const { result } = renderHook(() =>
      useTimeline('!r', { client, around, minMessages: 20, maxPages: 2 }),
    );
    await waitFor(() => expect(result.current.focusId).toBe(around));
    await waitFor(() => expect(result.current.loadingOlder).toBe(false));
    expect(getEventTimeline).toHaveBeenCalledTimes(1);
    const at = result.current.messages.findIndex((m) => m.id === around);
    expect(at).toBe(1);
    expect(result.current.messages.length - at - 1).toBeGreaterThanOrEqual(10);
    expect(result.current.hasNewer).toBe(true);

    // Scrolling on: each call brings messages, and the old part meets the
    // live timeline and runs on into it.
    const before = result.current.messages.length;
    await act(() => result.current.loadNewer());
    expect(result.current.messages.length - before).toBeGreaterThanOrEqual(10);
    while (result.current.hasNewer) await act(() => result.current.loadNewer({ maxPages: 50 }));
    expect(result.current.messages.at(-1)?.text).toBe('302');

    act(() => result.current.jumpToLatest());
    expect(result.current.messages).toHaveLength(live.getEvents().length);
    expect(result.current.focusId).toBeUndefined();
  });

  it('loads at least ten messages per call through state', async () => {
    // One message per 15 events: a page of 50 brings three or four.
    const history = Array.from({ length: 200 }, (_, i) => [
      message(`${i}`),
      ...Array.from({ length: 14 }, state),
    ]).flat();
    const { client, paginate } = fakeClient(history, 300);
    const { result } = renderHook(() => useTimeline('!r', { client }));
    await waitFor(() => expect(result.current.messages).toHaveLength(20));
    expect(paginate).not.toHaveBeenCalled();

    await act(() => result.current.loadOlder());
    expect(result.current.messages.length).toBeGreaterThanOrEqual(30);
    expect(paginate.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it('says so when the message is not found', async () => {
    const { client, getEventTimeline } = fakeClient([message('a')], 1);
    getEventTimeline.mockRejectedValue(new Error('M_NOT_FOUND'));
    const { result } = renderHook(() => useTimeline('!r', { client, around: '$gone' }));
    await waitFor(() => expect(result.current.focusMissing).toBe(true));
    expect(texts(result.current.messages)).toEqual(['a']);
  });

  it('waits for a room that is not synced yet', async () => {
    const { client } = fakeClient([message('a')], 1);
    const getRoom = client.getRoom.bind(client);
    let synced = false;
    client.getRoom = ((id: string) => (synced ? getRoom(id) : null)) as never;
    const { result } = renderHook(() => useTimeline('!r', { client }));
    expect(result.current.messages).toEqual([]);

    synced = true;
    act(() => {
      (client as unknown as EventEmitter).emit('Room');
    });
    await waitFor(() => expect(texts(result.current.messages)).toEqual(['a']));
  });
});
