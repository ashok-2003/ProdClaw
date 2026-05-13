{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "{{GATEWAY_AUTH_TOKEN}}"
    },
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    },
    "controlUi": {
      "allowInsecureAuth": true,
      "dangerouslyDisableDeviceAuth": true
    },
    "nodes": {
      "denyCommands": [
        "camera.snap",
        "camera.clip",
        "screen.record",
        "contacts.add",
        "calendar.add",
        "reminders.add",
        "sms.send",
        "sms.search"
      ]
    }
  },
  "agents": {
    "defaults": {
      "workspace": "{{OPENCLAW_HOME}}/workspace",
      "thinkingDefault": "high",
      "model": {
        "primary": "openrouter/minimax/minimax-m2.7",
        "fallbacks": [
          "openrouter/moonshotai/kimi-k2.6",
          "openrouter/xiaomi/mimo-v2.5-pro"
        ]
      },
      "subagents": {
        "maxSpawnDepth": 3,
        "maxConcurrent": 18,
        "runTimeoutSeconds": 3600
      },
      "models": {
        "openrouter/z-ai/glm-5.1": {
          "alias": "glm5.1",
          "params": {
            "provider": {
              "order": [
                "siliconflow/fp8",
                "z-ai"
              ]
            }
          }
        },
        "openrouter/minimax/minimax-m2.7": {
          "alias": "m2.7",
          "params": {
            "provider": {
              "order": [
                "minimax/fp8",
                "together/fp4"
              ]
            }
          }
        },
        "openrouter/xiaomi/mimo-v2.5-pro": {
          "alias": "mimo"
        },
        "openrouter/qwen/qwen3.6-plus": {
          "alias": "qwen"
        },
        "openrouter/google/gemini-3.1-pro-preview": {
          "alias": "gemini",
          "params": {
            "provider": {
              "order": [
                "google-ai-studio",
                "google-vertex"
              ]
            }
          }
        },
        "openrouter/x-ai/grok-4.20": {
          "alias": "grok4.20"
        },
        "openrouter/anthropic/claude-opus-4.7": {
          "alias": "opus4.7"
        },
        "openrouter/openai/gpt-5.4": {
          "alias": "gpt5.4p",
          "params": {
            "provider": {
              "order": [
                "openai",
                "azure"
              ]
            }
          }
        },
        "openrouter/perplexity/sonar-reasoning-pro": {
          "alias": "sonar"
        },
        "openrouter/deepseek/deepseek-r1-0528": {
          "alias": "r1",
          "params": {
            "provider": {
              "order": [
                "deepinfra/fp4"
              ]
            }
          }
        },
        "openrouter/deepseek/deepseek-v3.2": {
          "alias": "v3.2",
          "params": {
            "provider": {
              "order": [
                "siliconflow/fp8"
              ]
            }
          }
        },
        "openrouter/anthropic/claude-opus-4.6": {
          "alias": "opus4.6",
          "params": {
            "provider": {
              "order": [
                "anthropic/2",
                "anthropic",
                "amazon-bedrock"
              ]
            }
          }
        },
        "openrouter/anthropic/claude-sonnet-4.6": {
          "alias": "sonnet4.6",
          "params": {
            "provider": {
              "order": [
                "anthropic",
                "amazon-bedrock"
              ]
            }
          }
        },
        "openrouter/moonshotai/kimi-k2.6": {
          "alias": "kimi2.6",
          "params": {
            "provider": {
              "order": [
                "moonshotai/int4",
                "together",
                "novita"
              ]
            }
          }
        }
      },
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "60m"
      },
      "heartbeat": {
        "every": "0m"
      },
      "compaction": {
        "mode": "safeguard"
      }
    },
    "list": [
      {
        "id": "main",
        "model": {
          "primary": "openrouter/moonshotai/kimi-k2.6",
          "fallbacks": [
            "openrouter/z-ai/glm-5.1",
            "openrouter/xiaomi/mimo-v2.5-pro"
          ]
        },
        "thinkingDefault": "high",
        "tools": {
          "profile": "coding",
          "alsoAllow": [
            "message",
            "agents_list",
            "memory_recall",
            "memory_store",
            "memory_forget",
            "memory_update",
            "memory_search",
            "memory_get"
          ],
          "deny": [
            "self_improvement_log",
            "memory_compact"
          ]
        }
      },
      {
        "id": "consultant",
        "workspace": "{{OPENCLAW_HOME}}/workspace-consultant",
        "model": {
          "primary": "openrouter/google/gemini-3.1-pro-preview",
          "fallbacks": [
            "openrouter/x-ai/grok-4.20",
            "openrouter/anthropic/claude-opus-4.7",
            "openrouter/openai/gpt-5.4",
            "openrouter/perplexity/sonar-reasoning-pro"
          ]
        },
        "thinkingDefault": "high",
        "tools": {
          "profile": "full",
          "deny": [
            "cron",
            "gateway"
          ]
        }
      },
      {
        "id": "compliance",
        "workspace": "{{OPENCLAW_HOME}}/workspace-compliance",
        "model": {
          "primary": "openrouter/xiaomi/mimo-v2.5-pro",
          "fallbacks": [
            "openrouter/moonshotai/kimi-k2.6",
            "openrouter/z-ai/glm-5.1"
          ]
        },
        "thinkingDefault": "high",
        "tools": {
          "profile": "full",
          "deny": [
            "cron",
            "gateway"
          ]
        }
      }
    ]
  },
  "session": {
    "dmScope": "main",
    "reset": {
      "idleMinutes": 1440
    },
    "agentToAgent": {
      "maxPingPongTurns": 2
    },
    "maintenance": {
      "mode": "enforce",
      "pruneAfter": "2d",
      "maxEntries": 24
    }
  },
  "tools": {
    "profile": "coding",
    "sessions_spawn": {
      "attachments": {
        "enabled": true
      }
    },
    "subagents": {
      "tools": {
        "deny": [
          "gateway"
        ]
      }
    },
    "exec": {
      "security": "full"
    },
    "agentToAgent": {
      "enabled": true,
      "allow": [
        "main",
        "consultant",
        "compliance"
      ]
    },
    "sessions": {
      "visibility": "all"
    },
    "loopDetection": {
      "enabled": true,
      "detectors": {
        "pingPong": true,
        "genericRepeat": true,
        "knownPollNoProgress": true
      }
    }
  },
  "auth": {
    "profiles": {
      "openrouter:default": {
        "provider": "openrouter",
        "mode": "api_key"
      }
    }
  },
  "channels": {
    "telegram": {
      "enabled": false
    },
    "slack": {
      "enabled": true,
      "mode": "socket",
      "accounts": {
        "compliance": {
          "enabled": true,
          "mode": "socket",
          "appToken": "{{SLACK_COMPLIANCE_APP_TOKEN}}",
          "botToken": "{{SLACK_COMPLIANCE_BOT_TOKEN}}",
          "groupPolicy": "disabled",
          "userTokenReadOnly": true,
          "nativeStreaming": true,
          "streaming": "partial"
        }
      }
    }
  },
  "bindings": [
    {
      "match": {
        "channel": "slack",
        "accountId": "compliance"
      },
      "agentId": "compliance"
    }
  ],
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": {
          "enabled": true
        }
      }
    }
  },
  "wizard": {
    "lastRunAt": "2026-04-21T10:59:32.453Z",
    "lastRunVersion": "2026.4.2",
    "lastRunCommand": "configure",
    "lastRunMode": "local"
  },
  "plugins": {
    "entries": {
      "minimax": {
        "enabled": false
      },
      "memory-lancedb-pro": {
        "enabled": true,
        "config": {
          "embedding": {
            "apiKey": "{{OPENROUTER_API_KEY}}",
            "model": "qwen/qwen3-embedding-8b",
            "baseURL": "https://openrouter.ai/api/v1",
            "dimensions": 1024
          },
          "autoCapture": true,
          "autoRecall": true,
          "captureAssistant": false,
          "retrieval": {
            "mode": "hybrid",
            "candidatePoolSize": 20,
            "minScore": 0.6,
            "hardMinScore": 0.62,
            "rerank": "cross-encoder",
            "rerankProvider": "jina",
            "rerankModel": "rerank-4-fast",
            "rerankEndpoint": "https://openrouter.ai/api/v1/rerank",
            "rerankApiKey": "{{OPENROUTER_API_KEY}}",
            "filterNoise": true
          },
          "sessionStrategy": "memoryReflection",
          "autoRecallMinLength": 8,
          "mdMirror": {
            "enabled": true,
            "dir": "memory-md"
          },
          "memoryReflection": {
            "timeoutMs": 60000,
            "thinkLevel": "high"
          },
          "enableManagementTools": false,
          "scopes": {
            "agentAccess": {
              "consultant": [
                "global",
                "agent:main",
                "agent:consultant"
              ],
              "compliance": [
                "global",
                "agent:main",
                "agent:consultant",
                "agent:compliance"
              ]
            }
          },
          "llm": {
            "apiKey": "{{OPENROUTER_API_KEY}}",
            "baseURL": "https://openrouter.ai/api/v1",
            "model": "google/gemini-2.5-flash"
          }
        }
      },
      "amazon-bedrock": {
        "enabled": false
      },
      "anthropic": {
        "enabled": false
      },
      "anthropic-vertex": {
        "enabled": false
      },
      "byteplus": {
        "enabled": false
      },
      "chutes": {
        "enabled": false
      },
      "cloudflare-ai-gateway": {
        "enabled": false
      },
      "copilot-proxy": {
        "enabled": false
      },
      "deepseek": {
        "enabled": false
      },
      "fal": {
        "enabled": false
      },
      "github-copilot": {
        "enabled": false
      },
      "google": {
        "enabled": false
      },
      "huggingface": {
        "enabled": false
      },
      "kilocode": {
        "enabled": false
      },
      "kimi": {
        "enabled": false
      },
      "litellm": {
        "enabled": false
      },
      "microsoft-foundry": {
        "enabled": false
      },
      "mistral": {
        "enabled": false
      },
      "modelstudio": {
        "enabled": false
      },
      "moonshot": {
        "enabled": false
      },
      "nvidia": {
        "enabled": false
      },
      "ollama": {
        "enabled": false
      },
      "openai": {
        "enabled": false
      },
      "opencode": {
        "enabled": false
      },
      "opencode-go": {
        "enabled": false
      },
      "qianfan": {
        "enabled": false
      },
      "sglang": {
        "enabled": false
      },
      "synthetic": {
        "enabled": false
      },
      "together": {
        "enabled": false
      },
      "venice": {
        "enabled": false
      },
      "vercel-ai-gateway": {
        "enabled": false
      },
      "vllm": {
        "enabled": false
      },
      "volcengine": {
        "enabled": false
      },
      "xai": {
        "enabled": false
      },
      "xiaomi": {
        "enabled": false
      },
      "zai": {
        "enabled": false
      },
      "duckduckgo": {
        "enabled": true,
        "config": {}
      },
      "browser": {
        "enabled": true,
        "config": {}
      },
      "lobster": {
        "enabled": true,
        "config": {}
      },
      "llm-task": {
        "enabled": true,
        "config": {}
      },
      "diffs": {
        "enabled": true,
        "config": {}
      },
      "slack": {
        "enabled": true,
        "config": {}
      }
    },
    "load": {
      "paths": [
        "{{OPENCLAW_HOME}}/extensions/memory-lancedb-pro"
      ]
    },
    "allow": [
      "memory-lancedb-pro",
      "duckduckgo",
      "browser",
      "lobster",
      "llm-task",
      "diffs",
      "slack"
    ],
    "slots": {
      "memory": "memory-lancedb-pro"
    },
    "installs": {}
  },
  "cron": {
    "sessionRetention": "7d",
    "runLog": {
      "maxBytes": 10485760,
      "keepLines": 500
    }
  }
}
