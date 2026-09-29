// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

'use client';

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChatChannelList, ChatLog } from '@eventuras/ratio-ui/chat';
import { Button } from '@eventuras/ratio-ui/core/Button';
import { Input } from '@eventuras/ratio-ui/forms';
import { myName, useSendMessage } from './actions';
import { type OratioChatLabels, oratioChatLabelsNb } from './labels';
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
// follows new messages.
const followThreshold = 48;

/**
 * A complete chat for the client of the nearest `OratioProvider`: room list,
 * message log and message field. Fills its container; give that a height.
 */
export function OratioChat({
  roomId: fixedRoomId,
  defaultRoomId,
  onRoomChange,
  labels: labelOverrides,
  locale,
  aside,
  className,
  style,
}: OratioChatProps) {
  const labels = { ...oratioChatLabelsNb, ...labelOverrides };
  const client = useOratioClient();
  const rooms = useRooms();
  const [selectedId, setSelectedId] = useState<string | null>(defaultRoomId ?? null);
  const roomId = fixedRoomId ?? selectedId ?? rooms[0]?.id ?? null;
  const room = rooms.find((room) => room.id === roomId);
  const messages = useTimeline(roomId, { locale });
  const send = useSendMessage(roomId);
  const showList = fixedRoomId === undefined;

  // ChatLog leaves scrolling to the caller: follow new messages while the
  // user is at the end, and start each room at its end.
  const logRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const onScroll = () => {
      following.current = log.scrollHeight - log.scrollTop - log.clientHeight < followThreshold;
    };
    log.addEventListener('scroll', onScroll, { passive: true });
    return () => log.removeEventListener('scroll', onScroll);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new room is the trigger, not an input
  useLayoutEffect(() => {
    following.current = true;
  }, [roomId]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: new messages are the trigger, not an input
  useLayoutEffect(() => {
    const log = logRef.current;
    if (log && following.current) log.scrollTop = log.scrollHeight;
  }, [messages]);

  function select(id: string) {
    setSelectedId(id);
    onRoomChange?.(id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get('text') ?? '');
    form.reset();
    following.current = true;
    await send(text);
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
        <ChatLog
          ref={logRef}
          aria-label={labels.messages}
          me={myName(client, roomId)}
          messages={messages}
          labels={labels.log}
        />
        {room?.encrypted ? (
          <p role="status" style={{ padding: '12px 22px 14px' }}>
            {labels.encryptedRoom}
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: '12px 22px 14px' }}>
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
          </form>
        )}
      </section>
    </div>
  );
}
