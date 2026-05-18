#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const templatesRoot = path.join(repoRoot, "templates");
const memoryPluginId = "memory-lancedb-pro";
const validationMarkerName = ".prodclaw-validation.json";
const expectedValidatorVersion = 2;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "yes" || key === "json" || key === "enable-main-slack" || key === "full-backup") {
      out[key] = true;
      continue;
    }
    out[key] = argv[++i];
  }
  return out;
}

function expandHome(input) {
  if (!input || input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function redact(text) {
  const openRouterPrefix = "sk-" + "or-v1-";
  const slackBotPrefix = "xo" + "xb-";
  const slackAppPrefix = "xa" + "pp-";
  return String(text)
    .replace(new RegExp(openRouterPrefix + "[A-Za-z0-9_-]+", "g"), openRouterPrefix + "REDACTED")
    .replace(new RegExp(slackBotPrefix + "[A-Za-z0-9-]+", "g"), slackBotPrefix + "REDACTED")
    .replace(new RegExp(slackAppPrefix + "[A-Za-z0-9-]+", "g"), slackAppPrefix + "REDACTED")
    .replace(/"token"\s*:\s*"[^"]+"/g, '"token": "REDACTED"')
    .replace(/"apiKey"\s*:\s*"[^"]+"/g, '"apiKey": "REDACTED"')
    .replace(/"rerankApiKey"\s*:\s*"[^"]+"/g, '"rerankApiKey": "REDACTED"')
    .replace(/"botToken"\s*:\s*"[^"]+"/g, '"botToken": "REDACTED"')
    .replace(/"appToken"\s*:\s*"[^"]+"/g, '"appToken": "REDACTED"');
}

function walk(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function managedFiles() {
  return walk(templatesRoot)
    .filter((file) => file.endsWith(".tpl"))
    .map((file) => path.relative(templatesRoot, file).replace(/\.tpl$/, ""))
    .sort();
}

function hashFile(file) {
  return "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: opts.env ?? process.env,
    cwd: opts.cwd ?? process.cwd(),
  });
  return {
    status: result.status,
    stdout: redact(result.stdout ?? ""),
    stderr: redact(result.stderr ?? ""),
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderTemplate(content, values) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key) => {
    if (!(key in values)) return "{{" + key + "}}";
    return values[key];
  });
}

function defaultTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || process.env.TZ || "UTC";
}

function readProfile(args) {
  const profilePath = args["user-profile"] || args.profile;
  if (!profilePath) return {};

  const resolved = path.resolve(expandHome(profilePath));
  if (!fs.existsSync(resolved)) throw new Error("User profile file not found: " + resolved);

  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error("Invalid user profile JSON: " + resolved + ": " + error.message);
  }
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function profileValue(profile, key, fallback = "") {
  const value = profile[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function valuesFromArgs(args, home) {
  const profile = readProfile(args);
  const userName = args["user-name"] || profileValue(profile, "name", "OpenClaw Owner");
  const timezone = args.timezone || profileValue(profile, "timezone", defaultTimezone());

  return {
    USER_NAME: userName,
    ASSISTANT_NAME: args["assistant-name"] || "Claw",
    OPENCLAW_HOME: home,
    USER_HOME: args["user-home"] || path.dirname(home),
    OPENROUTER_API_KEY: args["openrouter-api-key"] || process.env.OPENROUTER_API_KEY || "OPENROUTER_API_KEY",
    SLACK_BOT_TOKEN: args["slack-bot-token"] || process.env.SLACK_BOT_TOKEN || "SLACK_BOT_TOKEN",
    SLACK_APP_TOKEN: args["slack-app-token"] || process.env.SLACK_APP_TOKEN || "SLACK_APP_TOKEN",
    SLACK_COMPLIANCE_BOT_TOKEN: args["slack-compliance-bot-token"] || process.env.SLACK_COMPLIANCE_BOT_TOKEN || "SLACK_COMPLIANCE_BOT_TOKEN",
    SLACK_COMPLIANCE_APP_TOKEN: args["slack-compliance-app-token"] || process.env.SLACK_COMPLIANCE_APP_TOKEN || "SLACK_COMPLIANCE_APP_TOKEN",
    SLACK_USER_ID: args["slack-user-id"] || process.env.SLACK_USER_ID || "SLACK_USER_ID",
    TIMEZONE: timezone,
    GATEWAY_AUTH_TOKEN: args["gateway-auth-token"] || randomBytes(24).toString("hex"),
  };
}

function copyManagedFiles(rendered, home) {
  for (const rel of managedFiles()) {
    const src = path.join(rendered, rel);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(home, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
}

function pathExists(file) {
  return fs.existsSync(file);
}

function detectHome(args) {
  const candidates = [];
  if (args.home) candidates.push({ source: "--home", value: path.resolve(expandHome(args.home)) });
  if (process.env.OPENCLAW_HOME) candidates.push({ source: "OPENCLAW_HOME", value: path.resolve(expandHome(process.env.OPENCLAW_HOME)) });
  candidates.push({ source: "default", value: path.join(os.homedir(), ".openclaw") });

  const found = candidates.find((candidate) => pathExists(candidate.value));
  return found ?? candidates[0];
}

function findFirstJson(home, names) {
  for (const name of names) {
    const file = path.join(home, name);
    const parsed = readJsonIfExists(file);
    if (parsed) return { file, parsed };
  }
  return null;
}

function detectOpenClawVersion(home) {
  const pkg = findFirstJson(home, ["package.json", "openclaw/package.json"]);
  if (pkg?.parsed?.version) return pkg.parsed.version;

  const result = run("openclaw", ["--version"], { env: { ...process.env, OPENCLAW_HOME: home } });
  if (result.status === 0 && result.stdout.trim()) return result.stdout.trim().split("\n")[0];
  return null;
}

function hasFilledSecret(value, placeholder) {
  return typeof value === "string" && value.length > 0 && value !== placeholder;
}

function detectSlackBindings(config) {
  const bindings = Array.isArray(config.bindings) ? config.bindings : [];
  const byAccount = new Map();

  for (const binding of bindings) {
    if (binding?.match?.channel !== "slack") continue;
    const accountId = binding.match.accountId ?? "default";
    const entry = {
      accountId,
      agentId: binding.agentId ?? null,
      raw: {
        match: binding.match,
        agentId: binding.agentId ?? null,
      },
    };
    const existing = byAccount.get(accountId) ?? [];
    existing.push(entry);
    byAccount.set(accountId, existing);
  }

  return byAccount;
}

function detectSlackAccounts(config) {
  const accounts = config.channels?.slack?.accounts ?? {};
  const bindingsByAccount = detectSlackBindings(config);
  const detected = [];

  for (const [accountId, account] of Object.entries(accounts)) {
    const appTokenPresent = hasFilledSecret(account?.appToken, "SLACK_APP_TOKEN") && hasFilledSecret(account?.appToken, "SLACK_COMPLIANCE_APP_TOKEN");
    const botTokenPresent = hasFilledSecret(account?.botToken, "SLACK_BOT_TOKEN") && hasFilledSecret(account?.botToken, "SLACK_COMPLIANCE_BOT_TOKEN");
    const boundAgents = (bindingsByAccount.get(accountId) ?? [])
      .map((binding) => binding.agentId)
      .filter(Boolean);
    const missing = [];
    if (!appTokenPresent) missing.push("app token");
    if (!botTokenPresent) missing.push("bot token");

    detected.push({
      accountId,
      enabled: account?.enabled === true,
      appTokenPresent,
      botTokenPresent,
      complete: appTokenPresent && botTokenPresent,
      missing,
      boundAgents,
      recommendedUse: null,
    });
  }

  return detected.sort((a, b) => a.accountId.localeCompare(b.accountId));
}

function nameHintsCompliance(accountId) {
  return /compliance|audit|report/i.test(accountId);
}

function recommendComplianceSlackAccount(accounts) {
  const complete = accounts.filter((account) => account.complete && account.enabled !== false);
  const boundCompliance = complete.filter((account) => account.boundAgents.includes("compliance"));
  if (boundCompliance.length === 1) return { accountId: boundCompliance[0].accountId, reason: "already bound to compliance" };
  if (boundCompliance.length > 1) return { accountId: null, reason: "multiple complete accounts are already bound to compliance; ask explicitly" };

  const nameHinted = complete.filter((account) => nameHintsCompliance(account.accountId));
  if (nameHinted.length === 1) return { accountId: nameHinted[0].accountId, reason: "account ID suggests compliance/audit/report use" };
  if (nameHinted.length > 1) return { accountId: null, reason: "multiple complete compliance-like accounts found; ask explicitly" };

  const notMain = complete.filter((account) => !account.boundAgents.includes("main"));
  if (notMain.length === 1) return { accountId: notMain[0].accountId, reason: "only complete account not bound to main" };
  if (complete.length === 1) return { accountId: complete[0].accountId, reason: "only complete Slack account found" };
  if (complete.length > 1) return { accountId: null, reason: "multiple complete Slack accounts found; ask explicitly" };
  return { accountId: null, reason: "no complete Slack account found" };
}

function recommendMainSlackAccount(accounts) {
  const complete = accounts.filter((account) => account.complete && account.enabled !== false);
  const boundMain = complete.filter((account) => account.boundAgents.includes("main"));
  if (boundMain.length === 1) return { accountId: boundMain[0].accountId, reason: "already bound to main" };
  if (boundMain.length > 1) return { accountId: null, reason: "multiple complete accounts are already bound to main; ask explicitly" };
  return { accountId: null, reason: "main Slack is optional; default is skip" };
}

function detectSlackState(config) {
  const accounts = detectSlackAccounts(config);
  const complianceRecommendation = recommendComplianceSlackAccount(accounts);
  const mainRecommendation = recommendMainSlackAccount(accounts);
  return {
    accounts,
    bindings: accounts.flatMap((account) => account.boundAgents.map((agentId) => ({ accountId: account.accountId, agentId }))),
    complianceRecommendation,
    mainRecommendation,
  };
}

function detectMemoryState(config, home) {
  const entries = config.plugins?.entries ?? {};
  const memoryEntry = entries[memoryPluginId];
  const memorySlot = config.plugins?.slots?.memory ?? null;
  const loadPaths = config.plugins?.load?.paths ?? [];
  const defaultExtensionDir = path.join(home, "extensions", memoryPluginId);
  const configuredLoadPath = loadPaths.find((item) => String(item).includes(memoryPluginId));
  const resolvedLoadPath = configuredLoadPath ? path.resolve(expandHome(String(configuredLoadPath).replace("{{OPENCLAW_HOME}}", home))) : null;
  const extensionDirExists = pathExists(defaultExtensionDir) || Boolean(resolvedLoadPath && pathExists(resolvedLoadPath));
  const entryPresent = Boolean(memoryEntry);
  const entryEnabled = memoryEntry?.enabled === true;
  const slotBound = memorySlot === memoryPluginId;
  const differentActiveMemory = memorySlot && memorySlot !== memoryPluginId ? memorySlot : null;

  let status = "BROKEN";
  let summary = "LanceDB Pro missing";
  let action = "Install and enable memory-lancedb-pro before apply/cron enablement.";

  if (entryPresent && entryEnabled && slotBound) {
    status = "READY";
    summary = "memory-lancedb-pro is enabled and bound as memory slot";
    action = "Run doctor later for the real memory smoke test.";
  } else if (entryPresent && !entryEnabled && slotBound) {
    status = "WARN";
    summary = "memory-lancedb-pro is present and selected but disabled";
    action = "Enable memory-lancedb-pro after approval; preserve existing data.";
  } else if (entryPresent && entryEnabled && !slotBound && differentActiveMemory) {
    status = "WARN";
    summary = "memory-lancedb-pro is enabled but memory slot points to " + differentActiveMemory;
    action = "Preserve old memory plugin/data, then switch slot after approval.";
  } else if (entryPresent && !slotBound && differentActiveMemory) {
    status = "WARN";
    summary = "different memory plugin active: " + differentActiveMemory;
    action = "Preserve old memory plugin/data; enable and bind LanceDB Pro after approval.";
  } else if (entryPresent && !entryEnabled) {
    status = "WARN";
    summary = "memory-lancedb-pro entry exists but is disabled";
    action = "Enable and bind memory-lancedb-pro after approval.";
  } else if (!entryPresent && extensionDirExists) {
    status = "WARN";
    summary = "memory-lancedb-pro files appear present but config entry is missing";
    action = "Register/enable memory-lancedb-pro after approval.";
  }

  return {
    pluginId: memoryPluginId,
    status,
    summary,
    action,
    entryPresent,
    entryEnabled,
    slot: memorySlot,
    slotBound,
    differentActiveMemory,
    extensionDirExists,
    configuredLoadPath: configuredLoadPath ?? null,
  };
}

function detectState(args) {
  const homeCandidate = detectHome(args);
  const home = homeCandidate.value;
  const configHit = findFirstJson(home, ["openclaw.json", "config.json"]);
  const config = configHit?.parsed ?? {};
  const slackState = detectSlackState(config);
  const cronFile = path.join(home, "cron", "jobs.json");
  const cron = readJsonIfExists(cronFile);
  const skillsDir = path.join(home, "skills");
  const customSkills = pathExists(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
    : [];

  const openRouterConfigured = Boolean(
    process.env.OPENROUTER_API_KEY ||
    config.openrouter?.apiKey ||
    config.providers?.openrouter?.apiKey ||
    config.models?.openrouter?.apiKey
  );

  const memory = detectMemoryState(config, home);

  return {
    home,
    homeSource: homeCandidate.source,
    homeExists: pathExists(home),
    timezone: args.timezone || defaultTimezone(),
    configPath: configHit?.file ?? null,
    version: pathExists(home) ? detectOpenClawVersion(home) : null,
    openRouterConfigured,
    slackConfigured: Boolean(config.channels?.slack),
    slackAccounts: slackState.accounts,
    slackBindings: slackState.bindings,
    slackComplianceRecommendation: slackState.complianceRecommendation,
    slackMainRecommendation: slackState.mainRecommendation,
    complianceSlackConfigured: Boolean(slackState.complianceRecommendation.accountId),
    mainSlackConfigured: Boolean(slackState.mainRecommendation.accountId),
    slackUserIdDetected: Boolean(config.channels?.slack?.target || config.owner?.slackUserId || process.env.SLACK_USER_ID),
    memory,
    lancedbInstalled: memory.entryPresent || memory.extensionDirExists,
    lancedbEnabled: memory.entryEnabled && memory.slotBound,
    cronFile,
    cronFound: Boolean(cron),
    prodclawCronCount: Array.isArray(cron?.jobs)
      ? cron.jobs.filter((job) => String(job.name ?? "").startsWith("prodclaw.compliance.") || String(job.name ?? "").startsWith("compliance-")).length
      : 0,
    customSkills,
    gatewayStatus: run("openclaw", ["status"], { env: { ...process.env, OPENCLAW_HOME: home } }),
  };
}

function line(status, message) {
  console.log(status.padEnd(7) + message);
}

function printSlackDiscovery(state) {
  if (state.slackAccounts.length === 0) {
    line("WARN", "No Slack accounts discovered");
  } else {
    line("READY", "Slack accounts discovered: " + state.slackAccounts.length);
    for (const account of state.slackAccounts) {
      const status = account.complete ? "READY" : "WARN";
      const missing = account.missing.length ? "; missing " + account.missing.join(" and ") : "";
      const bound = account.boundAgents.length ? "; bound agent(s): " + account.boundAgents.join(", ") : "; bound agent(s): none";
      line(status, "accountId=" + account.accountId + "; enabled=" + account.enabled + "; appToken=" + (account.appTokenPresent ? "present" : "missing") + "; botToken=" + (account.botTokenPresent ? "present" : "missing") + bound + missing);
    }
  }

  const compliance = state.slackComplianceRecommendation;
  if (compliance.accountId) line("READY", "Recommended compliance Slack account: " + compliance.accountId + " (" + compliance.reason + ")");
  else line("WARN", "Compliance Slack account needs explicit choice: " + compliance.reason);

  const main = state.slackMainRecommendation;
  if (main.accountId) line("READY", "Recommended main Slack account: " + main.accountId + " (" + main.reason + ")");
  else line("WARN", "Main Slack recommendation: skip for now (" + main.reason + ")");
}

function printInspect(state) {
  console.log("ProdClaw Inspect");
  console.log("");

  console.log("OpenClaw");
  if (state.homeExists) line("READY", "Found existing OpenClaw home: " + state.home + " (" + state.homeSource + ")");
  else line("BROKEN", "OpenClaw home not found: " + state.home + " (" + state.homeSource + ")");
  if (state.version) line("READY", "OpenClaw version: " + state.version);
  else line("WARN", "OpenClaw version not detected");
  if (state.configPath) line("READY", "Config found: " + state.configPath);
  else line("WARN", "OpenClaw config not found");
  console.log("");

  console.log("Timezone");
  line("READY", "Detected timezone: " + state.timezone);
  console.log("");

  console.log("OpenRouter");
  if (state.openRouterConfigured) line("READY", "Existing OpenRouter config found");
  else line("WARN", "OpenRouter API key not detected; configure will ask");
  console.log("");

  console.log("Slack");
  printSlackDiscovery(state);
  if (state.slackUserIdDetected) line("READY", "Slack member ID detected");
  else line("WARN", "Slack member ID not detected; configure will ask");
  console.log("");

  console.log("LanceDB Pro");
  line(state.memory.status, state.memory.summary);
  if (state.memory.slot) line(state.memory.slotBound ? "READY" : "WARN", "memory slot: " + state.memory.slot);
  else line("WARN", "memory slot not configured");
  if (state.memory.extensionDirExists) line("READY", "memory-lancedb-pro files/load path detected");
  else line("WARN", "memory-lancedb-pro files/load path not detected");
  line(state.memory.status === "READY" ? "WARN" : state.memory.status, state.memory.action);
  console.log("");

  console.log("Cron");
  if (state.cronFound) line("READY", "Existing cron config found: " + state.cronFile);
  else line("WARN", "Cron config not found");
  if (state.prodclawCronCount > 0) line("READY", "ProdClaw/compliance cron jobs detected: " + state.prodclawCronCount);
  else line("WARN", "ProdClaw cron jobs not installed yet");
  console.log("");

  console.log("Skills");
  if (state.customSkills.length > 0) line("READY", "Skills found: " + state.customSkills.length);
  else line("WARN", "No skills directory or skills detected");
  console.log("");

  console.log("Gateway");
  if (state.gatewayStatus.status === 0) line("READY", "OpenClaw status command succeeded");
  else line("WARN", "Gateway status not detected; doctor will own runtime checks");
}

function missingConfigureInputs(state) {
  const missing = [];
  missing.push({ key: "owner name", required: true, reason: "always confirm during configure unless supplied by profile/flag" });
  if (!state.openRouterConfigured) missing.push({ key: "OpenRouter API key", required: true, reason: "not detected" });
  if (!state.slackComplianceRecommendation.accountId) {
    if (state.slackAccounts.some((account) => account.complete)) {
      missing.push({ key: "compliance Slack account choice", required: true, reason: state.slackComplianceRecommendation.reason });
    } else {
      missing.push({ key: "compliance Slack app token", required: true, reason: "no complete compliance Slack account detected" });
      missing.push({ key: "compliance Slack bot token", required: true, reason: "no complete compliance Slack account detected" });
    }
  }
  if (!state.slackUserIdDetected) missing.push({ key: "compliance Slack member ID", required: true, reason: "not detected" });
  if (state.memory.status !== "READY") missing.push({ key: "LanceDB Pro setup", required: true, reason: state.memory.summary + "; " + state.memory.action });
  if (!state.slackMainRecommendation.accountId) missing.push({ key: "main Slack", required: false, reason: "optional; default is skip" });
  return missing;
}

function configure(args) {
  const state = detectState(args);
  const missing = missingConfigureInputs(state);

  console.log("ProdClaw Configure");
  console.log("");
  console.log("Detected");
  line(state.homeExists ? "READY" : "BROKEN", "OpenClaw home: " + state.home);
  line("READY", "Timezone: " + state.timezone);
  line(state.openRouterConfigured ? "READY" : "WARN", "OpenRouter: " + (state.openRouterConfigured ? "detected" : "missing"));
  line(state.slackComplianceRecommendation.accountId ? "READY" : "WARN", "Compliance Slack recommendation: " + (state.slackComplianceRecommendation.accountId ?? "needs choice") + " - " + state.slackComplianceRecommendation.reason);
  line(state.slackMainRecommendation.accountId ? "READY" : "WARN", "Main Slack recommendation: " + (state.slackMainRecommendation.accountId ?? "skip") + " - " + state.slackMainRecommendation.reason);
  line(state.memory.status, "LanceDB Pro: " + state.memory.summary);
  console.log("");

  console.log("Slack account discovery");
  printSlackDiscovery(state);
  console.log("");

  console.log("Inputs still needed");
  for (const item of missing) {
    const status = item.required ? "BROKEN" : "WARN";
    line(status, item.key + " - " + item.reason);
  }
  console.log("");

  console.log("Configure is non-destructive in this pass. It does not write to the live OpenClaw home.");
  console.log("Slack account mapping is discovery/recommendation only until interactive configure and staged persistence land.");
  console.log("Use render flags or local/user-profile.json for missing values until interactive configure lands.");
}

function inspect(args) {
  const state = detectState(args);
  if (args.json) {
    const { gatewayStatus, ...safeState } = state;
    console.log(JSON.stringify(safeState, null, 2));
  } else printInspect(state);
}

function shouldRenderMainSlack(args) {
  const hasMainAppToken = Boolean(args["slack-app-token"] || process.env.SLACK_APP_TOKEN);
  const hasMainBotToken = Boolean(args["slack-bot-token"] || process.env.SLACK_BOT_TOKEN);
  if (args["enable-main-slack"] && (!hasMainAppToken || !hasMainBotToken)) {
    throw new Error("--enable-main-slack requires --slack-app-token and --slack-bot-token, or matching environment variables.");
  }
  return args["enable-main-slack"] || (hasMainAppToken && hasMainBotToken);
}

function addMainSlackAccount(config, values) {
  config.channels.slack.appToken = values.SLACK_APP_TOKEN;
  config.channels.slack.botToken = values.SLACK_BOT_TOKEN;
  config.channels.slack.groupPolicy = "open";
  config.channels.slack.capabilities = { interactiveReplies: true };
  config.channels.slack.accounts.default = {
    enabled: true,
    mode: "socket",
    appToken: values.SLACK_APP_TOKEN,
    botToken: values.SLACK_BOT_TOKEN,
    userTokenReadOnly: true,
    nativeStreaming: true,
    streaming: "partial",
  };
  config.bindings.unshift({
    match: {
      channel: "slack",
      accountId: "default",
    },
    agentId: "main",
  });
}

function postProcessRenderedFile(rel, rendered, args, values) {
  if (rel !== "openclaw.json") return rendered;
  const config = JSON.parse(rendered);
  if (shouldRenderMainSlack(args)) addMainSlackAccount(config, values);
  return JSON.stringify(config, null, 2) + "\n";
}

function render(args, home) {
  const out = path.resolve(args.out || "./rendered");
  if (fs.existsSync(out)) {
    throw new Error("Output already exists: " + out + ". Remove it or choose another --out.");
  }

  const values = valuesFromArgs(args, home);
  for (const rel of managedFiles()) {
    const template = path.join(templatesRoot, rel + ".tpl");
    const rendered = postProcessRenderedFile(
      rel,
      renderTemplate(fs.readFileSync(template, "utf8"), values),
      args,
      values,
    );
    const dst = path.join(out, rel);
    ensureDir(path.dirname(dst));
    fs.writeFileSync(dst, rendered);
  }

  console.log("Rendered " + managedFiles().length + " managed files to " + out);
}

function diff(args, home) {
  const rendered = path.resolve(args.rendered || "./rendered");
  if (!fs.existsSync(rendered)) throw new Error("Rendered dir not found: " + rendered);

  for (const rel of managedFiles()) {
    const current = path.join(home, rel);
    const candidate = path.join(rendered, rel);
    if (!fs.existsSync(candidate)) continue;

    const currentLabel = fs.existsSync(current) ? "current/" + rel : "current/" + rel + " (missing)";
    const currentPath = fs.existsSync(current) ? current : "/dev/null";
    if (!fs.existsSync(current)) console.log("NEW FILE: " + rel);

    const result = run("diff", [
      "-u",
      "--label",
      currentLabel,
      "--label",
      "rendered/" + rel,
      currentPath,
      candidate,
    ]);

    if (result.stdout.trim()) console.log(result.stdout);
    if (result.stderr.trim() && result.status > 1) console.error(result.stderr);
  }
}

function assertFreshValidation(rendered) {
  const markerPath = path.join(rendered, validationMarkerName);
  if (!fs.existsSync(markerPath)) {
    throw new Error(
      "Rendered output has not been validated. Run `prodclaw validate --rendered " + rendered + "`, review `prodclaw diff`, then run apply again."
    );
  }

  const marker = readJsonIfExists(markerPath);
  if (!marker || marker.validator !== "prodclaw-rendered-validation") {
    throw new Error("Validation marker is invalid. Rerun `prodclaw validate --rendered " + rendered + "` and review diff before apply.");
  }

  if (marker.validatorVersion !== expectedValidatorVersion) {
    throw new Error("Validation marker version is incompatible. Rerun `prodclaw validate --rendered " + rendered + "` and review diff before apply.");
  }

  const expectedHashes = marker.fileHashes ?? {};
  const expectedFiles = Object.keys(expectedHashes).sort();
  if (expectedFiles.length === 0) {
    throw new Error("Validation marker has no file hashes. Rerun `prodclaw validate --rendered " + rendered + "` and review diff before apply.");
  }

  const currentFiles = walk(rendered)
    .map((file) => path.relative(rendered, file))
    .filter((rel) => rel !== validationMarkerName)
    .sort();

  const missing = expectedFiles.filter((rel) => !currentFiles.includes(rel));
  const added = currentFiles.filter((rel) => !expectedFiles.includes(rel));
  const changed = expectedFiles.filter((rel) => currentFiles.includes(rel) && hashFile(path.join(rendered, rel)) !== expectedHashes[rel]);

  if (missing.length || added.length || changed.length) {
    const details = [
      missing.length ? "missing: " + missing.join(", ") : null,
      added.length ? "added: " + added.join(", ") : null,
      changed.length ? "changed: " + changed.join(", ") : null,
    ].filter(Boolean).join("; ");
    throw new Error(
      "Rendered output changed after validation (" + details + "). Run `prodclaw validate --rendered " + rendered + "`, review `prodclaw diff`, then apply again."
    );
  }
}

function backupManifest(mode, home, rendered, copiedFiles, skippedFiles) {
  return {
    createdAt: new Date().toISOString(),
    mode,
    sourceHome: home,
    renderedRoot: rendered,
    managedFiles: managedFiles(),
    copiedFiles,
    skippedFiles,
    notes: mode === "full"
      ? "Full OpenClaw home backup was explicitly requested with --full-backup."
      : "Default backup copied only existing files that ProdClaw manages and is about to replace. Runtime memory, sessions, logs, auth, databases, non-ProdClaw skills, and non-ProdClaw cron state were not copied.",
  };
}

function createManagedBackup(home, rendered, stamp) {
  const backup = path.join(home, "backups", "prodclaw-" + stamp);
  const copiedFiles = [];
  const skippedFiles = [];
  ensureDir(backup);

  for (const rel of managedFiles()) {
    const src = path.join(home, rel);
    const candidate = path.join(rendered, rel);
    if (!fs.existsSync(candidate)) continue;
    if (!fs.existsSync(src)) {
      skippedFiles.push({ path: rel, reason: "target file did not exist before apply" });
      continue;
    }

    const dst = path.join(backup, rel);
    ensureDir(path.dirname(dst));
    fs.copyFileSync(src, dst);
    copiedFiles.push(rel);
  }

  fs.writeFileSync(
    path.join(backup, "manifest.json"),
    JSON.stringify(backupManifest("managed", home, rendered, copiedFiles, skippedFiles), null, 2) + "\n",
  );
  return backup;
}

function createFullBackup(home, rendered, stamp) {
  const backup = home + ".prodclaw-full-backup." + stamp;
  fs.cpSync(home, backup, { recursive: true, errorOnExist: true });
  fs.writeFileSync(
    path.join(backup, "prodclaw-backup-manifest.json"),
    JSON.stringify(backupManifest("full", home, rendered, managedFiles(), []), null, 2) + "\n",
  );
  return backup;
}

function apply(args, home) {
  if (!args.yes) throw new Error("Refusing to apply without --yes.");
  const rendered = path.resolve(args.rendered || "./rendered");
  if (!fs.existsSync(rendered)) throw new Error("Rendered dir not found: " + rendered);
  if (!fs.existsSync(home)) throw new Error("OpenClaw home not found: " + home);

  assertFreshValidation(rendered);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = args["full-backup"]
    ? createFullBackup(home, rendered, stamp)
    : createManagedBackup(home, rendered, stamp);
  copyManagedFiles(rendered, home);

  console.log("Applied " + managedFiles().length + " managed files to " + home);
  console.log((args["full-backup"] ? "Full backup" : "Managed-file backup") + ": " + backup);
  console.log("Restart the OpenClaw gateway manually after review.");
}

function usage() {
  console.log("Usage:");
  console.log("  node scripts/setup.mjs inspect [--home ~/.openclaw] [--json]");
  console.log("  node scripts/setup.mjs configure [--home ~/.openclaw]");
  console.log("  node scripts/setup.mjs render --home ~/.openclaw --out ./rendered [inputs...] [--user-profile local/user-profile.json]");
  console.log("  node scripts/setup.mjs render --home ~/.openclaw --out ./rendered --enable-main-slack --slack-app-token <token> --slack-bot-token <token>");
  console.log("  node scripts/setup.mjs diff --home ~/.openclaw --rendered ./rendered");
  console.log("  node scripts/setup.mjs apply --home ~/.openclaw --rendered ./rendered --yes [--full-backup]");
}

try {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const detectedHome = detectHome(args).value;
  const home = path.resolve(expandHome(args.home || process.env.OPENCLAW_HOME || detectedHome));

  if (command === "inspect") inspect(args);
  else if (command === "configure") configure(args);
  else if (command === "render") render(args, home);
  else if (command === "diff") diff(args, home);
  else if (command === "apply") apply(args, home);
  else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(redact(error.stack || error.message));
  process.exit(1);
}
