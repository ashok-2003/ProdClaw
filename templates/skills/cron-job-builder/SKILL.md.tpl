---
name: cron-job-builder
description: >
  Create, edit, or manage OpenClaw cron jobs for the compliance agent or any scheduled task.
  Triggers on: "create cron job", "schedule a check", "add cron", "new cron job",
  "set up scheduled task", "compliance cron", "cron job for compliance",
  "automated check", "recurring check", "cron schedule", "cron edit",
  "cron update", "cron register". Covers prompt file creation, CLI registration,
  verification, and the established compliance pattern.
---

# Cron Job Builder Skill

## When to Use

- Creating new cron jobs for compliance agent or any scheduled task
- Editing or updating existing cron job configurations
- Registering scheduled checks, reports, or automated workflows

## What User Must Specify

| Param | Required | Example |
|-------|----------|---------|
| Job name | ✅ | `daily-infra-audit` |
| Schedule | ✅ | `0 9 * * *` or `every day 9am` |
| Task description | ✅ | "Check SSL cert expiry for all domains" |
| Model preference | ❌ | defaults to `qwen3.6-plus` |
| Tools needed | ❌ | defaults to `read,exec,web_search,web_fetch` |

## What Agent Does (3 steps, in order)

1. **Create prompt file** → `{{OPENCLAW_HOME}}/compliance/prompts/<job-name>.md`
2. **Register cron** → `openclaw cron add` with defaults below
3. **Verify** → `openclaw cron list` confirms job appears

## Default Conventions

```yaml
models:
  general: "openrouter/qwen/qwen3.6-plus"
  judgment_analysis: "openrouter/z-ai/glm-5.1"
  web_research: "openrouter/google/gemini-3.1-pro"

fallback_chain: "openrouter/z-ai/glm-5.1,openrouter/xiaomi/mimo-v2-pro"

timeouts:
  simple_check: 420   # 7 min
  analysis: 900        # 15 min

delivery:
  announce: true
  bestEffort: true

session: isolated
timezone: {{TIMEZONE}}
stagger_range: 60-300  # seconds, spread jobs at same time
```

## Prompt File Format

Path: `{{OPENCLAW_HOME}}/compliance/prompts/<job-name>.md`

```markdown
# COMPLIANCE CHECK: <Human-Readable Name>

## Scope
- What systems/services this check covers
- Time window or data range
- Any exclusions

## Steps
1. [Specific action with tool/method]
2. [Next action]
3. [Continue…]

## Output

Plain text only. No JSON.

- PASS → `[job-name] — [what it checks]
  Result — PASS
  Output — all healthy, [key metrics]`
- FAIL → `[job-name] — [what it checks]
  Result — FAIL
  Output:
  - [issue with proof]`

Keep it short. No raw tool output.
```

## Registration Command

```bash
openclaw cron add \
  --name "<name>" \
  --agent compliance \
  --session isolated \
  --cron "<expr>" \
  --announce \
  --tz {{TIMEZONE}} \
  --stagger <seconds> \
  --model "openrouter/xiaomi/mimo-v2.5-pro" \
  --message "Read: {{OPENCLAW_HOME}}/compliance/prompts/<job-name>.md
Execute all checks described there.

RULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. Plain text output only — no JSON. Follow the Output section in the prompt file." \
  --timeoutSeconds <N> \
  --fallbacks "openrouter/moonshotai/kimi-k2.6,openrouter/z-ai/glm-5.1" \
  --toolsAllow "<tools>" \
  --description "<one-liner>"
```

### Parameter Guide

| Param | Value | Notes |
|-------|-------|-------|
| `--name` | kebab-case job ID | Must be unique |
| `--agent` | `compliance` | Target agent |
| `--session` | `isolated` | Fresh session each run |
| `--cron` | cron expression | 5-field standard |
| `--announce` | (flag) | Deliver results to channel |
| `--tz` | `{{TIMEZONE}}` | IST unless user specifies |
| `--stagger` | 60–300 | Add offset if other jobs at same time |
| `--model` | see models above | Pick by task type |
| `--timeoutSeconds` | 420 or 900 | Simple vs analysis |
| `--fallbacks` | fixed chain | `glm-5.1 → mimo-v2-pro` |
| `--toolsAllow` | comma-separated | `read,exec,web_search,web_fetch` typical |
| `--description` | one-liner | Human-readable summary |

## Decision: Model Selection

```
Task type? ─┬─ Data retrieval / simple check → qwen3.6-plus
             ├─ Judgment / comparison / analysis → glm-5.1
             ├─ Web research / external lookup → gemini-3.1-pro
             └─ Unsure → qwen3.6-plus (general default)
```

## Decision: Timeout Selection

```
Task complexity? ─┬─ Single lookup, simple check → 420s (7min)
                   ├─ Multi-step analysis, cross-referencing → 900s (15min)
                   └─ Unsure → 420s (safe default)
```

## Decision: Tools Selection

```
Task needs? ─┬─ File reads only → read
              ├─ System commands → read,exec
              ├─ Web lookups → read,exec,web_search,web_fetch
              └─ Unsure → read,exec,web_search,web_fetch (full set)
```

## Decision: Stagger Calculation

```
Other jobs at same cron time?
  ├─ YES → check openclaw cron list → find max stagger → add 60s offset
  └─ NO → 60s (minimum stagger)
```

## Edge Cases

- **Existing job with same name** → ask user before modifying; show current config
- **Prompt file already exists** → ask before overwriting; show diff
- **Don't delete existing jobs** → ask user first, never auto-delete
- **Don't change other agents' configs** → only touch compliance agent cron entries
- **Schedule conflicts** → auto-calculate stagger offset from existing jobs at same time
- **User wants to test** → suggest `openclaw cron run <name>` for ad-hoc execution
- **User wants to disable (not delete)** → `openclaw cron disable <name>`

## Verification Checklist

After registration, confirm:

```bash
# Job appears in list
openclaw cron list | grep "<name>"

# Prompt file exists and is non-empty
test -s {{OPENCLAW_HOME}}/compliance/prompts/<job-name>.md && echo "OK"
```

Report back:
- Job name + schedule + model
- Prompt file path
- Verification pass/fail

## Quick Reference: Cron Expressions

```
┌───────────── minute (0–59)
│ ┌───────────── hour (0–23)
│ │ ┌───────────── day of month (1–31)
│ │ │ ┌───────────── month (1–12)
│ │ │ │ ┌───────────── day of week (0–6, Sun=0)
│ │ │ │ │
* * * * *

Examples:
  0 9 * * *        → daily 9:00 AM
  */30 * * * *     → every 30 minutes
  0 9,21 * * *     → 9 AM and 9 PM daily
  0 9 * * 1-5      → weekdays 9 AM
  0 0 1 * *        → monthly on 1st at midnight
```

## Common Workflows

### Create New Job

1. Ask user for: name, schedule, task description (model/tools optional)
2. Check `openclaw cron list` for conflicts → calculate stagger
3. Write prompt file
4. Run `openclaw cron add`
5. Verify + report

### Edit Existing Job

1. Show current config from `openclaw cron list`
2. Ask what to change
3. If prompt file needs update → edit it
4. Delete old job → re-register with new params (or use update if supported)
5. Verify + report

### Test a Job

1. Confirm prompt file is correct
2. Run `openclaw cron run <name>`
3. Check output for expected format/completeness

### List All Jobs

```bash
openclaw cron list
```
