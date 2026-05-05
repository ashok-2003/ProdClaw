{
  "version": 1,
  "jobs": [
    {
      "id": "61df150d-621f-4ced-842d-1ef04f31d50b",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-subagent-audit",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 9 * * 1-5",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 240000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/subagent-audit.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. Plain text output only — no JSON. Follow the Output section in the prompt file.\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "sessions_list",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      },
      "description": "Daily subagent session audit: flag high-token, high-cost, or long-running sessions"
    },
    {
      "id": "6f05e8d3-f9ba-4f69-ba32-afdbbc5d27c1",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-model-audit",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 9 * * 1-5",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 300000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/model-audit.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. Plain text output only — no JSON. Follow the Output section in the prompt file.\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 420,
        "toolsAllow": [
          "exec",
          "read",
          "sessions_list",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      },
      "description": "Daily model audit: verify subagent actual model matches configured primary for each agent"
    },
    {
      "id": "38bca093-0f37-4cad-9b6f-348c8a550435",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-retention-suggest",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1,4",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 60000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/retention-suggest.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. NEVER delete anything. Every claim needs data source. Plain text output only — no JSON. Follow the Output section in the prompt file.\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "memory_recall",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      },
      "description": "Twice-weekly retention pruning suggestions: identify duplicates, stale, low-signal memory entries"
    },
    {
      "id": "faee7a86-c6f3-45b4-a005-730288cd2665",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-backup",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1,4",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 180000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/backup.md\nExecute all steps described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. Plain text output only — no JSON. Follow the Output section in the prompt file.\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 420,
        "toolsAllow": [
          "exec",
          "read",
          "write",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      },
      "description": "Twice-weekly backup: snapshot all agent injected files with 5-version retention"
    },
    {
      "id": "36656a2a-7165-4470-b484-a2042a1bdabf",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-market-scan",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 8 * * 0",
        "tz": "{{TIMEZONE}}"
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/market-scan.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Only report models with verified evidence. Plain text output only — no JSON. Follow the Output section in the prompt file.\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "web_search",
          "web_fetch",
          "memory_recall",
          "memory_store",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      },
      "description": "Weekly OpenRouter market scan: find new models at comparable cost to our current stack"
    },
    {
      "id": "0b986924-d549-4685-a2d6-8dcdaf4470a0",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-memory-health",
      "description": "Daily: LanceDB stored warnings + reflection fallback detection across all agents",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 9 * * 1-5",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 60000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/memory-health.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"memory-health: everything healthy\" or \"memory-health: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 420,
        "toolsAllow": [
          "memory_recall",
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "78ebb703-12d0-4344-9175-8688e2d5077f",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-cron-health",
      "description": "Daily: cron job failure detection + prompt file integrity check",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 9 * * 1-5",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 120000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/cron-health.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"cron-health: everything healthy\" or \"cron-health: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 120,
        "toolsAllow": [
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "fe204312-14a1-4cc9-92f1-c1eaa3831cef",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-disk-check",
      "description": "Daily: disk usage, LanceDB size, backup directory size",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 9 * * 1-5",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 180000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/disk-check.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"disk-check: everything healthy\" or \"disk-check: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 120,
        "toolsAllow": [
          "exec",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "5ff878b0-f5a9-45c2-a92f-c58637c78f29",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-harness-audit-main",
      "description": "Weekly Monday: contradiction check + backup diff quality for main agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 120000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/harness-audit-main.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"harness-audit-main: everything healthy\" or \"harness-audit-main: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "a47f1823-a6bf-4eb6-9deb-6e461b6aa5e6",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-harness-audit-consultant",
      "description": "Weekly Monday: contradiction check + backup diff quality for consultant agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 240000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/harness-audit-consultant.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"harness-audit-consultant: everything healthy\" or \"harness-audit-consultant: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "8f5a97a2-262c-4ad3-a549-d3f3e5a8160d",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-harness-audit-compliance",
      "description": "Weekly Monday: contradiction check + backup diff quality for compliance agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 360000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/harness-audit-compliance.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"harness-audit-compliance: everything healthy\" or \"harness-audit-compliance: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "e3df02f2-7152-481a-98a0-c3142a95c0da",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-learnings-suggest-main",
      "description": "Weekly Monday: .learnings/ promotion suggestions for main agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 480000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/learnings-suggest-main.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"learnings-suggest-main: everything healthy\" or \"learnings-suggest-main: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "49fdfd9e-4ef3-4c47-bd10-20d7f65be4e1",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-learnings-suggest-consultant",
      "description": "Weekly Monday: .learnings/ promotion suggestions for consultant agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 600000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/learnings-suggest-consultant.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"learnings-suggest-consultant: everything healthy\" or \"learnings-suggest-consultant: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    },
    {
      "id": "c9b405ba-bed0-4a4e-b076-9f7651d4c8c9",
      "agentId": "compliance",
      "sessionKey": "agent:main:main",
      "name": "compliance-learnings-suggest-compliance",
      "description": "Weekly Monday: .learnings/ promotion suggestions for compliance agent",
      "enabled": true,
      "schedule": {
        "kind": "cron",
        "expr": "0 10 * * 1",
        "tz": "{{TIMEZONE}}",
        "staggerMs": 720000
      },
      "sessionTarget": "isolated",
      "wakeMode": "now",
      "payload": {
        "kind": "agentTurn",
        "message": "Read: {{OPENCLAW_HOME}}/compliance/prompts/learnings-suggest-compliance.md\nExecute all checks described there.\n\nRULES: NEVER infer, NEVER assume, NEVER fill gaps. Every claim needs data source. ONE LINE summary for {{USER_NAME}} at end: \"learnings-suggest-compliance: everything healthy\" or \"learnings-suggest-compliance: [issue summary]\"\n\nDELIVERY: After all checks are complete, read {{OPENCLAW_HOME}}/workspace-compliance/IDENTITY.md, extract the `target:` field value (line format: `target: <userId>`). Send your complete formatted output via message tool: channel=slack, accountId=compliance, userId=[extracted value].",
        "model": "openrouter/xiaomi/mimo-v2.5-pro",
        "timeoutSeconds": 900,
        "toolsAllow": [
          "exec",
          "read",
          "message"
        ],
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/z-ai/glm-5.1"
        ]
      },
      "delivery": {
        "mode": "announce",
        "channel": "slack",
        "to": "{{SLACK_USER_ID}}",
        "accountId": "compliance",
        "bestEffort": true
      }
    }
  ]
}
