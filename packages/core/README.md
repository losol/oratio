# @eventuras/oratio-core

Framework-agnostic core of the oratio Matrix client. Wraps
[matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) and maps rooms,
timelines and members to the shapes that `@eventuras/ratio-ui/chat` renders.

No DOM dependencies: storage and other platform services are injected, so the
package can serve a web app, a Capacitor shell or React Native.

## Status

Skeleton. The Matrix client itself is not here yet.

## Development

```sh
pnpm --filter @eventuras/oratio-core build
pnpm --filter @eventuras/oratio-core test
```

## License

MPL-2.0
