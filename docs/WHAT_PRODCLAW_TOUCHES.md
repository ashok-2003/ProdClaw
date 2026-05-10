# What ProdClaw Touches

ProdClaw v1 is an existing OpenClaw migration harness. It does not replace the user's whole OpenClaw home. It manages only the production harness layer that ProdClaw owns.

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

These files are staged, validated, and shown in a diff before apply.

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

This boundary is a v1 trust promise. ProdClaw should not imply that it owns the full OpenClaw home.

## Apply boundary

Before applying changes, ProdClaw creates a backup and shows a diff. Nothing is applied until the user explicitly approves it.

The apply step should only write managed harness files. It must not run cron, restart the OpenClaw gateway, delete runtime data, or overwrite user-owned runtime state.

## Apply confirmation wording

Before final confirmation, CLI output should use this boundary wording:

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

## Revert boundary

`prodclaw revert` is managed-file rollback only in v1. It should restore ProdClaw-managed harness files from backup. It should not roll back conversations, sessions, memories, LanceDB data, logs, auth profiles, runtime databases, non-ProdClaw skills, non-ProdClaw cron jobs, or user-created files.

Full OpenClaw home restore is intentionally not part of v1.
