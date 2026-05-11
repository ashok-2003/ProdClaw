# ProdClaw

ProdClaw turns an existing OpenClaw setup into a reliable, cost-efficient personal AI coworker.

Your AI agent should not forget, drift, or silently break. ProdClaw adds an opinionated production harness around OpenClaw: durable memory through LanceDB Pro, OpenRouter model routing, main/consultant/compliance role separation, compliance Slack delivery, scheduled self-audits, safe backup, and managed-file rollback.

ProdClaw v1 is for existing OpenClaw users who want a production-ready setup. It is not a from-scratch OpenClaw installer yet.

ProdClaw does not replace your whole OpenClaw home or take ownership of runtime data. It adds a managed production harness around the parts it owns, while preserving conversations, memory, logs, auth, runtime databases, non-ProdClaw skills, and user-created files.

## Who v1 is for

ProdClaw v1 is for existing OpenClaw users, technical founders, indie hackers, AI power users, and small technical teams who want a stricter production harness around their local agent runtime.

It assumes you are comfortable with OpenRouter, Slack apps, and an existing OpenClaw installation.

If you do not already have OpenClaw installed, wait for the v2 from-scratch setup path.

## Requirements

ProdClaw v1 requires:

- an existing OpenClaw installation;
- OpenRouter for model routing;
- LanceDB Pro for memory;
- a compliance Slack app for audit delivery.

A main Slack app is optional. You can skip it if you prefer to interact through your existing OpenClaw dashboard/local UI.

ProdClaw does not require a separate database server. OpenClaw runtime storage and LanceDB Pro memory are local/embedded storage concerns.

## What ProdClaw adds

| Layer | v1 decision |
| --- | --- |
| Runtime | Existing OpenClaw installation, migrated in place after backup |
| Agents | `main`, `consultant`, and `compliance` roles |
| Models | OpenRouter-first routing with curated primary/fallback policies |
| Memory | LanceDB Pro as the durable semantic memory layer |
| Slack | Required compliance Slack delivery; optional main Slack interaction |
| Cron | Scheduled compliance/self-audit jobs after setup safety checks |
| Safety | Managed-file diff, backup, and rollback boundaries |

## Memory without agent overhead

ProdClaw treats memory as infrastructure, not as another chore for the agent.

The agent should not have to manually decide what to remember, where to store it, how to search it, or how to inject it back into context. LanceDB Pro makes memory part of the system layer: auto-capture, hybrid retrieval, reranking, multi-scope isolation, long-context chunking, and recall happen behind the harness so the agent can focus on the task instead of managing its own notebook.

That is the product bet: memory continuity should improve reliability without bloating every prompt or forcing the agent to do extra memory work. LanceDB Pro is the memory engine behind that bet, with LoCoMo-style long-context memory benchmarking positioned around an 80% score.

## Cost-efficient by design

ProdClaw is production-ready without being wasteful. Routine work can run on efficient models, while high-judgment work escalates through the consultant architecture. Compliance jobs use curated model/fallback policies so you are not using the most expensive model for every task.

## Why this harness exists

Most agent setups optimize the wrong thing. They add more prompt, more tools, more providers, more autonomy, and then wonder why the system gets slower and less predictable.

ProdClaw takes the opposite position:

- the harness should be thin;
- the skills should be fat;
- model routing should be centralized;
- memory should be a real subsystem;
- recurring audits should be scheduled, not remembered;
- Slack should be a controlled delivery path, not an unbounded permission surface.

The default is intentionally opinionated because the value is reliability, memory continuity, compliance checks, safer upgrades, rollback, and cost-efficient model routing.

## Before / After

Without this harness, OpenClaw can grow by accident: provider plugins stay enabled, prompts accrete, cron jobs drift, memory becomes ambiguous, and every new feature adds more context weight.

With ProdClaw, the runtime has a job:

- `main` handles owner-facing orchestration.
- `consultant` handles high-judgment architecture and review.
- `compliance` audits the harness on a schedule.
- LanceDB Pro owns durable semantic memory.
- OpenRouter owns model routing.
- Compliance Slack owns production audit delivery.

The design goal is simple: keep the harness thin, keep skills fat, and keep recurring operational discipline outside the user's head.

## Install path

Primary path: existing OpenClaw users.

```text
inspect -> render -> validate -> diff -> apply
```

The current repository still exposes this through the setup scripts. The v1 roadmap will productize it into:

```text
prodclaw inspect
prodclaw configure
prodclaw render
prodclaw validate
prodclaw doctor
prodclaw diff
prodclaw apply
prodclaw enable-cron
prodclaw revert
```

From-scratch OpenClaw setup is intentionally deferred. See [docs/FROM_SCRATCH_DEFERRED.md](docs/FROM_SCRATCH_DEFERRED.md).

## User profile rendering

ProdClaw keeps the harness opinionated. Initial setup only personalizes identity basics: name, pronouns, and timezone. The operating style and rules remain part of the harness.

## Validation and secret scanning

ProdClaw separates local rendered validation from repository credential scanning.

Local rendered validation runs after `render` and before `diff` / `apply`:

```bash
node scripts/validate.mjs --rendered ./rendered
```

This validates staged local output. It confirms required files exist, JSON parses, policy checks pass, and placeholders are filled. It allows real credentials because `./rendered` is local-only and git-ignored. It must never print secret values.

Repository credential scanning is for CI and committed files:

```bash
npm run scan-secrets
```

This fails if real OpenRouter or Slack credentials are committed to the repo. It allows template placeholders and skips local ignored output such as `./rendered`.

## Agent-led setup

If an agent is doing the install, start with [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md). The agent must inspect first, render second, validate third, diff fourth, and apply only after explicit approval.

## Design documents

- [Reference Architecture](docs/REFERENCE_ARCHITECTURE.md)
- [Existing OpenClaw Migration](docs/EXISTING_OPENCLAW_MIGRATION.md)
- [What ProdClaw Touches](docs/WHAT_PRODCLAW_TOUCHES.md)
- [Security And Slack](docs/SECURITY_AND_SLACK.md)
- [Operations](docs/OPERATIONS.md)
- [From-Scratch Setup Deferred](docs/FROM_SCRATCH_DEFERRED.md)

## Safety boundary

ProdClaw does not replace the full OpenClaw home. It manages the harness layer only:

- OpenClaw config;
- workspace instructions;
- consultant workspace instructions;
- compliance workspace instructions;
- compliance prompts;
- ProdClaw-owned skills;
- model routing policy;
- plugin policy;
- ProdClaw-owned cron jobs.

ProdClaw does not modify or delete:

- sessions;
- conversations;
- memories;
- LanceDB data;
- markdown memory;
- logs;
- auth profiles;
- runtime databases;
- plugin installation directories;
- non-ProdClaw skills;
- non-ProdClaw cron jobs;
- user-created files outside managed paths.

Before applying changes, ProdClaw creates a backup and shows a diff. Nothing is applied until you explicitly approve it.
