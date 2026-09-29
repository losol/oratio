// oratio · a chat client for Matrix
// SPDX-FileCopyrightText: 2026 Losol AS
// SPDX-License-Identifier: MPL-2.0

// The client and its events, so bindings subscribe through the same
// matrix-js-sdk instance as core.
export {
  ClientEvent,
  EventType,
  HttpApiEvent,
  type MatrixClient,
  Preset,
  RoomEvent,
} from 'matrix-js-sdk';
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
  type OratioMessage,
  type TimelineOptions,
  toOratioMessages,
} from './timeline';
