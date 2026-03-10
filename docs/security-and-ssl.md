# Security, SSL, and Proxy Controls

ReqPilot has two security layers:

1. Workspace-level defaults (`SSL & Security` modal)
2. Request-level overrides (`Settings` tab in request builder)

## Workspace-level Settings

Use footer `SSL` button to open global security settings.

- Default SSL verification toggle
- Default system proxy usage toggle
- Host-specific SSL rules (exact/wildcard patterns)

<div class="rp-shot">
  <img src="/screenshots/security-settings.png" alt="SSL and security settings modal" />
</div>

## Request-level Settings

In each request's `Settings` tab:

- SSL mode: inherit / always verify / disable verification
- Proxy mode: inherit / always use proxy env / never use proxy env
- Optional read-only display of `HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`
- Advanced TLS cert inputs (CA, cert, key, passphrase)

## TLS Certificates

ReqPilot supports client certificate configuration with both file upload and text entry:

- CA certificate (PEM)
- Client certificate (PEM)
- Client private key (PEM)
- Optional passphrase

Use these only for trusted enterprise endpoints requiring mTLS.

## Recommended Policy

1. Keep SSL verification enabled by default.
2. Add host-specific exceptions only when required.
3. Keep proxy usage explicit in enterprise networks.
4. Do not commit private cert material into Git repositories.
