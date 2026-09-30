# tuwunel

Helm chart for the [Tuwunel](https://github.com/matrix-construct/tuwunel)
Matrix homeserver: one pod on a RocksDB volume, a Gateway API route, and
optional sign-in through Keycloak (tessera-idp) via Tuwunel's OIDC server.

## Minimal

```yaml
serverName: example.org          # permanent: in every user ID
hostname: matrix.example.org
httpRoute:
  gateway:
    sectionName: https-example
```

A closed server: no federation, no registration, clients only.

## With Keycloak sign-in

```yaml
serverName: example.org
hostname: matrix.example.org
existingSecret: tuwunel-secrets   # key keycloak_client_secret
oidc:
  # Trusted clients: no approval page, and no one else can register.
  # Hosts for web apps, URI schemes for native ones (Element X).
  allowedRedirectHosts: [chat.example.org, app.element.io, io.element.elementx]
identityProviders:
  - brand: Keycloak
    name: Example ID
    clientId: tuwunel             # never change once in use
    issuerUrl: https://id.example.org/realms/example
    clientSecretKey: keycloak_client_secret
    trusted: true
    useridClaims: [sub]           # permanent, see below
```

**Choose `useridClaims` before the first sign-in.** Tuwunel derives the Matrix
localpart from these claims at every login, so changing them later gives
existing users a second account. `sub` is Keycloak's user ID: it never
changes and is always a valid localpart, giving IDs like
`@e7ef1fe6-ec9f-413c-b993-17a64712dfdc:example.org` with the user's name as
display name. `preferred_username` gives readable IDs, but tessera-otp creates
users with their email as username, which is not a valid localpart, and
Tuwunel then falls back to a random one.

Without an allowlist, any client can register, and Tuwunel shows its
unstyled "Authorize application" page at every sign-in, also for a client
that signed in before.

Register a confidential client in Keycloak with the redirect URI
`https://matrix.example.org/_matrix/client/unstable/login/sso/callback/tuwunel`.

## Secrets

The chart mounts `existingSecret` at `/run/secrets/tuwunel` and never creates
it. Keys it reads:

| Key                        | When                     |
| -------------------------- | ------------------------ |
| `registration_token`       | `registration.enabled`   |
| `<clientSecretKey>`        | per identity provider    |

Appservice registrations live in a Secret of their own, see Appservices.

## Appservices

For bridges, bots, or a host app that signs its users in itself, such as
civitas. Put one registration per key in a Secret, in Synapse's YAML format:

```yaml
# lk_staging.yaml
id: lk_staging
url: null                        # receive-only: the host calls the homeserver
as_token: <random>               # the host's token
hs_token: <random>
sender_localpart: lk_staging_bot
rate_limited: false
namespaces:
  users:
    - exclusive: true
      regex: '@lk_staging_.*:example.org'
  aliases: []
  rooms: []
```

```sh
kubectl create secret generic tuwunel-appservices --from-file=lk_staging.yaml
```

```yaml
appservices:
  existingSecret: tuwunel-appservices
```

The chart mounts the Secret at `/etc/tuwunel/appservices` and sets
`appservice_dir`, so the tokens never reach the ConfigMap: Tuwunel has no
`as_token_file`. Several keys give several appservices, each confined to its
namespace. Tuwunel reads the directory only at startup: annotate the pod for
Stakater Reloader (`podAnnotations: {reloader.stakater.com/auto: "true"}`)
so a changed Secret restarts it. Without `appservices`, nothing is mounted
and the config is unchanged.

## Delegation

When `serverName` differs from `hostname`, set `wellKnown.delegation.enabled`
so `https://<serverName>/.well-known/matrix/*` reaches Tuwunel, with the
Gateway listener for that host in `wellKnown.delegation.sectionName`.

## Data

Messages, rooms, users and uploads live in RocksDB on the PVC. The PVC is kept
when the release is uninstalled. The deployment uses `Recreate`: two pods must
never open the same database. Backups are not part of this chart.

Local development uses the same settings in `infra/dev/tuwunel.toml`.
