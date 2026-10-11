// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

// The client and its events, so bindings subscribe through the same
// matrix-js-sdk instance as core.
export {
  ClientEvent,
  Direction,
  type EventTimeline,
  EventType,
  HttpApiEvent,
  type MatrixClient,
  Preset,
  RoomEvent,
} from 'matrix-js-sdk';
export {
  type BackfillOptions,
  backfill,
  countMessages,
  defaultPageSize,
  eventsFrom,
  type HistoryClient,
  type HistoryRoom,
  hasNewer,
  hasOlder,
  loadNewer,
  loadOlder,
  type OpenAtResult,
  openAt,
  type TimelineLike,
} from './history';
export { type MatrixUserId, parseUserId } from './ids';
export {
  beginOidcLogin,
  completeOidcLogin,
  type OidcLoginOptions,
  type PendingOidcLogin,
} from './oidc';
export {
  directRoomIds,
  joinedRooms,
  type OratioRoom,
  type RoomLike,
  toOratioRoom,
} from './rooms';
export {
  loginWithPassword,
  logout,
  type OratioSession,
  type PasswordLogin,
  type StartClientOptions,
  startClient,
} from './session';
export {
  type EventLike,
  isShownMessage,
  type OratioMessage,
  type TimelineOptions,
  toOratioMessages,
} from './timeline';
