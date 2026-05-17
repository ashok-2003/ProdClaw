#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const validationMarkerName = ".prodclaw-validation.json";
const validatorVersion = 2;
const openRouterPrefix = "openrouter/";
const prodClawCronPrefix = "prodclaw.";
const prodClawComplianceCronPrefix = "prodclaw.compliance.";

const requiredAgentIds = new Set(["main", "consultant", "compliance"]);

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
    if (arg.startsWith("--")) out[arg.slice(2)] = argv[++i] ?? true;
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

function relativeRenderedFiles(rendered) {
  return walk(rendered)
    .map((file) => path.relative(rendered, file))
    .filter((rel) => rel !== validationMarkerName)
    .sort();
}

function hashFile(file) {
  return "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function buildValidationMarker(rendered) {
  const fileHashes = {};
  for (const rel of relativeRenderedFiles(rendered)) {
    fileHashes[rel] = hashFile(path.join(rendered, rel));
  }

  return {
    validator: "prodclaw-rendered-validation",
    validatorVersion,
    validatedAt: new Date().toISOString(),
    renderedRoot: rendered,
    fileHashes,
  };
}

function writeValidationMarker(rendered) {
  const marker = buildValidationMarker(rendered);
  fs.writeFileSync(path.join(rendered, validationMarkerName), JSON.stringify(marker, null, 2) + "\n");
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

function isFilled(value, placeholder) {
  return typeof value === "string" && value.length > 0 && value !== placeholder;
}

function isOpenRouterModel(value) {
  return typeof value === "string" && value.startsWith(openRouterPrefix);
}

function assertOpenRouterModel(value, label) {
  assert(isOpenRouterModel(value), label + " must use OpenRouter model id, got: " + String(value || "missing"));
}

function assertFallbacks(fallbacks, label) {
  assert(Array.isArray(fallbacks), label + " must declare fallbacks array.");
  assert(fallbacks.length > 0, label + " must include at least one fallback.");
  for (const fallback of fallbacks) assertOpenRouterModel(fallback, label + " fallback");
}

function assertModelPolicy(modelPolicy, label) {
  assert(modelPolicy && typeof modelPolicy === "object", label + " must declare model policy object.");
  assertOpenRouterModel(modelPolicy.primary, label + " primary model");
  assertFallbacks(modelPolicy.fallbacks, label);
}

function isProdClawCron(job) {
  return typeof job?.name === "string" && job.name.startsWith(prodClawCronPrefix);
}

function assertNoNonProdClawCronJobs(jobs) {
  const nonProdClaw = jobs.filter((job) => !isProdClawCron(job));
  assert(
    nonProdClaw.length === 0,
    "Rendered cron template must contain only ProdClaw-owned jobs; preserve/merge non-ProdClaw jobs during apply/registration work. Found: " +
      nonProdClaw.map((job) => String(job?.name || "<unnamed>")).join(", ")
  );
}

function assertNoDuplicateCronNames(jobs) {
  const seen = new Set();
  for (const job of jobs) {
    assert(typeof job.name === "string" && job.name.length > 0, "Cron job missing name.");
    assert(!seen.has(job.name), "Duplicate cron job name: " + job.name);
    seen.add(job.name);
  }
}

function assertNoDuplicateCronIds(jobs) {
  const seen = new Set();
  for (const job of jobs) {
    assert(typeof job.id === "string" && job.id.length > 0, "Cron job missing id: " + String(job.name || "<unnamed>"));
    assert(!seen.has(job.id), "Duplicate cron job id: " + job.id);
    seen.add(job.id);
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
const slack = config.channels?.slack;
const slackAccounts = slack?.accounts ?? {};
const mainSlack = slackAccounts.default;
const complianceSlack = slackAccounts.compliance;

assert(config.channels?.telegram?.enabled === false, "Telegram must be disabled.");
assert(slack?.enabled === true, "Slack channel must be enabled for compliance delivery.");
assert(complianceSlack, "Slack compliance account missing.");
assert(complianceSlack.enabled === true, "Slack compliance account must be enabled.");
assert(complianceSlack.groupPolicy === "disabled", "Compliance Slack groupPolicy must be disabled.");
assert(isFilled(complianceSlack.appToken, "SLACK_COMPLIANCE_APP_TOKEN"), "Missing Slack compliance app token.");
assert(isFilled(complianceSlack.botToken, "SLACK_COMPLIANCE_BOT_TOKEN"), "Missing Slack compliance bot token.");

// Main/default Slack is optional in v1. If present, it must be complete.
if (mainSlack) {
  assert(mainSlack.enabled === true, "Main Slack account must be enabled when configured.");
  assert(isFilled(mainSlack.appToken, "SLACK_APP_TOKEN"), "Main Slack app token missing; omit main Slack or render with --slack-app-token.");
  assert(isFilled(mainSlack.botToken, "SLACK_BOT_TOKEN"), "Main Slack bot token missing; omit main Slack or render with --slack-bot-token.");
}

assert(config.plugins?.slots?.memory === "memory-lancedb-pro", "LanceDB Pro must be selected as memory slot.");
assert(config.plugins?.entries?.minimax?.enabled === false, "Native MiniMax plugin must be disabled.");

for (const provider of nativeProviders) {
  assert(config.plugins?.entries?.[provider]?.enabled === false, "Native provider must be disabled: " + provider);
}

for (const plugin of requiredPlugins) {
  assert(config.plugins?.entries?.[plugin]?.enabled === true, "Required plugin not enabled: " + plugin);
}

assertModelPolicy(config.agents?.defaults?.model, "Agent defaults");
const agents = config.agents?.list ?? [];
assert(Array.isArray(agents), "agents.list must be an array.");
for (const id of requiredAgentIds) {
  assert(agents.some((agent) => agent.id === id), "Missing required agent: " + id);
}
for (const agent of agents) {
  assert(requiredAgentIds.has(agent.id), "Rendered config contains unexpected agent id: " + String(agent.id));
  assertModelPolicy(agent.model, "Agent " + agent.id);
}

const memoryConfig = config.plugins?.entries?.["memory-lancedb-pro"]?.config;
assert(memoryConfig, "memory-lancedb-pro config missing.");
assert(memoryConfig.embedding?.baseURL === "https://openrouter.ai/api/v1", "LanceDB embedding must use OpenRouter baseURL.");
assert(memoryConfig.embedding?.apiKey, "LanceDB embedding apiKey must be configured.");
assert(memoryConfig.rerank?.rerankEndpoint === "https://openrouter.ai/api/v1/rerank", "LanceDB rerank must use OpenRouter rerank endpoint.");
assert(memoryConfig.rerank?.rerankApiKey, "LanceDB rerank api key must be configured.");
assert(memoryConfig.llm?.baseURL === "https://openrouter.ai/api/v1", "LanceDB memory reflection LLM must use OpenRouter baseURL.");
assert(memoryConfig.llm?.apiKey, "LanceDB memory reflection LLM apiKey must be configured.");

assert(Array.isArray(cron.jobs), "cron/jobs.json must contain jobs array.");
assert(cron.jobs.length >= 10, "Expected compliance cron jobs to be present.");
assertNoCronRuntimeState(cron);
assertNoDuplicateCronNames(cron.jobs);
assertNoDuplicateCronIds(cron.jobs);
assertNoNonProdClawCronJobs(cron.jobs);

const prodclawJobs = cron.jobs.filter(isProdClawCron);
assert(prodclawJobs.length >= 10, "Expected ProdClaw cron jobs to be namespaced with prodclaw.*");

for (const job of prodclawJobs) {
  assert(job.name.startsWith(prodClawComplianceCronPrefix), "ProdClaw cron job must use prodclaw.compliance.* namespace: " + job.name);
  assert(job.enabled === false, "ProdClaw cron job must render disabled before enable-cron: " + job.name);
  assert(job.agentId === "compliance", "ProdClaw cron job must target compliance: " + job.name);
  assertOpenRouterModel(job.payload?.model, "Cron job " + job.name + " primary model");
  assert(Array.isArray(job.payload?.toolsAllow), "Cron job must declare allowed tools: " + job.name);
  assert(job.payload.toolsAllow.includes("message"), "Delivery cron job must allow message tool: " + job.name);
  assert(String(job.payload?.message ?? "").includes("accountId=compliance"), "Delivery cron job must target compliance Slack account: " + job.name);
  const fallbacks = job.payload?.fallbacks ?? [];
  assert(fallbacks[0] === "openrouter/moonshotai/kimi-k2.6", "Cron first fallback must be Kimi: " + job.name);
  assert(fallbacks[1] === "openrouter/z-ai/glm-5.1", "Cron second fallback must be GLM: " + job.name);
}

const renderedFiles = relativeRenderedFiles(rendered);
const allText = renderedFiles
  .map((rel) => fs.readFileSync(path.join(rendered, rel), "utf8"))
  .join("\n");

// Local rendered validation intentionally allows real credentials because ./rendered
// is local-only and git-ignored. Repository credential scanning belongs in
// scripts/scan-secrets.mjs. Validation errors must describe missing/unsafe state
// without printing secret values.
const blockedNames = ["as" + "hok", "sha" + "shwat"];
const blockedHome = new RegExp("/home/" + blockedNames[1], "i");
const forbidden = [
  [new RegExp("\\b" + blockedNames[0] + "\\b", "i"), "blocked personal name"],
  [new RegExp("\\b" + blockedNames[1] + "\\b", "i"), "blocked personal name"],
  [blockedHome, "blocked personal absolute path"],
  [/\{\{[A-Z0-9_]+\}\}/, "unreplaced template placeholder"],
  [/\bOPENROUTER_API_KEY\b/, "missing OpenRouter API key (render with --openrouter-api-key or configure it before render)"],
  [/\bSLACK_COMPLIANCE_BOT_TOKEN\b/, "missing Slack compliance bot token (render with --slack-compliance-bot-token)"],
  [/\bSLACK_COMPLIANCE_APP_TOKEN\b/, "missing Slack compliance app token (render with --slack-compliance-app-token)"],
  [/\bSLACK_USER_ID\b/, "missing Slack user ID (render with --slack-user-id)"],
];

for (const [pattern, label] of forbidden) {
  assert(!pattern.test(allText), "Forbidden content found: " + label);
}

writeValidationMarker(rendered);
console.log("Rendered validation passed.");
console.log("Validation marker written: " + path.join(rendered, validationMarkerName));
