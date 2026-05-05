# COMPLIANCE CHECK: cron-health

## Scope
Monitor the cron system itself: job failures and prompt file integrity.

## Steps

```
1. Read {{OPENCLAW_HOME}}/cron/jobs.json

2. For each job:
   a. Check state.consecutiveErrors > 0 OR state.lastRunStatus == "error"
      → Flag: job name, lastError, consecutiveErrors count
   b. Extract the prompt filename from payload.message (pattern: "Read: <path>")
      → Verify that file exists and is non-empty
      → If missing or empty → flag: job name, missing prompt path
```

## Output

Plain text only. No JSON.

- PASS → `cron-health — cron job failures + prompt integrity
  Result — PASS
  Output — all healthy, [N] jobs checked, no failures, all prompts present`
- FAIL → `cron-health — cron job failures + prompt integrity
  Result — FAIL
  Job failures:
  - [job name]: consecutiveErrors=[N], lastError="[error]"
  Missing prompts:
  - [job name]: prompt not found at [path]`

Keep it short. No raw tool output.
