# oratio

A chat client for [Matrix](https://matrix.org), built on the eventuras stack:
[ratio-ui](https://github.com/losol/ratio-ui) for the interface,
[Tuwunel](https://github.com/matrix-construct/tuwunel) as the homeserver and
Keycloak ([tessera-idp](https://github.com/losol/tessera-idp)) for sign-in.

One client, several homes: the course system (eventuras), Losvik kommune, and
more later. Web first; native apps may follow.

## Layout

```
apps/web                Demo client (React Router, SPA)
packages/oratio-core    Framework-agnostic Matrix client on matrix-js-sdk
packages/oratio-react   React hooks and components on ratio-ui/chat
infra/charts/tuwunel    Helm chart for the Tuwunel homeserver
infra/charts/oratio-web Helm chart for the web client (image ghcr.io/losol/oratio-web)
infra/dev/              Local Tuwunel and Keycloak via Docker Compose
```

Folders appear as they are built. See Status.

## Development

Requires Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm lint       # Biome: format, imports and lint rules in one pass
pnpm build
pnpm test
```

### Run the demo

```sh
docker compose -f infra/dev/docker-compose.yml up -d   # Tuwunel and Keycloak
pnpm build
pnpm --filter @eventuras/oratio-web dev                # https://localhost:5173
```

Signing in through Keycloak needs the app on https. Create a local certificate
once with [mkcert](https://github.com/FiloSottile/mkcert); the dev server picks
it up from `infra/dev/certs`, which git ignores:

```sh
mkcert -install
mkcert -cert-file infra/dev/certs/localhost.pem -key-file infra/dev/certs/localhost-key.pem localhost 127.0.0.1
```

Without it the app runs on http and only password sign-in works.

| Service  | URL                   | Notes                                                         |
| -------- | --------------------- | ------------------------------------------------------------- |
| Tuwunel  | http://localhost:8008 | `server_name` `localhost`, config in `infra/dev/tuwunel.toml` |
| Keycloak | http://localhost:8080 | realm `oratio`, ratio login theme, admin/admin                |

Keycloak has the users `ole`, `ingrid` and `tor`, all with password `oratio`.
Signing in through Keycloak creates the Matrix user on first login. Its ID is
the Keycloak user ID, e.g. `@e7ef1fe6-…:localhost`, with the person's name as
display name. Password accounts such as `@ole:localhost` are separate users.

Password accounts work too. Register one with the token `oratio-dev`:

```sh
curl -X POST http://localhost:8008/_matrix/client/v3/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ole","password":"oratio","auth":{"type":"m.login.registration_token","token":"oratio-dev"}}'
```

The first user registered becomes server admin.

Releases use [changesets](https://github.com/changesets/changesets):
`pnpm changeset` records a change.

## Status

Early development. The monorepo skeleton is being set up.

## License

MPL-2.0
