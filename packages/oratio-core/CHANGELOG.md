# @eventuras/oratio-core

## 0.3.0

### Minor Changes

- ba1f02c: History is paged by messages, not events.
  
  `loadOlder` and `loadNewer` page until the call has added `minMessages` messages (default 10), the room's start (or, for `loadNewer`, the live timeline), or `maxPages` requests (default 5). A room full of memberships, power levels and pins no longer needs several presses to show one message. In oratio-core: `loadOlder(client, timeline, { minMessages, maxPages, pageSize })`, and the same for `loadNewer`. In `useTimeline`: `loadOlder({ minMessages, maxPages })` and `loadNewer({ … })`.
  
  They still take a number: `loadOlder(50)` and `loadNewer(50)` are one request for that many events, as in 0.2.0. A call with no argument now uses the new behaviour.
  
  `openAt` loads about `minMessages` messages around the event, half before and half after, at most `maxPages` requests each way (`fillAround`, also exported). A message opened through `/context`, which matrix-js-sdk asks for the event alone, no longer shows as a single message. `useTimeline` passes its `minMessages` on.
  
  `hasOlder` turns false after a page back that brings no events, for homeservers that hand out a token at the room's start. `loadNewer` no longer pages the live timeline forwards, and stops once a timeline has met the next one.

## 0.2.0

### Minor Changes

- 0be8825: An embeddable chat. `oratio-react` gets `OratioProvider`, which runs a client for a session from the host and reports sessions the homeserver logged out; `OratioChat`, a complete chat that can also show a single room; `useOratioClient`, `useSendMessage` (with `/me` emotes) and `useCreateRoom`; and translatable labels in Norwegian Bokmål and English. `oratio-core` exports `HttpApiEvent`.
  
  Breaking: `useRooms` and `useTimeline` read the provider's client. Pass another as an option: `useRooms({ client })` and `useTimeline(roomId, { client, locale })`, instead of `useRooms(client)` and `useTimeline(client, roomId, options)`.
  
  `OratioChat` keeps the text of a message that could not be sent and shows `labels.sendFailed`. The English labels cover the room list and the log, and host labels for those merge per entry. `OratioProvider` starts a new client when the host renews a logged-out session, also for the same device.
- 6677334: Older history, and opening a room at a message.
  
  A room whose latest events are not messages, e.g. memberships, power levels and pins, no longer looks empty: it loads older events until it has messages to show. `oratio-core` gets `backfill`, `loadOlder`, `hasOlder`, `loadNewer`, `hasNewer`, `openAt` and `eventsFrom`, for the web and native apps alike, and `toOratioMessages` skips edits (`m.replace`), whose text matrix-js-sdk already shows in place of the message they edit. `startClient` turns on `timelineSupport`, which `openAt` needs for the homeserver's `/context` API.
  
  Breaking: `useTimeline` returns an object, `{ messages, hasOlder, loadingOlder, loadOlder, hasNewer, loadingNewer, loadNewer, jumpToLatest, focusId, focusMissing }`, instead of the messages. It loads older messages when a room opens with fewer than `minMessages` (20, at most `maxPages` requests), and with `around: eventId` opens the room at that message: loaded, paged back to, or in a timeline loaded around it.
  
  `OratioChat` takes `around`, highlights that message and scrolls to it, loads older messages as the user scrolls to the top, and offers a way back to the latest messages from an older part of the room. It needs `@eventuras/ratio-ui` 2.29 or later, for `highlightedId`.

## 0.1.0

### Minor Changes

- b4e1de0: First release. `oratio-core`: password and OIDC sign-in through the homeserver, a syncing client with token refresh, and the room and timeline mappings for `@eventuras/ratio-ui/chat`. `oratio-react`: the `useRooms` and `useTimeline` hooks.
