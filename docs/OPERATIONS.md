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
- detect LanceDB Pro plugin entry and memory slot binding;
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
- report LanceDB Pro as required when missing or not bound;
- recommend render flags or local profile values until interactive configure lands.

Deferred work:

- interactive configure prompts;
- staged config persistence;
- full runtime smoke checks, which belong to `prodclaw doctor`;
- cron enablement, which belongs to `prodclaw enable-cron`;
- managed-file rollback, which belongs to `prodclaw revert`;
- OpenClaw CLI-based cron and agent registration, tracked in #24.

## Slack Policy

Compliance Slack is required in v1 because compliance reports need a reliable production delivery path.

Main Slack is optional. Users may skip the main/default Slack account and continue using their existing OpenClaw dashboard or local UI for owner-facing interaction.

Current implementation scope:

- rendered config includes the compliance Slack account by default;
- rendered config omits the main/default Slack account by default;
- validation requires compliance Slack;
- validation allows main/default Slack to be absent;
- validation checks main/default Slack only when it is present;
- docs include Slack member ID helper text.

Deferred Slack work:

- compliance Slack delivery test in `prodclaw doctor`;
- cron enablement gate based on successful compliance delivery;
- Slack app pairing automation;
- gateway restart approval flow.

## Compliance Cron

All v1 compliance cron jobs use `openrouter/xiaomi/mimo-v2.5-pro` as primary with Kimi and GLM fallbacks. Jobs are enabled by default after migration, but setup never runs them.

Cron templates are declarative. `templates/cron/jobs.json.tpl` and rendered `cron/jobs.json` should describe what jobs exist and how they should run: job identity, schedule, target agent, model policy, tools, and payload.

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

## Gateway

Gateway restart is an owner action. Setup can report that a restart is needed, but must not restart automatically.

## Model Updates

Model policy is curated. Normal users should not pick models during setup; updates should ship as a deliberate policy change.
