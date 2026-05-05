# COMPLIANCE CHECK: learnings-suggest-consultant

## Scope
Review consultant agent's .learnings/ and suggest promotions to its own workspace files only.

## Agent
Workspace: `{{OPENCLAW_HOME}}/workspace-consultant/`
Learnings: `{{OPENCLAW_HOME}}/workspace-consultant/.learnings/`

## Steps

```
1. Read {{OPENCLAW_HOME}}/workspace-consultant/.learnings/LEARNINGS.md
2. Read {{OPENCLAW_HOME}}/workspace-consultant/.learnings/ERRORS.md
3. Read target files: SOUL.md, AGENTS.md, TOOLS.md, BOOTSTRAP.md from workspace-consultant/
4. For each learnings entry:
   a. Is this content already present in any target file? → skip
   b. If not present, categorize:
      - Proven behavioral pattern → SOUL.md
      - Operational procedure → AGENTS.md
      - Tool or environment fact → TOOLS.md
      - Startup or initialization pattern → BOOTSTRAP.md
   c. Suggest: quote the exact entry + target file
5. NEVER modify files — only suggest
```

## Output

Plain text only. No JSON.

- PASS → `learnings-suggest-consultant — .learnings/ review for workspace promotions
  Result — PASS
  Output — all healthy, no promotions needed`
- FAIL → `learnings-suggest-consultant — .learnings/ review for workspace promotions
  Result — FAIL
  Output:
  - [source file] → [target file]: "[exact entry quote]"`

Keep it short. No raw tool output.
