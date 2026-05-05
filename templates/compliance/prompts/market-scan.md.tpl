# COMPLIANCE CHECK: market-scan

## Scope
Check OpenRouter for new model alternatives at comparable costs.

## Steps

```
1. Read {{OPENCLAW_HOME}}/openclaw.json
   → Extract current models per agent

2. memory_recall(query="market-scan model alternative", scope=global, limit=10)
   → Note any models already flagged in previous runs — skip these in output

3. web_search: OpenRouter models added or updated in the last 30 days
   → Only consider models with verified pricing and specs

4. Compare against current stack: cost, context window, capabilities
   → Only report models that are genuinely better on at least one dimension
   → Never guess or fabricate specs — must be verified from web_fetch if needed

5. For each new finding:
   memory_store(category="fact", importance=0.6,
     body="market-scan [date]: flagged [model] as alternative to [current model] — [reason]")
   → Enables deduplication in future runs
```

## Output

Plain text only. No JSON.

- NO_CHANGE → `market-scan — OpenRouter model alternatives
  Result — NO_CHANGE
  Output — no new alternatives found in last 30 days`
- OPPORTUNITY → `market-scan — OpenRouter model alternatives
  Result — OPPORTUNITY
  Output:
  - [model] ([provider]): [why relevant] — cost [N]/M vs current [N]/M`

Keep it short. No raw tool output.
