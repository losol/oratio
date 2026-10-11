---
'@eventuras/oratio-core': minor
'@eventuras/oratio-react': minor
---

History is paged by messages, not events.

`loadOlder` and `loadNewer` page until the call has added `minMessages` messages (default 10), the room's start (or, for `loadNewer`, the live timeline), or `maxPages` requests (default 5). A room full of memberships, power levels and pins no longer needs several presses to show one message. In oratio-core: `loadOlder(client, timeline, { minMessages, maxPages, pageSize })`, and the same for `loadNewer`. In `useTimeline`: `loadOlder({ minMessages, maxPages })` and `loadNewer({ … })`.

They still take a number: `loadOlder(50)` and `loadNewer(50)` are one request for that many events, as in 0.2.0. A call with no argument now uses the new behaviour.

`openAt` loads about `minMessages` messages around the event, half before and half after, at most `maxPages` requests each way (`fillAround`, also exported). A message opened through `/context`, which matrix-js-sdk asks for the event alone, no longer shows as a single message. `useTimeline` passes its `minMessages` on.

`hasOlder` turns false after a page back that brings no events, for homeservers that hand out a token at the room's start. `loadNewer` no longer pages the live timeline forwards, and stops once a timeline has met the next one.
