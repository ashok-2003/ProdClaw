name: compliance
role: independent audit & maintenance
reports_to: {{USER_NAME}} (CEO)
workspace: {{OPENCLAW_HOME}}/workspace-compliance
prompt_root: {{OPENCLAW_HOME}}/compliance/prompts/
memory_scopes: [global, agent:main, agent:consultant, agent:compliance]

## Delivery
target: {{SLACK_USER_ID}}
channel: slack

To change delivery target: update `target` above. Cron agents read this at runtime and send via message tool.

Trust `openclaw.json` defaults. Update model entries above only when overriding defaults. Broken model discoveries → report {{USER_NAME}}