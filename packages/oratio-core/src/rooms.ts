// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

import { KnownMembership, NotificationCountType, type Room } from 'matrix-js-sdk';

/**
 * A room as the room list shows it, seen by the signed-in user: `unread`,
 * `mention` and a DM's `name` are that user's own, computed by the homeserver.
 * Same shape as `ChatRoom` in `@eventuras/ratio-ui/chat`, without depending on it.
 */
export interface OratioRoom {
  id: string;
  kind: 'channel' | 'group' | 'dm';
  name: string;
  /** Unread messages for this user, from the server's notification counts. */
  unread?: number;
  /** This user was mentioned or otherwise highlighted in an unread message. */
  mention?: boolean;
  members?: number;
}

/** The parts of a matrix-js-sdk `Room` the mapping reads. */
export type RoomLike = Pick<
  Room,
  'roomId' | 'name' | 'getJoinedMemberCount' | 'getUnreadNotificationCount'
>;

/**
 * Maps a Matrix room to a room-list entry. `directRoomIds` comes from the
 * user's `m.direct` account data: those rooms are direct messages.
 */
export function toOratioRoom(room: RoomLike, directRoomIds: ReadonlySet<string>): OratioRoom {
  const unread = room.getUnreadNotificationCount(NotificationCountType.Total);
  const highlights = room.getUnreadNotificationCount(NotificationCountType.Highlight);
  return {
    id: room.roomId,
    kind: directRoomIds.has(room.roomId) ? 'dm' : 'channel',
    name: room.name,
    ...(unread > 0 && { unread }),
    ...(highlights > 0 && { mention: true }),
    members: room.getJoinedMemberCount(),
  };
}

/** The room IDs listed in `m.direct`, which maps each user ID to their DM rooms. */
export function directRoomIds(mDirect: Record<string, string[]> | undefined): Set<string> {
  return new Set(Object.values(mDirect ?? {}).flat());
}

/** Rooms the user has joined, sorted by name. Invites and left rooms are not listed yet. */
export function joinedRooms(rooms: Room[]): Room[] {
  return rooms
    .filter((room) => room.getMyMembership() === KnownMembership.Join)
    .sort((a, b) => a.name.localeCompare(b.name));
}
