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
  /** Shown when a message could not be sent. Its text stays in the field. */
  sendFailed: string;
  /** Built-in text of the room list. Merged per entry with the defaults. */
  roomList?: ChatChannelListLabels;
  /** Built-in text of the message log. Merged per entry with the defaults. */
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
  sendFailed: 'Meldingen ble ikke sendt. Prøv igjen.',
  roomList: {
    unread: (count) => `${count} uleste`,
    mention: 'Nevnt',
    muted: 'Dempet',
    members: (count) => `${count} medlemmer`,
    presence: (presence) => (presence === 'online' ? 'pålogget' : 'borte'),
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
  sendFailed: 'The message was not sent. Try again.',
  roomList: {
    unread: (count) => `${count} unread`,
    mention: 'Mentioned',
    muted: 'Muted',
    members: (count) => `${count} members`,
    presence: (presence) => (presence === 'online' ? 'online' : 'away'),
  },
  log: {
    reactions: 'Reactions',
    mentionsYou: 'Mentions you',
  },
};

/**
 * Host overrides on top of the Norwegian defaults. The room list and log
 * text merge per entry, so overriding one of them keeps the rest.
 */
export function resolveLabels(overrides: Partial<OratioChatLabels> = {}): OratioChatLabels {
  return {
    ...oratioChatLabelsNb,
    ...overrides,
    roomList: { ...oratioChatLabelsNb.roomList, ...overrides.roomList },
    log: { ...oratioChatLabelsNb.log, ...overrides.log },
  };
}
