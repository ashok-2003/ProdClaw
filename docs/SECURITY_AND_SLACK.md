# Security And Slack

ProdClaw is local-first by default. The gateway is expected to bind to loopback unless the user deliberately hardens and exposes it.

## Slack Model

ProdClaw v1 requires a compliance Slack app because compliance reports need a reliable production delivery path.

The main Slack app is optional. Enable it only if you want to interact with the main agent through Slack. Users may also work through their existing OpenClaw dashboard/local UI.

Required compliance Slack inputs:

- compliance Slack app token;
- compliance Slack bot token;
- compliance Slack member ID.

Optional main Slack inputs:

- main Slack app token;
- main Slack bot token.

Do not know your Slack member ID? Open Slack, click your profile, click the three dots, and choose **Copy member ID**. It usually starts with `U`.

The compliance account uses disabled group policy and is intended for direct report delivery.

## Runtime Verification

Do not trust config alone. Before enabling cron, ProdClaw must verify compliance Slack delivery through `prodclaw doctor` / `prodclaw enable-cron`.

If compliance Slack delivery fails, cron must not be enabled. Likely causes include wrong token, wrong member ID, Slack app not paired/authorized, Slack plugin not loaded, or gateway restart needed.

## Known Slack Gap

Owner-mediated relay for third-party channel mentions is future hardening. It should be implemented in runtime/plugin policy, not prompt text.

## Secret Handling

Setup scripts redact token-like values in output. Rendered files can contain real credentials; do not commit `rendered/`.
