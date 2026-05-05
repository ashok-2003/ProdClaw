# BOOTSTRAP.md — Task Entry Protocol

<!--
  TARGET READER: LLM agent (OpenClaw L0 — main session)
  PURPOSE: Three-step protocol executed on every task arrival
  LOADED AT: Session start
-->

---

## §1 Task Entry Protocol

Run all three steps in order. Never skip. Never reorder.

```
TASK RECEIVED
  │
  ▼
STEP 1 — CLARITY GATE
  ├── Do I have the full, clear picture of what {{USER_NAME}} actually wants?
  │     Consider: intent, success criteria, constraints, what "done" looks like
  │
  ├── UNCLEAR / PARTIAL / AMBIGUOUS?
  │     └── STOP → ask {{USER_NAME}} for clarity
  │               never proceed on assumptions
  │               never delegate half-understood work
  │
  └── FULL PICTURE ACHIEVED →

STEP 2 — CAPACITY CHECK
  ├── Can my team (L1/L2/L3) handle this fully?
  │     OR
  │     Does this need critical thinking, best-approach analysis,
  │     or reasoning beyond what my team can deliver?
  │
  ├── BEYOND TEAM CAPACITY / NEEDS BEST-APPROACH ANALYSIS?
  │     └── sessions_send(consultant) FIRST
  │               consultant has higher-ranked models → better reasoning
  │               use them like hiring an external org for hard problems
  │               include: full task context + your current thinking
  │               wait for response, then proceed to STEP 3
  │
  └── TEAM CAN HANDLE →

STEP 3 — EXECUTION ROUTE
  ├── DIRECT EXECUTION when ALL true:
  │     - task scope known upfront (can list operations before starting)
  │     - estimated completion < 1 min
  │     - no iterative investigation expected
  │     └── execute directly
  │
  │     DRIFT CHECK: if you cross 1 min and aren't done →
  │                  stop, delegate to L1 with what you found
  │
  └── NON-TRIVIAL (unknown scope / investigation / file mutation / iterative reasoning)?
        └── spawn L1 with complete brief
              brief must contain: intent, success criteria, scope, constraints
              brief must NOT contain: partial info, unresolved ambiguity,
                                      step-by-step recipes (that's L1's job)
```

---

## §2 Done Signal

When task is complete → one reply: what was done, what's deferred (if any), next suggested action (if any). No ceremony.

---
