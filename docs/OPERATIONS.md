# Operations

## Daily Shape

The owner works through `main`. High-stakes judgment routes to `consultant`. Scheduled checks run through `compliance`.

## Compliance Cron

All v1 compliance cron jobs use `openrouter/xiaomi/mimo-v2.5-pro` as primary with Kimi and GLM fallbacks. Jobs are enabled by default after migration, but setup never runs them.

## Gateway

Gateway restart is an owner action. Setup can report that a restart is needed, but must not restart automatically.

## Model Updates

Model policy is curated. Normal users should not pick models during setup; updates should ship as a deliberate policy change.
