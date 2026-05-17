# Operations

## Daily Shape

The owner works through `main`. High-stakes judgment routes to `consultant`. Scheduled checks run through `compliance`.

## Inspect and Configure

`prodclaw inspect` is a read-only local detection command. It should not write to the live OpenClaw home.

Current inspect scope:

- detect OpenClaw home from `--home`, `OPENCLAW_HOME`, then `~/.openclaw`;
- detect timezone from the local runtime;
- detect OpenClaw config files when present;
- detect OpenClaw version when available;
- detect whether OpenRouter appears configured without printing secrets;
- detect Slack accounts when present in config;
- detect compliance Slack, main Slack, and Slack member ID signals;
- detect detailed LanceDB Pro state;
- detect cron config and compliance cron job count;
- detect local skills directory count;
- report gateway status only as a lightweight signal.

`prodclaw configure` is non-destructive in this pass. It summarizes missing required inputs and does not write to the live OpenClaw home.

Current configure scope:

- report owner name as still needing confirmation unless supplied by profile/flag;
- ask for OpenRouter only when not detected;
- ask for compliance Slack app/bot tokens only when compliance Slack is not detected;
- ask for Slack member ID only when not detected;
- keep main Slack optional;
- report LanceDB Pro as required when missing, disabled, or not bound;
- recommend render flags or local profile values until interactive configure lands.

Deferred work:

- interactive configure prompts;
- staged config persistence;
- cron enablement, which belongs to `prodclaw enable-cron`;
- managed-file rollback, which belongs to `prodclaw revert`;
- OpenClaw CLI-based cron and agent registration, tracked in #24.

## Doctor Preflight

`prodclaw doctor` answers whether the current setup looks safe enough to continue, using `READY`, `WARN`, and `BROKEN` output.

Current doctor scope is local-only and read-only:

- checks OpenClaw home exists;
- checks OpenClaw config is readable;
- checks OpenClaw version when available;
- checks OpenRouter key/config signal without printing secrets;
- checks LanceDB Pro config state;
- checks compliance Slack account presence;
- checks compliance Slack app/bot token presence without printing token values;
- checks Slack member ID shape when available;
- checks cron config presence;
- checks whether ProdClaw/compliance cron jobs exist;
- warns if ProdClaw/compliance cron jobs appear enabled before smoke tests;
- checks rendered directory presence;
- checks backup parent writability;
- exits non-zero when required pieces are `BROKEN`.

Deferred doctor smoke tests:

- OpenRouter model reachability check;
- LanceDB Pro memory store/recall check;
- compliance Slack DM delivery check;
- gateway/pairing verification;
- cron enablement gate based on successful smoke tests.

Doctor must not mutate the live OpenClaw home. It must not restart the gateway, enable cron, install plugins, or print raw secrets.

## LanceDB Pro Policy

LanceDB Pro is required in v1. ProdClaw does not offer a degraded no-memory mode in v1 because durable semantic memory is part of the product promise.

Current implementation scope:

- inspect detects whether the `memory-lancedb-pro` plugin entry exists;
- inspect detects whether the plugin entry is enabled;
- inspect detects whether the memory slot is bound to `memory-lancedb-pro`;
- inspect detects when a different memory plugin is currently active;
- inspect detects likely local extension/load-path presence without treating it as a smoke test;
- configure reports LanceDB Pro as required when missing, disabled, or not bound;
- validation remains strict that rendered config uses `memory-lancedb-pro` as the memory slot;
- action guidance says to preserve existing LanceDB data and old memory plugin data.

State handling:

- installed and enabled with memory slot bound: continue, but doctor must still smoke test later;
- installed but disabled: enable after approval and preserve data;
- missing from config: install/register/enable after approval;
- different memory plugin active: preserve old plugin/config/data and switch slot only after approval;
- broken or unknown: stop later in doctor until repaired.

Deferred LanceDB Pro work:

- actual plugin install;
- actual plugin enable/bind writes;
- memory store/recall smoke test;
- cleanup of doctor test memory if supported;
- OpenClaw CLI-based plugin registration if available;
- memory migration from other plugins or markdown memory.

ProdClaw does not require a separate database server. OpenClaw runtime storage and LanceDB Pro memory are local/embedded storage concerns.

## Slack Policy

Compliance Slack is required in v1 because compliance reports need a reliable production delivery path.

Main Slack is optional. Users may skip the main/default Slack account and continue using their existing OpenClaw dashboard or local UI for owner-facing interaction.

Current implementation scope:

- rendered config includes the compliance Slack account by default;
- rendered config omits the main/default Slack account by default;
- render supports one-bot mode when only compliance Slack is configured;
- render supports two-bot mode when `--enable-main-slack` is passed with main Slack tokens, or both main Slack token environment variables are present;
- validation requires compliance Slack;
- validation allows main/default Slack to be absent;
- validation checks main/default Slack only when it is present;
- docs include Slack member ID helper text.

Render examples:

```bash
# One-bot mode: compliance Slack only
prodclaw render --home ~/.openclaw --out ./rendered \
  --slack-compliance-app-token <value> \
  --slack-compliance-bot-token <value>

# Two-bot mode: compliance Slack plus main Slack
prodclaw render --home ~/.openclaw --out ./rendered \
  --enable-main-slack \
  --slack-compliance-app-token <value> \
  --slack-compliance-bot-token <value> \
  --slack-app-token <value> \
  --slack-bot-token <value>
```

Deferred Slack work:

- compliance Slack delivery test in `prodclaw doctor`;
- cron enablement gate based on successful compliance delivery;
- Slack app pairing automation;
- gateway restart approval flow.

## Compliance Cron

All v1 compliance cron jobs use `openrouter/xiaomi/mimo-v2.5-pro` as primary with Kimi and GLM fallbacks.

ProdClaw-owned cron jobs must render disabled by default. Setup, render, validate, diff, and apply must not run cron. `prodclaw enable-cron` is the only command that should enable ProdClaw-owned cron jobs, and it must wait for future live smoke checks.

Current implementation scope:

- ProdClaw-owned cron jobs use the `prodclaw.compliance.*` namespace;
- rendered ProdClaw-owned jobs are disabled by default;
- rendered ProdClaw-owned jobs target the `compliance` agent;
- delivery jobs include the `message` tool;
- delivery jobs target Slack `accountId=compliance`;
- validation rejects runtime-only cron state;
- validation rejects enabled ProdClaw cron jobs before `enable-cron`.

Cron templates are declarative. `templates/cron/jobs.json.tpl` and rendered `cron/jobs.json` should describe desired jobs: identity, schedule, target agent, model policy, tools, and payload.

Cron runtime state is owned by the local OpenClaw runtime, not by ProdClaw templates. Do not commit or render prior runtime fields such as:

- `state`
- `runHistory`
- `lastRun` / `nextRun`
- `lastRunAt` / `nextRunAt`
- `lastRunAtMs` / `nextRunAtMs`
- `lastRunStatus` / `lastStatus`
- `lastDurationMs`
- `lastDeliveryStatus`
- `lastError`
- `consecutiveErrors`

Fresh migrations must not start with previous errors, stale timestamps, old delivery state, or copied billing failures from another environment. Validation rejects runtime-only cron keys in rendered cron jobs.

If an existing user already has local cron runtime state, migration/apply logic should preserve or merge that state locally in the target OpenClaw home. It should never come from a committed template.

Deferred cron work:

- real `prodclaw enable-cron` implementation;
- compliance Slack delivery smoke test;
- OpenRouter and LanceDB live smoke gates;
- OpenClaw CLI-based cron registration from #24;
- preservation/merge logic for non-ProdClaw cron jobs.

## Gateway

Gateway restart is an owner action. Setup can report that a restart is needed, but must not restart automatically.

## Model Updates

Model policy is curated. Normal users should not pick models during setup; updates should ship as a deliberate policy change.
