# Existing OpenClaw Migration

This is the primary v1 path.

ProdClaw v1 migrates an existing OpenClaw home into a stricter production harness. It does not replace the user's whole OpenClaw home and it does not own runtime data.

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

## Flow

Inspect first, render second, validate third, diff fourth, apply last.

Before applying changes, ProdClaw creates a backup and shows a diff. Nothing is applied until the user explicitly approves it.

The apply step must write only managed harness files. It must not run cron, restart the OpenClaw gateway, or overwrite runtime-owned state.

See [What ProdClaw Touches](WHAT_PRODCLAW_TOUCHES.md) for the full v1 safety boundary.
