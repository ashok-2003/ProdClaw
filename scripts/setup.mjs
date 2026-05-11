#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const templatesRoot = path.join(repoRoot, "templates");

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "yes") {
      out.yes = true;
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

function profileValue(profile, key, fallback = "") {
  const value = profile[key];
  if (Array.isArray(value)) return value.map((line) => "- " + line).join("\n");
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function valuesFromArgs(args, home) {
  const profile = readProfile(args);
  const userName = args["user-name"] || profileValue(profile, "name", "OpenClaw Owner");
  const timezone = args.timezone || profileValue(profile, "timezone", defaultTimezone());

  return {
    USER_NAME: userName,
    USER_DISPLAY_NAME: args["user-display-name"] || profileValue(profile, "displayName", userName),
    USER_PRONOUNS: args["user-pronouns"] || profileValue(profile, "pronouns", "unspecified"),
    USER_ROLE: args["user-role"] || profileValue(profile, "role", "OpenClaw user"),
    COMMUNICATION_STYLE: args["communication-style"] || profileValue(profile, "communicationStyle", "- Keep responses clear, grounded, and actionable."),
    WORKING_STYLE: args["working-style"] || profileValue(profile, "workingStyle", "- Prefer safe, explicit steps over hidden assumptions."),
    USER_VALUES: args["user-values"] || profileValue(profile, "values", "- Reliability, clarity, and user control matter."),
    ASSISTANT_NAME: args["assistant-name"] || profileValue(profile, "assistantName", "Claw"),
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

function inspect(home) {
  if (!fs.existsSync(home)) throw new Error("OpenClaw home not found: " + home);
  console.log("OPENCLAW_HOME: " + home);
  console.log("");

  const checks = [
    ["openclaw", ["config", "validate"]],
    ["openclaw", ["plugins", "list", "--enabled", "--verbose"]],
    ["openclaw", ["hooks", "list"]],
  ];

  for (const [cmd, cmdArgs] of checks) {
    console.log("$ " + cmd + " " + cmdArgs.join(" "));
    const result = run(cmd, cmdArgs, {
      cwd: home,
      env: { ...process.env, OPENCLAW_HOME: home },
    });
    if (result.stdout.trim()) console.log(result.stdout.trim());
    if (result.stderr.trim()) console.error(result.stderr.trim());
    console.log("exit: " + result.status);
    console.log("");
  }
}

function render(args, home) {
  const out = path.resolve(args.out || "./rendered");
  if (fs.existsSync(out)) {
    throw new Error("Output already exists: " + out + ". Remove it or choose another --out.");
  }

  const values = valuesFromArgs(args, home);
  for (const rel of managedFiles()) {
    const template = path.join(templatesRoot, rel + ".tpl");
    const rendered = renderTemplate(fs.readFileSync(template, "utf8"), values);
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

    const result = run("diff", [
      "-u",
      "--label",
      "current/" + rel,
      "--label",
      "rendered/" + rel,
      current,
      candidate,
    ]);

    if (result.stdout.trim()) console.log(result.stdout);
    if (result.stderr.trim() && result.status > 1) console.error(result.stderr);
  }
}

function apply(args, home) {
  if (!args.yes) throw new Error("Refusing to apply without --yes.");
  const rendered = path.resolve(args.rendered || "./rendered");
  if (!fs.existsSync(rendered)) throw new Error("Rendered dir not found: " + rendered);
  if (!fs.existsSync(home)) throw new Error("OpenClaw home not found: " + home);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = home + ".prodclaw-backup." + stamp;
  fs.cpSync(home, backup, { recursive: true, errorOnExist: true });
  copyManagedFiles(rendered, home);

  console.log("Applied " + managedFiles().length + " managed files to " + home);
  console.log("Backup: " + backup);
  console.log("Restart the OpenClaw gateway manually after review.");
}

function usage() {
  console.log("Usage:");
  console.log("  node scripts/setup.mjs inspect --home ~/.openclaw");
  console.log("  node scripts/setup.mjs render --home ~/.openclaw --out ./rendered [inputs...] [--user-profile local/user-profile.json]");
  console.log("  node scripts/setup.mjs diff --home ~/.openclaw --rendered ./rendered");
  console.log("  node scripts/setup.mjs apply --home ~/.openclaw --rendered ./rendered --yes");
}

try {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const home = path.resolve(expandHome(args.home || process.env.OPENCLAW_HOME || "~/.openclaw"));

  if (command === "inspect") inspect(home);
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
