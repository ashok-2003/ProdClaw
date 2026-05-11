#!/usr/bin/env node
/**
 * Repository / CI credential scanner.
 *
 * This script rejects committed real credentials while allowing template
 * placeholders such as {{OPENROUTER_API_KEY}}. It is intentionally separate
 * from scripts/validate.mjs, which validates local rendered output and allows
 * real credentials inside ./rendered because that directory is git-ignored.
 */

import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules", "rendered"]);
const TEXT_EXTENSIONS = new Set([
  "",
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".gitignore",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sh",
  ".toml",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);

function parseArgs(argv) {
  const out = { path: ".", json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "json") {
      out.json = true;
      continue;
    }
    out[key] = argv[++i];
  }
  return out;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function shouldRead(file) {
  const base = path.basename(file);
  const ext = path.extname(file);
  return TEXT_EXTENSIONS.has(ext) || base.includes(".") === false;
}

const openRouterPrefix = "sk-" + "or-v1-";
const slackBotPrefix = "xo" + "xb-";
const slackAppPrefix = "xa" + "pp-";

const SECRET_PATTERNS = [
  [new RegExp(openRouterPrefix + "[A-Za-z0-9_-]{8,}"), "OpenRouter API key"],
  [new RegExp(slackBotPrefix + "[A-Za-z0-9-]{8,}"), "Slack bot token"],
  [new RegExp(slackAppPrefix + "[A-Za-z0-9-]{8,}"), "Slack app token"],
];

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.path || ".");

if (!fs.existsSync(root)) {
  console.error("Scan path not found: " + root);
  process.exit(1);
}

const violations = [];

for (const file of walk(root)) {
  if (!shouldRead(file)) continue;

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file: path.relative(root, file), label });
    }
  }
}

if (args.json) {
  console.log(JSON.stringify({ passed: violations.length === 0, violations }, null, 2));
} else if (violations.length === 0) {
  console.log("Secret scan passed. No committed credentials detected.");
} else {
  console.error("Secret scan failed. Committed credentials detected:");
  for (const violation of violations) {
    console.error("  " + violation.file + " - " + violation.label);
  }
  console.error("");
  console.error("Real credentials belong only in local ignored files such as ./rendered or .env.");
  console.error("Templates and docs should use placeholder syntax instead.");
}

process.exit(violations.length === 0 ? 0 : 1);
