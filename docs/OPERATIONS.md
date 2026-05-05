# Operations

## Daily Shape

The owner works through `main`. High-stakes judgment routes to `consultant`. Scheduled checks run through `compliance`.

## Compliance Cron

All v1 compliance cron jobs use the current compliance model policy as primary, with Kimi and GLM fallbacks. The current selected primary is `openrouter/xiaomi/mimo-v2.5-pro` because it offers the best practical balance of reasoning quality, price, and non-hallucination behavior for scheduled watchdog work. Jobs are enabled by default after migration, but setup never runs them.

## Gateway

Gateway restart is an owner action. Setup can report that a restart is needed, but must not restart automatically.

## Model Updates

Model policy is curated. Normal users should not pick models during setup. Updates should ship as deliberate policy changes when a new model clearly beats the current default on quality, price, reasoning, and hallucination resistance.
