# Install ProdClaw For Agents

You are installing an opinionated OpenClaw harness for a user who already has OpenClaw.

## Non-Negotiable Rules

- Do not run cron jobs during setup.
- Do not restart the gateway unless the user explicitly approves.
- Do not print secrets.
- Do not edit the live OpenClaw home during inspect/render/diff.
- Apply only after backup and explicit approval.
- Preserve sessions, conversations, memories, LanceDB data, logs, auth profiles, runtime databases, non-ProdClaw skills, non-ProdClaw cron jobs, and user-created files outside managed paths.
- Prefer OpenClaw CLI commands for runtime configuration where practical.

## Required Inputs

- `OPENCLAW_HOME`, default `~/.openclaw`
- owner name
- OpenRouter API key
- Slack default bot token and app token
- Slack compliance bot token and app token
- Slack owner user ID
- timezone
- owner user home, default parent directory of `OPENCLAW_HOME`

## Workflow

1. Inspect:
   ```bash
   node scripts/setup.mjs inspect --home ~/.openclaw
   ```
2. Render to a staging directory:
   ```bash
   node scripts/setup.mjs render --home ~/.openclaw --out ./rendered [inputs...]
   ```
3. Validate:
   ```bash
   node scripts/validate.mjs --rendered ./rendered
   ```
4. Diff:
   ```bash
   node scripts/setup.mjs diff --home ~/.openclaw --rendered ./rendered
   ```
5. Ask the user for explicit approval.
6. Apply:
   ```bash
   node scripts/setup.mjs apply --home ~/.openclaw --rendered ./rendered --yes
   ```

## What ProdClaw Changes

ProdClaw manages the harness layer only:

- OpenClaw config;
- workspace instructions;
- consultant workspace instructions;
- compliance workspace instructions;
- compliance prompts;
- ProdClaw-owned skills;
- model routing policy;
- plugin policy;
- ProdClaw-owned cron jobs.

## What ProdClaw Preserves

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

## What This Installs

- Three agents: `main`, `consultant`, `compliance`
- LanceDB Pro memory slot
- OpenRouter model routing
- Compliance Slack delivery
- Optional main Slack interaction
- Compliance cron definitions
- Workspace instructions and skills

## Apply Confirmation Boundary

Before final approval, show the user the managed-file boundary:

```text
ProdClaw is ready to apply.

Detected:
- OpenClaw home: <path>
- Timezone: <timezone>
- Compliance Slack: verified
- LanceDB Pro: installed and enabled
- OpenRouter: configured
- Backup: will be created before changes

ProdClaw will modify:
- openclaw.json
- workspace instruction files
- compliance prompts
- ProdClaw-owned skills
- cron/jobs.json entries owned by ProdClaw

ProdClaw will preserve:
- sessions
- memories
- LanceDB data
- logs
- auth profiles
- runtime databases
- non-ProdClaw skills
- non-ProdClaw cron jobs

Type APPLY to continue.
```

## Known Gap

Slack owner-mediated relay for third-party channel mentions is not implemented in v1. Keep the current practical Slack behavior and document this as future runtime hardening, not a prompt-only fix.
