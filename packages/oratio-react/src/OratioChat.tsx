// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChatChannelList, ChatLog } from '@eventuras/ratio-ui/chat';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { Input } from '@eventuras/ratio-ui/forms';
import { myName, useSendMessage } from './actions';
import { type OratioChatLabels, resolveLabels } from './labels';
import { useOratioClient } from './OratioProvider';
import { useRooms } from './useRooms';
import { useTimeline } from './useTimeline';

export interface OratioChatProps {
  /**
   * Show this room only, without the room list: a chat for one place, e.g.
   * a game location. The user must have joined it.
   */
  roomId?: string;
  /** The room to open first when the room list shows. @default the first room */
  defaultRoomId?: string;
  /**
   * Open the room at this message, e.g. from a link to it: the log scrolls
   * to it and highlights it. An older message shows in the part of the room
   * around it, until the user scrolls on to the latest.
   */
  around?: string;
  /** Called when the user opens another room from the list. */
  onRoomChange?: (roomId: string) => void;
  /** Text, e.g. from the host's translations. Missing entries fall back to Norwegian Bokmål. */
  labels?: Partial<OratioChatLabels>;
  /** BCP 47 locale for message times. @default the runtime's */
  locale?: string;
  /** Shown under the room list, e.g. buttons to create a room or sign out. */
  aside?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Within this distance of the end the log counts as read to the end, and
// follows new messages; within it of either edge, it loads more.
const edgeThreshold = 48;

/**
 * A complete chat for the client of the nearest `OratioProvider`: room list,
 * message log and message field. Fills its container; give that a height.
 */
export function OratioChat({
  roomId: fixedRoomId,
  defaultRoomId,
  around,
  onRoomChange,
  labels: labelOverrides,
  locale,
  aside,
  className,
  style,
}: OratioChatProps) {
  const labels = resolveLabels(labelOverrides);
  const client = useOratioClient();
  const rooms = useRooms();
  const [selectedId, setSelectedId] = useState<string | null>(defaultRoomId ?? null);
  const [sendFailed, setSendFailed] = useState(false);
  const roomId = fixedRoomId ?? selectedId ?? rooms[0]?.id ?? null;
  const room = rooms.find((room) => room.id === roomId);
  const timeline = useTimeline(roomId, { locale, around });
  const { messages, hasOlder, loadingOlder, hasNewer, focusId } = timeline;
  const send = useSendMessage(roomId);
  const showList = fixedRoomId === undefined;

  // ChatLog leaves scrolling to the caller: follow new messages while the
  // user is at the end, and start each room at its end, or at the message it
  // opens at, which ChatLog scrolls to itself. Scrolling to the top loads
  // older messages, and to the end of an older part of the room, newer ones.
  const logRef = useRef<HTMLDivElement>(null);
  const following = useRef(!around);
  // Distance from the end before older messages load, to keep the view still.
  const anchor = useRef<number | null>(null);
  const [atTop, setAtTop] = useState(false);
  const latest = useRef(timeline);
  latest.current = timeline;

  const loadOlder = useCallback(() => {
    const log = logRef.current;
    const { hasOlder, loadingOlder, loadOlder } = latest.current;
    if (!log || !hasOlder || loadingOlder) return;
    anchor.current = log.scrollHeight - log.scrollTop;
    loadOlder().catch(() => {
      anchor.current = null;
    });
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const onScroll = () => {
      const fromEnd = log.scrollHeight - log.scrollTop - log.clientHeight;
      const { hasNewer, loadingNewer, loadNewer } = latest.current;
      following.current = fromEnd < edgeThreshold && !hasNewer;
      setAtTop(log.scrollTop < edgeThreshold);
      if (log.scrollTop < edgeThreshold) loadOlder();
      if (fromEnd < edgeThreshold && hasNewer && !loadingNewer) loadNewer().catch(() => {});
    };
    log.addEventListener('scroll', onScroll, { passive: true });
    return () => log.removeEventListener('scroll', onScroll);
  }, [loadOlder]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new room is the trigger, not an input
  useLayoutEffect(() => {
    following.current = !around;
    anchor.current = null;
  }, [roomId, around]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: new messages are the trigger, not an input
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (anchor.current !== null) {
      // Older messages came in above: keep the same message in view.
      log.scrollTop = log.scrollHeight - anchor.current;
      anchor.current = null;
    } else if (following.current) {
      log.scrollTop = log.scrollHeight;
    }
    // A log that does not fill its box has no top to scroll to.
    setAtTop(log.scrollTop < edgeThreshold);
  }, [messages]);

  function jumpToLatest() {
    following.current = true;
    timeline.jumpToLatest();
  }

  function select(id: string) {
    setSelectedId(id);
    onRoomChange?.(id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const field = form.elements.namedItem('text') as HTMLInputElement | null;
    const text = field?.value ?? '';
    if (field) field.value = '';
    setSendFailed(false);
    following.current = true;
    try {
      await send(text);
    } catch {
      // Keep what the user wrote, unless they have started on something new.
      if (field && !field.value) field.value = text;
      setSendFailed(true);
    }
  }

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: showList ? '232px minmax(0, 1fr)' : 'minmax(0, 1fr)',
        height: '100%',
        minHeight: 0,
        ...style,
      }}
    >
      {showList && (
        <aside
          style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, minHeight: 0 }}
        >
          <ChatChannelList
            sections={[{ label: labels.rooms, rooms }]}
            activeId={roomId}
            onSelect={select}
            labels={labels.roomList}
            aria-label={labels.rooms}
          />
          {aside}
        </aside>
      )}
      <section
        aria-label={room?.name}
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        {client && !roomId && (
          <p role="status" style={{ padding: '12px 22px 0' }}>
            {labels.noRoom}
          </p>
        )}
        {timeline.focusMissing && (
          <p role="status" style={{ padding: '12px 22px 0' }}>
            {labels.messageMissing}
          </p>
        )}
        {loadingOlder ? (
          <p role="status" style={{ padding: '8px 22px 0', margin: 0 }}>
            {labels.loadingOlder}
          </p>
        ) : (
          hasOlder &&
          atTop && (
            <div style={{ padding: '8px 22px 0' }}>
              <Button variant="text" size="sm" onPress={loadOlder}>
                {labels.loadOlder}
              </Button>
            </div>
          )
        )}
        <ChatLog
          ref={logRef}
          aria-label={labels.messages}
          me={myName(client, roomId)}
          messages={messages}
          highlightedId={focusId}
          labels={labels.log}
        />
        {hasNewer && (
          <div style={{ padding: '8px 22px 0' }}>
            <Button variant="outline" size="sm" onPress={jumpToLatest}>
              {labels.jumpToLatest}
            </Button>
          </div>
        )}
        {room?.encrypted ? (
          <p role="status" style={{ padding: '12px 22px 14px' }}>
            {labels.encryptedRoom}
          </p>
        ) : (
          <form onSubmit={submit} style={{ padding: '12px 22px 14px' }}>
            {sendFailed && (
              <p role="alert" style={{ margin: '0 0 8px' }}>
                {labels.sendFailed}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                name="text"
                aria-label={labels.message}
                placeholder={client ? labels.messagePlaceholder : labels.connecting}
                autoComplete="off"
                style={{ flex: 1 }}
              />
              <Button type="submit" isDisabled={!client || !roomId}>
                {labels.send}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
