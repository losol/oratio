// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { EventType, type MatrixEvent, MsgType } from 'matrix-js-sdk';
import { parseUserId } from './ids';

/**
 * A timeline row. Same shape as `ChatLogMessage` in
 * `@eventuras/ratio-ui/chat`, without depending on it.
 */
export interface OratioMessage {
  id: string;
  type: 'msg' | 'action';
  time: string;
  nick: string;
  text: string;
}

/** The parts of a matrix-js-sdk `MatrixEvent` the mapping reads. */
export type EventLike = Pick<
  MatrixEvent,
  'getId' | 'getType' | 'getContent' | 'getSender' | 'getTs' | 'isRedacted'
> & { sender?: { name: string } | null };

export interface TimelineOptions {
  /** BCP 47 locale for message times. @default the runtime's */
  locale?: string;
}

/**
 * Maps timeline events to log rows: text messages, notices and `/me` emotes.
 * Everything else (state changes, reactions, encrypted events) is skipped for now.
 */
export function toOratioMessages(
  events: readonly EventLike[],
  options: TimelineOptions = {},
): OratioMessage[] {
  const time = new Intl.DateTimeFormat(options.locale, { hour: '2-digit', minute: '2-digit' });
  const messages: OratioMessage[] = [];
  for (const event of events) {
    const id = event.getId();
    if (!id || event.getType() !== EventType.RoomMessage || event.isRedacted()) {
      continue;
    }
    const content = event.getContent<{ msgtype?: string; body?: unknown }>();
    if (typeof content.body !== 'string') {
      continue;
    }
    const sender = event.getSender() ?? '';
    messages.push({
      id,
      type: content.msgtype === MsgType.Emote ? 'action' : 'msg',
      time: time.format(event.getTs()),
      nick: event.sender?.name ?? parseUserId(sender)?.localpart ?? sender,
      text: content.body,
    });
  }
  return messages;
}
