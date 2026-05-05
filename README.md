# ProdClaw

Your AI agent is not slow because the model is weak. It is slow because the harness is noisy.

ProdClaw is an opinionated operating system for a personal OpenClaw runtime: three agents, one memory layer, one model router, two Slack bots, and a compliance loop that keeps the system honest. It is built for people who already run OpenClaw and want the architecture, not a blank configuration file.

This is not a generic starter kit. It is a migration path into a specific working shape.

## The Bet

Most agent setups optimize the wrong thing. They add more prompt, more tools, more providers, more autonomy, and then wonder why the system gets slower and less predictable.

ProdClaw takes the opposite position:

- the harness should be thin;
- the skills should be fat;
- model routing should be centralized;
- memory should be a real subsystem;
- recurring audits should be scheduled, not remembered;
- Slack should be an interface, not an unbounded permission surface.

The architecture is intentionally opinionated because the value is in the shape. You can change it, but the default should already know what it is trying to be.

## What You Get

| Layer | Decision |
| --- | --- |
| Runtime | Existing OpenClaw installation, migrated in place after backup |
| Agents | `main`, `consultant`, `compliance` |
| Models | OpenRouter-first policy with curated primary/fallback chains |
| Memory | LanceDB Pro as the semantic memory slot |
| Slack | Two required bots: default user-facing bot and compliance delivery bot |
| Cron | Compliance jobs enabled by default, using Mimo v2.5 Pro |
| Surface area | Native provider plugins disabled; only utility/channel plugins stay on |

## Why It Feels Faster

The harness gets lighter by removing unnecessary runtime surface:

| Removed Pressure | Replacement |
| --- | --- |
| Native provider plugin sprawl | OpenRouter-first model plane |
| Manual memory discipline | LanceDB Pro auto-capture/auto-recall |
| One agent doing every job | Main/consultant/compliance separation |
| Prompt-only governance | Compliance cron and validation scripts |
| Always-on broad tools | Narrow defaults plus explicit allowances |

## Before / After

Without this harness, OpenClaw usually grows by accident: provider plugins stay enabled, prompts accrete, cron jobs drift, memory becomes ambiguous, and every new feature adds more context weight.

With this harness, the runtime has a job:

- `main` orchestrates the owner-facing work.
- `consultant` handles high-quality architecture and judgment.
- `compliance` audits the harness on a schedule.
- LanceDB Pro owns semantic memory.
- OpenRouter owns model routing.
- Slack owns the human interface.

The design goal is simple: keep the harness thin, keep skills fat, and keep recurring operational discipline outside the user's head.

## Install Path

Primary path: existing OpenClaw users.

```bash
node scripts/setup.mjs inspect --home ~/.openclaw
node scripts/setup.mjs render --home ~/.openclaw --out ./rendered \
  --user-name "Your Name" \
  --openrouter-api-key "$OPENROUTER_API_KEY" \
  --slack-bot-token "$SLACK_BOT_TOKEN" \
  --slack-app-token "$SLACK_APP_TOKEN" \
  --slack-compliance-bot-token "$SLACK_COMPLIANCE_BOT_TOKEN" \
  --slack-compliance-app-token "$SLACK_COMPLIANCE_APP_TOKEN" \
  --slack-user-id "$SLACK_USER_ID" \
  --user-home "$HOME" \
  --timezone "America/New_York"
node scripts/validate.mjs --rendered ./rendered
node scripts/setup.mjs diff --home ~/.openclaw --rendered ./rendered
node scripts/setup.mjs apply --home ~/.openclaw --rendered ./rendered --yes
```

From-scratch OpenClaw setup is intentionally deferred. See [docs/FROM_SCRATCH_DEFERRED.md](docs/FROM_SCRATCH_DEFERRED.md).

## Agent-Led Setup

If an agent is doing the install, start with [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md). The agent must inspect first, render second, validate third, and apply only after explicit approval.

## Design Documents

- [Reference Architecture](docs/REFERENCE_ARCHITECTURE.md)
- [Existing OpenClaw Migration](docs/EXISTING_OPENCLAW_MIGRATION.md)
- [Security And Slack](docs/SECURITY_AND_SLACK.md)
- [Operations](docs/OPERATIONS.md)
- [From-Scratch Setup Deferred](docs/FROM_SCRATCH_DEFERRED.md)

## Safety Boundary

ProdClaw does not manage your memories, sessions, logs, auth profiles, or LanceDB data. It stages only the opinionated harness files: config, workspace instructions, skills, compliance prompts, and cron definitions.
