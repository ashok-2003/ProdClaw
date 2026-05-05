---
name: council
description: Spawns a council of 4 diverse AI models for multi-perspective analysis on complex/multi-domain questions. Triggers when Consultant receives a high-stakes or cross-domain problem. Returns synthesized recommendation with consensus, divergence, and confidence.
---

# Council Skill

**Derived from:** `claude-council` extension (v2026.4.0, installed at `~/.openclaw/extensions/claude-council/`). Original bash scripts incompatible with OpenRouter — execution layer rebuilt using `sessions_spawn`. Roles, presets, debate flow, and output format preserved from original.

## Trigger

Consultant receives a question that is:
- High-stakes with no clear right answer
- Multi-domain (spans 3+ concern areas)
- Architecture review or major design decision
- Tradeoff analysis with competing priorities
- Has genuine disagreement potential

If the question is simple, single-domain, or low-stakes → answer directly, skip council.

---

## Role Selection

Read `roles.json` for available roles and presets.

**Presets:**
- `balanced`: security + performance + maintainability
- `security-focused`: security + devil + compliance  
- `architecture`: scalability + maintainability + simplicity
- `review`: security + maintainability + dx

**Custom selection:** pick 3-4 roles based on question domains. Minimum 3 roles for a council.

**Model mapping** → source of truth is `roles.json` (`model_mapping` key).

**When to add Perplexity:** question involves current versions, recent CVEs, pricing changes, or anything time-sensitive.

---

## Execution Flow

### Round 1: Independent Analysis

1. Build role prompts by combining:
   - Role definition from roles.json
   - Full question context from caller
   - Any relevant file context
2. Spawn all selected roles in parallel via `sessions_spawn` (L3 subagents)
   - Each gets its role prompt + question
   - Apply per-model thinking level (see below)
   - Timeout: 120s per subagent
3. Collect all responses
4. If < 2 responses received → report council failure, return error to caller

**Thinking levels per model** → see `roles.json`. Always set at spawn time.

### Round 2: Debate (optional — enable via `debate: true` in request)

1. Compile all Round 1 responses into a summary
2. Re-spawn each role with:
   - Full Round 1 context
   - Instruction to read others' responses and provide rebuttals
3. Collect Round 2 rebuttals
4. Proceed to synthesis with full debate context

### Synthesis

Build structured markdown:

```
## Council Synthesis

### Role Perspectives
- **[Role]**: [1-2 sentence key point from that model]

### Consensus
- [Point 1]
- [Point 2]

### Divergence
- [Point]: [Model A view] vs [Model B view] — reason for disagreement

### Blind Spots
- [Risk or concern no model raised]

### Recommendation
[One clear recommendation]
Confidence: [high/medium/low]
Supported by: [which models support this]
```

### Return to Caller

- Send synthesis via `sessions_send` to `agent:main:main`
- Store key findings via `memory_store` with category `decision`
- End cleanly

---

## Failure Handling

- 1-2 models fail/timed out: proceed with available responses, note which failed in synthesis header
- < 2 models respond: report failure, suggest retry with reduced role set
- Single model timeout: retry once with 180s timeout before marking failed
- API errors: log error, proceed with available responses

---

## Output Format

Always return structured markdown with:
1. Role perspectives (1-2 sentences each)
2. Consensus points (bullet list)
3. Divergence points (with reasoning)
4. Blind spots (risks no model raised)
5. Recommendation with confidence level

Format for AI reader — concise, no decorative language.
