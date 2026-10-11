---
'@eventuras/oratio-core': minor
'@eventuras/oratio-react': minor
---

Older history, and opening a room at a message.

A room whose latest events are not messages, e.g. memberships, power levels and pins, no longer looks empty: it loads older events until it has messages to show. `oratio-core` gets `backfill`, `loadOlder`, `hasOlder`, `loadNewer`, `hasNewer`, `openAt` and `eventsFrom`, for the web and native apps alike, and `toOratioMessages` skips edits (`m.replace`), whose text matrix-js-sdk already shows in place of the message they edit. `startClient` turns on `timelineSupport`, which `openAt` needs for the homeserver's `/context` API.

Breaking: `useTimeline` returns an object, `{ messages, hasOlder, loadingOlder, loadOlder, hasNewer, loadingNewer, loadNewer, jumpToLatest, focusId, focusMissing }`, instead of the messages. It loads older messages when a room opens with fewer than `minMessages` (20, at most `maxPages` requests), and with `around: eventId` opens the room at that message: loaded, paged back to, or in a timeline loaded around it.

`OratioChat` takes `around`, highlights that message and scrolls to it, loads older messages as the user scrolls to the top, and offers a way back to the latest messages from an older part of the room. It needs `@eventuras/ratio-ui` 2.29 or later, for `highlightedId`.
