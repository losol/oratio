# @eventuras/oratio-core

Framework-agnostic core of the oratio Matrix client. Wraps
[matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) and maps rooms,
timelines and members to the shapes that `@eventuras/ratio-ui/chat` renders.

No DOM dependencies: storage and other platform services are injected, so the
package can serve a web app, a Capacitor shell or React Native.

## Install

```sh
pnpm add @eventuras/oratio-core
```

## Status

Early, 0.x: the API may change between minor versions. Signs in with a
password or through the homeserver's OIDC (MSC3861), syncs with token refresh,
and maps rooms and timelines. No end-to-end encryption.

## Development

```sh
pnpm --filter @eventuras/oratio-core build
pnpm --filter @eventuras/oratio-core test
```

## License

MPL-2.0
