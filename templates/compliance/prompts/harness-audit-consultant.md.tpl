# COMPLIANCE CHECK: harness-audit-consultant

## Scope
Workspace quality audit for the consultant agent: contradiction detection + backup diff quality check.

## Agent workspace
`{{OPENCLAW_HOME}}/workspace-consultant/`

## Task 1 — Contradiction check

```
1. Read all of: SOUL.md, IDENTITY.md, AGENTS.md, TOOLS.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md
2. Extract behavioral rules, permissions, constraints, role definitions
3. Compare across files within this agent only:
   - Does one file say "do X" while another says "never do X"?
   - Role definitions conflicting between files?
   - Tool allowed in one file, denied in another?
4. For each contradiction: record exact quoted text from both files + which files
5. ONLY report real contradictions — never infer or fabricate
```

## Task 2 — Backup diff quality check

```
1. Find last backup: {{OPENCLAW_HOME}}/compliance/compliance-backup/agents/consultant/
   → Identify highest version number v<N>
2. Read current files from workspace-consultant/ and backup files from v<N>/
3. For each changed file, assess what was added/removed:
   HIGH SIGNAL: new behavioral rules, real incident lessons, operational procedures, proven patterns
   NOISE: reformatting, vague bullets, duplicated content, fluff with no actionable rule
4. Report: files changed, nature of changes (high-signal vs noise)
5. If no backup exists → report "no backup found, skipping diff"
```

## Output

Plain text only. No JSON.

- PASS → `harness-audit-consultant — contradiction + backup diff
  Result — PASS
  Output — no contradictions, [N] files changed since last backup: [signal assessment]`
- FAIL → `harness-audit-consultant — contradiction + backup diff
  Result — FAIL
  Contradictions:
  - [fileA] says "[quote]" vs [fileB] says "[quote]"
  Backup diff:
  - [file]: [noise/high-signal] — [description]`

Keep it short. No raw tool output.
