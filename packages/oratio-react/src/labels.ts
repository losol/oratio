// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import type { ChatChannelListLabels, ChatLogLabels } from '@eventuras/ratio-ui/chat';

/** The text of {@link OratioChat}. Hosts translate it; Norwegian Bokmål is the default. */
export interface OratioChatLabels {
  /** Name of the room list, and the eyebrow above it. */
  rooms: string;
  /** Name of the message log. */
  messages: string;
  /** Name of the message field. */
  message: string;
  /** Placeholder of the message field. */
  messagePlaceholder: string;
  /** Placeholder of the message field while the client starts. */
  connecting: string;
  send: string;
  /** Shown instead of the message field in an end-to-end encrypted room. */
  encryptedRoom: string;
  /** Shown when there is no room to open. */
  noRoom: string;
  /** Built-in text of the room list. */
  roomList?: ChatChannelListLabels;
  /** Built-in text of the message log. */
  log?: ChatLogLabels;
}

export const oratioChatLabelsNb: OratioChatLabels = {
  rooms: 'Rom',
  messages: 'Meldinger',
  message: 'Melding',
  messagePlaceholder: 'Skriv en melding',
  connecting: 'Kobler til…',
  send: 'Send',
  encryptedRoom:
    'Dette rommet er ende-til-ende-kryptert. oratio kan ikke lese eller sende krypterte meldinger ennå.',
  noRoom: 'Ingen rom ennå.',
  roomList: {
    unread: (count) => `${count} uleste`,
    mention: 'Nevnt',
    muted: 'Dempet',
    members: (count) => `${count} medlemmer`,
  },
  log: {
    reactions: 'Reaksjoner',
    mentionsYou: 'Nevner deg',
  },
};

export const oratioChatLabelsEn: OratioChatLabels = {
  rooms: 'Rooms',
  messages: 'Messages',
  message: 'Message',
  messagePlaceholder: 'Write a message',
  connecting: 'Connecting…',
  send: 'Send',
  encryptedRoom:
    'This room is end-to-end encrypted. oratio cannot read or send encrypted messages yet.',
  noRoom: 'No rooms yet.',
};
