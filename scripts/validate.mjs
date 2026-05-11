#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const nativeProviders = [
  "amazon-bedrock",
  "anthropic",
  "anthropic-vertex",
  "byteplus",
  "chutes",
  "cloudflare-ai-gateway",
  "copilot-proxy",
  "deepseek",
  "fal",
  "github-copilot",
  "google",
  "huggingface",
  "kilocode",
  "kimi",
  "litellm",
  "microsoft-foundry",
  "minimax",
  "mistral",
  "modelstudio",
  "moonshot",
  "nvidia",
  "ollama",
  "openai",
  "opencode",
  "opencode-go",
  "qianfan",
  "sglang",
  "synthetic",
  "together",
  "venice",
  "vercel-ai-gateway",
  "vllm",
  "volcengine",
  "xai",
  "xiaomi",
  "zai",
];

const requiredPlugins = [
  "memory-lancedb-pro",
  "duckduckgo",
  "browser",
  "lobster",
  "llm-task",
  "diffs",
  "slack",
];

const requiredFiles = [
  "openclaw.json",
  "cron/jobs.json",
  "workspace/AGENTS.md",
  "workspace-compliance/AGENTS.md",
  "workspace-consultant/AGENTS.md",
  "skills/cron-job-builder/SKILL.md",
  "workspace-consultant/skills/council/SKILL.md",
  "workspace-consultant/skills/council/roles.json",
];

const cronRuntimeKeys = new Set([
  "state",
  "runHistory",
  "lastRun",
  "nextRun",
  "lastRunAt",
  "nextRunAt",
  "lastRunAtMs",
  "nextRunAtMs",
  "lastRunStatus",
  "lastStatus",
  "lastDurationMs",
  "lastDeliveryStatus",
  "lastError",
  "consecutiveErrors",
]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) out[arg.slice(2)] = argv[++i];
  }
  return out;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("Invalid JSON in " + label + ": " + error.message);
  }
}

function assertNoCronRuntimeState(value, trail = "cron") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoCronRuntimeState(item, trail + "[" + index + "]"));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    assert(!cronRuntimeKeys.has(key), "Cron template contains runtime-only key at " + trail + "." + key);
    assertNoCronRuntimeState(child, trail + "." + key);
  }
}

const args = parseArgs(process.argv.slice(2));
const rendered = path.resolve(args.rendered || "./rendered");
assert(fs.existsSync(rendered), "Rendered directory not found: " + rendered);

for (const rel of requiredFiles) {
  assert(fs.existsSync(path.join(rendered, rel)), "Missing required file: " + rel);
}

const config = readJson(path.join(rendered, "openclaw.json"), "openclaw.json");
const cron = readJson(path.join(rendered, "cron/jobs.json"), "cron/jobs.json");

assert(config.channels?.telegram?.enabled === false, "Telegram must be disabled.");
assert(config.channels?.slack?.accounts?.default, "Slack default account missing.");
assert(config.channels?.slack?.accounts?.compliance, "Slack compliance account missing.");
assert(config.channels.slack.accounts.compliance.groupPolicy === "disabled", "Compliance Slack groupPolicy must be disabled.");
assert(config.plugins?.slots?.memory === "memory-lancedb-pro", "LanceDB Pro must be selected as memory slot.");
assert(config.plugins?.entries?.minimax?.enabled === false, "Native MiniMax plugin must be disabled.");

for (const provider of nativeProviders) {
  assert(config.plugins?.entries?.[provider]?.enabled === false, "Native provider must be disabled: " + provider);
}

for (const plugin of requiredPlugins) {
  assert(config.plugins?.entries?.[plugin]?.enabled === true, "Required plugin not enabled: " + plugin);
}

assert(Array.isArray(cron.jobs), "cron/jobs.json must contain jobs array.");
assert(cron.jobs.length >= 10, "Expected compliance cron jobs to be present.");
assertNoCronRuntimeState(cron);

for (const job of cron.jobs) {
  assert(job.enabled === true, "Cron job must be enabled: " + job.name);
  assert(job.agentId === "compliance", "Cron job must target compliance: " + job.name);
  assert(job.payload?.model === "openrouter/xiaomi/mimo-v2.5-pro", "Cron job must use Mimo primary: " + job.name);
  const fallbacks = job.payload?.fallbacks ?? [];
  assert(fallbacks[0] === "openrouter/moonshotai/kimi-k2.6", "Cron first fallback must be Kimi: " + job.name);
  assert(fallbacks[1] === "openrouter/z-ai/glm-5.1", "Cron second fallback must be GLM: " + job.name);
}

const renderedFiles = walk(rendered);
const allText = renderedFiles
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");

// Local rendered validation intentionally allows real credentials because ./rendered
// is local-only and git-ignored. Repository credential scanning belongs in
// scripts/scan-secrets.mjs.
const blockedNames = ["as" + "hok", "sha" + "shwat"];
const blockedHome = new RegExp("/home/" + blockedNames[1], "i");
const forbidden = [
  [new RegExp("\\b" + blockedNames[0] + "\\b", "i"), "blocked personal name"],
  [new RegExp("\\b" + blockedNames[1] + "\\b", "i"), "blocked personal name"],
  [blockedHome, "blocked personal absolute path"],
  [/\{\{[A-Z0-9_]+\}\}/, "unreplaced template placeholder"],
  [/\bOPENROUTER_API_KEY\b/, "missing OpenRouter API key (render with --openrouter-api-key or configure it before render)"],
  [/\bSLACK_BOT_TOKEN\b/, "missing Slack bot token (render with --slack-bot-token if main Slack is enabled)"],
  [/\bSLACK_APP_TOKEN\b/, "missing Slack app token (render with --slack-app-token if main Slack is enabled)"],
  [/\bSLACK_COMPLIANCE_BOT_TOKEN\b/, "missing Slack compliance bot token (render with --slack-compliance-bot-token)"],
  [/\bSLACK_COMPLIANCE_APP_TOKEN\b/, "missing Slack compliance app token (render with --slack-compliance-app-token)"],
  [/\bSLACK_USER_ID\b/, "missing Slack user ID (render with --slack-user-id)"],
];

for (const [pattern, label] of forbidden) {
  assert(!pattern.test(allText), "Forbidden content found: " + label);
}

console.log("Rendered validation passed.");
