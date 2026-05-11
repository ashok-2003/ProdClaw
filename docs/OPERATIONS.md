# Operations

## Daily Shape

The owner works through `main`. High-stakes judgment routes to `consultant`. Scheduled checks run through `compliance`.

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
