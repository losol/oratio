# oratio-web

Helm chart for the oratio web client: the static app in
`ghcr.io/losol/oratio-web`, served by Caddy with a strict
Content-Security-Policy, behind a Gateway API route.

```yaml
hostname: chat.example.org
homeserverUrl: https://matrix.example.org
image:
  tag: main-1a2b3c4            # CI tags every build on main
httpRoute:
  gateway:
    sectionName: https-example
```

`homeserverUrl` becomes the app's `/config.json` and the CSP's
`connect-src`. Sign-in through Keycloak also needs the homeserver to accept
this host: put `hostname` in the Tuwunel chart's `oidc.allowedRedirectHosts`,
or leave that list empty and users approve the app at each sign-in.
