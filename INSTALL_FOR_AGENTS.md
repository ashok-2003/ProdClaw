# Install ProdClaw For Agents

You are installing an opinionated OpenClaw production harness for a user who already has OpenClaw.

This document is agent-facing. Human docs can explain outcomes; this runbook defines exact command order, safety boundaries, and failure handling.

## Agent install rules

Agents must follow this order:

1. `prodclaw inspect`
2. `prodclaw configure`
3. `prodclaw render`
4. `prodclaw validate`
5. `prodclaw doctor`
6. `prodclaw diff`
7. `prodclaw apply` only after explicit approval
8. `prodclaw enable-cron` only after compliance Slack delivery test passes

Agents must not run cron during setup.
Agents must not restart the OpenClaw gateway without explicit approval.
Agents must not print secrets.
Agents must not edit live OpenClaw home during inspect/render/diff.
Agents must preserve sessions, conversations, memories, LanceDB data, logs, auth profiles, runtime databases, non-ProdClaw skills, non-ProdClaw cron jobs, and user-created files outside managed paths.

## Required v1 rules

- v1 is existing OpenClaw migration only.
- Compliance Slack is required.
- Main Slack is optional.
- LanceDB Pro is required.
- OpenRouter is required.
- Backup before apply is mandatory.
- Full OpenClaw home restore is not in v1.
- `prodclaw revert` restores managed files only.
- Do not enable cron until `prodclaw doctor` passes.
- Do not assume config exists means runtime works.
- Do not trust Slack config until delivery test succeeds.
- Do not trust LanceDB Pro config until smoke test succeeds.

## Required inputs

Ask only for values that cannot be safely detected.

Required when missing:

- owner name;
- OpenRouter API key;
- compliance Slack app token;
- compliance Slack bot token;
- compliance Slack member ID.

Optional:

- main Slack app token and bot token, only if the user chooses main Slack interaction.

Do not ask by default for timezone, OpenClaw home, LanceDB path, individual model choices, cron implementation details, or advanced plugin config unless detection fails or the user explicitly overrides.

## Workflow details

### 1. Inspect

Run:

```bash
prodclaw inspect
```

Inspect must detect the OpenClaw home, timezone, OpenClaw version where possible, OpenRouter config, Slack config/accounts, LanceDB Pro state, cron jobs, custom skills, and gateway status where possible.

Inspect must not write to the live OpenClaw home.

### 2. Configure

Run:

```bash
prodclaw configure
```

Configure should ask only for missing required values. It may persist staged/local ProdClaw config, but it must not apply the production harness to the live OpenClaw home.

### 3. Render

Run:

```bash
prodclaw render
```

Render generates staged managed files only. Render must not edit the live OpenClaw home.

### 4. Validate

Run:

```bash
prodclaw validate
```

Validate checks staged files and policy. It must not run external smoke tests. It must not print secrets.

### 5. Doctor

Run:

```bash
prodclaw doctor
```

Doctor runs runtime/smoke checks for OpenClaw, OpenRouter, LanceDB Pro, compliance Slack, cron safety, and backup safety.

Doctor must report failures clearly using READY/WARN/BROKEN-style output.

### 6. Diff

Run:

```bash
prodclaw diff
```

Diff shows exact managed-file changes before apply. It must not edit the live OpenClaw home.

### 7. Apply

Run only after explicit approval:

```bash
prodclaw apply
```

Apply must create a backup first, then write only ProdClaw-managed harness files. Apply must not run cron and must not restart the gateway automatically.

### 8. Enable cron

Run only after doctor passes and compliance Slack delivery is verified:

```bash
prodclaw enable-cron
```

Enable cron must enable only ProdClaw-owned cron jobs and preserve non-ProdClaw cron jobs unchanged.

## What ProdClaw changes

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

## What ProdClaw preserves

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

## Failure handling

If compliance Slack delivery fails, stop and do not enable cron.

If LanceDB Pro smoke test fails, stop and do not apply a partial production harness.

If OpenRouter model smoke check fails, report the error clearly and do not hide billing/model failures.

If gateway restart is required, ask for explicit approval and provide restart instructions instead of restarting automatically.

If validation fails, report the file and policy that failed without printing raw secrets.

If apply would touch a non-managed file, stop and report the unexpected path.

## Apply confirmation boundary

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

## Legacy script fallback

Until the `prodclaw` command surface is fully implemented, scripts may expose equivalent behavior behind `node scripts/setup.mjs ...`. Agents should still follow the v1 order and safety rules above, and should prefer the `prodclaw` commands once available.

## Known gap

Slack owner-mediated relay for third-party channel mentions is not implemented in v1. Keep the current practical Slack behavior and document this as future runtime hardening, not a prompt-only fix.
