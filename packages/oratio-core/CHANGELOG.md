# @eventuras/oratio-core

## 0.2.0

### Minor Changes

- 0be8825: An embeddable chat. `oratio-react` gets `OratioProvider`, which runs a client for a session from the host and reports sessions the homeserver logged out; `OratioChat`, a complete chat that can also show a single room; `useOratioClient`, `useSendMessage` (with `/me` emotes) and `useCreateRoom`; and translatable labels in Norwegian Bokmål and English. `oratio-core` exports `HttpApiEvent`.
  
  Breaking: `useRooms` and `useTimeline` read the provider's client. Pass another as an option: `useRooms({ client })` and `useTimeline(roomId, { client, locale })`, instead of `useRooms(client)` and `useTimeline(client, roomId, options)`.
  
  `OratioChat` keeps the text of a message that could not be sent and shows `labels.sendFailed`. The English labels cover the room list and the log, and host labels for those merge per entry. `OratioProvider` starts a new client when the host renews a logged-out session, also for the same device.

## 0.1.0

### Minor Changes

- b4e1de0: First release. `oratio-core`: password and OIDC sign-in through the homeserver, a syncing client with token refresh, and the room and timeline mappings for `@eventuras/ratio-ui/chat`. `oratio-react`: the `useRooms` and `useTimeline` hooks.
