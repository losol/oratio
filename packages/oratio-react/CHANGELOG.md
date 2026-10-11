# @eventuras/oratio-react

## 0.2.0

### Minor Changes

- 0be8825: An embeddable chat. `oratio-react` gets `OratioProvider`, which runs a client for a session from the host and reports sessions the homeserver logged out; `OratioChat`, a complete chat that can also show a single room; `useOratioClient`, `useSendMessage` (with `/me` emotes) and `useCreateRoom`; and translatable labels in Norwegian Bokmål and English. `oratio-core` exports `HttpApiEvent`.
  
  Breaking: `useRooms` and `useTimeline` read the provider's client. Pass another as an option: `useRooms({ client })` and `useTimeline(roomId, { client, locale })`, instead of `useRooms(client)` and `useTimeline(client, roomId, options)`.
  
  `OratioChat` keeps the text of a message that could not be sent and shows `labels.sendFailed`. The English labels cover the room list and the log, and host labels for those merge per entry. `OratioProvider` starts a new client when the host renews a logged-out session, also for the same device.
- 6677334: Older history, and opening a room at a message.
  
  A room whose latest events are not messages, e.g. memberships, power levels and pins, no longer looks empty: it loads older events until it has messages to show. `oratio-core` gets `backfill`, `loadOlder`, `hasOlder`, `loadNewer`, `hasNewer`, `openAt` and `eventsFrom`, for the web and native apps alike, and `toOratioMessages` skips edits (`m.replace`), whose text matrix-js-sdk already shows in place of the message they edit. `startClient` turns on `timelineSupport`, which `openAt` needs for the homeserver's `/context` API.
  
  Breaking: `useTimeline` returns an object, `{ messages, hasOlder, loadingOlder, loadOlder, hasNewer, loadingNewer, loadNewer, jumpToLatest, focusId, focusMissing }`, instead of the messages. It loads older messages when a room opens with fewer than `minMessages` (20, at most `maxPages` requests), and with `around: eventId` opens the room at that message: loaded, paged back to, or in a timeline loaded around it.
  
  `OratioChat` takes `around`, highlights that message and scrolls to it, loads older messages as the user scrolls to the top, and offers a way back to the latest messages from an older part of the room. It needs `@eventuras/ratio-ui` 2.29 or later, for `highlightedId`.

### Patch Changes

- Updated dependencies [0be8825]
- Updated dependencies [6677334]
  - @eventuras/oratio-core@0.2.0

## 0.1.0

### Minor Changes

- b4e1de0: First release. `oratio-core`: password and OIDC sign-in through the homeserver, a syncing client with token refresh, and the room and timeline mappings for `@eventuras/ratio-ui/chat`. `oratio-react`: the `useRooms` and `useTimeline` hooks.

### Patch Changes

- Updated dependencies [b4e1de0]
  - @eventuras/oratio-core@0.1.0
