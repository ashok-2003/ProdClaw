# Existing OpenClaw Migration

This is the primary v1 path.

## What Is Preserved

- LanceDB data
- markdown memory
- sessions
- logs
- auth profiles
- plugin installation directories
- runtime databases

## What Is Managed

- `openclaw.json`
- workspace instruction files
- compliance prompts
- skills
- `cron/jobs.json`

## Flow

Inspect first, render second, validate third, diff fourth, apply last. Apply creates a timestamped backup beside the target OpenClaw home before writing managed files.
