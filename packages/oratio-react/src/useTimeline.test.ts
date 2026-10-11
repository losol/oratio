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

interface FakeTimeline {
  events: MatrixEvent[];
  /** How many of `history` are older than what is loaded. */
  start: number;
  history: MatrixEvent[];
  forward: string | null;
  next: FakeTimeline | null;
  getEvents(): MatrixEvent[];
  getPaginationToken(dir: Direction): string | null;
  getNeighbouringTimeline(dir: Direction): FakeTimeline | null;
}

function timeline(history: MatrixEvent[], loaded: number): FakeTimeline {
  const t: FakeTimeline = {
    history,
    start: Math.max(0, history.length - loaded),
    events: [],
    forward: null,
    next: null,
    getEvents: () => t.history.slice(t.start),
    getPaginationToken: (dir) =>
      dir === Direction.Backward ? (t.start > 0 ? `b${t.start}` : null) : t.forward,
    getNeighbouringTimeline: (dir) => (dir === Direction.Forward ? t.next : null),
  };
  return t;
}

/**
 * A client with one room, `!r`, whose live timeline holds the newest
 * `loaded` events of `history`. Paging back reads further into `history`, as
 * /messages would, and emits Room.timeline as the SDK does.
 */
function fakeClient(history: MatrixEvent[], loaded = 50) {
  const client = new EventEmitter() as EventEmitter & Record<string, unknown>;
  const live = timeline(history, loaded);
  const room = {
    roomId: '!r',
    getLiveTimeline: () => live,
    getUnfilteredTimelineSet: () => ({}),
  };
  client.getRoom = (id: string) => (id === '!r' ? room : null);
  client.paginateEventTimeline = vi.fn(
    async (t: FakeTimeline, opts: { backwards?: boolean; limit?: number }) => {
      if (opts.backwards) {
        t.start = Math.max(0, t.start - (opts.limit ?? 50));
        client.emit('Room.timeline');
        return t.start > 0;
      }
      // Forwards: this fake meets the live timeline at once.
      t.forward = null;
      t.next = live;
      client.emit('Room.timeline');
      return false;
    },
  );
  client.getEventTimeline = vi.fn(async () => null);
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

  it('opens at an old message in a timeline of its own, until it meets the latest', async () => {
    const history = Array.from({ length: 1000 }, (_, i) => message(`${i}`));
    const { client, live, getEventTimeline } = fakeClient(history, 50);
    // /context: the old message and a few around it, not linked to live yet.
    const old = timeline(history.slice(95, 106), 11);
    old.forward = 'f';
    getEventTimeline.mockResolvedValue(old);
    const around = history[100]?.getId();

    const { result } = renderHook(() => useTimeline('!r', { client, around, maxPages: 2 }));
    await waitFor(() => expect(result.current.focusId).toBe(around));
    expect(texts(result.current.messages)).toEqual(
      history.slice(95, 106).map((e) => e.getContent().body),
    );
    expect(result.current.hasNewer).toBe(true);

    // Scrolling on: the old part meets the live timeline and runs on into it.
    await act(() => result.current.loadNewer());
    expect(result.current.hasNewer).toBe(false);
    expect(result.current.messages.at(-1)?.text).toBe('999');

    act(() => result.current.jumpToLatest());
    expect(result.current.messages).toHaveLength(live.getEvents().length);
    expect(result.current.focusId).toBeUndefined();
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
