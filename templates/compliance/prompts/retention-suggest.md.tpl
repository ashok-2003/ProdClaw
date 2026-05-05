# COMPLIANCE CHECK: retention-suggest

## Scope
Identify memory entries that auto-decay will NOT remove but should be reviewed.

## Key constraint
LanceDB auto-decay handles low-importance entries over time. Do NOT flag by importance/age alone —
decay already covers that. Focus only on what decay misses.

## Steps

```
For each scope in [global, agent:main, agent:consultant, agent:compliance]:

  1. memory_recall(query="test debug placeholder TODO", scope=<scope>, limit=20)
     → Flag entries where body contains "test", "debug", "placeholder", "TODO"
       AND importance >= 0.7 (these survive decay and shouldn't)

  2. memory_recall(query="*", scope=<scope>, limit=50)
     → Scan for near-duplicate bodies: entries with nearly identical content
       under different IDs in the same scope (decay won't remove either)

  3. For any entry referencing a specific model, tool, or endpoint:
     → Cross-check against {{OPENCLAW_HOME}}/openclaw.json current stack
     → If the referenced model/tool no longer exists → flag as semantically obsolete
       (high importance keeps it alive despite being stale)
```

## Flag categories (what decay misses)

- **duplicate**: near-identical body to another entry in same scope
- **test/debug with high importance**: body contains test/debug keywords AND importance ≥ 0.7
- **semantically obsolete**: references a model/tool/endpoint no longer in current stack

## Output

Plain text only. No JSON. NEVER delete — only report candidates.

- PASS → `retention-suggest — memory pruning candidates
  Result — PASS
  Output — all healthy, no pruning candidates found`
- FAIL → `retention-suggest — memory pruning candidates
  Result — FAIL
  Output:
  - [id] ([scope]): [category] — [reason] — "[body preview]"`

Keep it short. No raw tool output.
