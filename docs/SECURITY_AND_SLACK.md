# Security And Slack

ProdClaw is local-first by default. The gateway is expected to bind to loopback unless the user deliberately hardens and exposes it.

## Slack Model

Two Slack bots are required:

- default bot: owner-facing interaction with `main`
- compliance bot: audit delivery from `compliance`

The compliance account uses disabled group policy and is intended for direct report delivery.

## Known Slack Gap

Owner-mediated relay for third-party channel mentions is future hardening. It should be implemented in runtime/plugin policy, not prompt text.

## Secret Handling

Setup scripts redact token-like values in output. Rendered files can contain real credentials; do not commit `rendered/`.
