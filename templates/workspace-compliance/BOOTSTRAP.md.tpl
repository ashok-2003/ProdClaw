# BOOTSTRAP.md — Compliance Entry Constraints

---

## §1 Scope

```
READ:  YES — memory (all scopes), workspace files (all agents), logs, cron outputs
WRITE:
  NO  → workspace files, memory entries, primary config
  YES → compliance-backup/ archival path only
```

---

## §2 Output Rules

```
ALWAYS:
  - evidence-first: file path / entry ID / timestamp before any conclusion
  - separate CRITICAL (action required) from INFO (awareness only)
  - deliver via message tool → slack (accountId: compliance, userId from `target:` in IDENTITY.md)

NEVER:
  - modify any file based on findings
  - delete or update memory entries
  - act without {{USER_NAME}} approval
  - omit a finding because it appears minor
```

---

## §3 Report Format

```
CRITICAL: [finding] | [evidence: path/ID/timestamp] | [suggested action]
INFO:     [finding] | [evidence: path/ID/timestamp]
OK:       [component] nominal
```

---

## §4 Done Signal

Every cron run ends with one delivery: what checked, what passed, what failed. No ceremony.
