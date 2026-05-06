#!/usr/bin/env node
/**
 * scan-secrets.mjs — Repository / CI secret scanner.
 *
 * Fails if real credentials are committed to the repository.  Placeholders
 * such as {{OPENROUTER_API_KEY}} in template files are explicitly allowed.
 *
 * Usage:
 *   node scripts/scan-secrets.mjs [--path .] [--json]
 *
 * This script is intended to run in CI (e.g. GitHub Actions).  It must never
 * be confused with the local rendered-config validator (scripts/validate.mjs),
 * which intentionally allows real secrets because ./rendered is git-ignored.
 */

import fs from "node:fs";
import path from "node:path";

// Directories to skip entirely during the walk.
const SKIP_DIRS = new Set(["node_modules", ".git", "rendered"]);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    // Boolean flags that take no value.
    if (key === "json") {
      out[key] = true;
      continue;
    }
    out[key] = argv[++i];
  }
  return out;
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

// Secret patterns to detect in committed files.
// Placeholders in templates (e.g. {{OPENROUTER_API_KEY}}) must not match.
const openRouterPrefix = "sk-" + "or-v1-";
const slackBotPrefix = "xo" + "xb-";
const slackAppPrefix = "xa" + "pp-";
const blockedNames = ["as" + "hok", "sha" + "shwat"];
const blockedHome = new RegExp("/home/" + blockedNames[1], "i");

const SECRET_PATTERNS = [
  [new RegExp(openRouterPrefix + "[A-Za-z0-9_-]+"), "OpenRouter API key"],
  [new RegExp(slackBotPrefix + "[A-Za-z0-9-]+"), "Slack bot token"],
  [new RegExp(slackAppPrefix + "[A-Za-z0-9-]+"), "Slack app token"],
  [new RegExp("\\b" + blockedNames[0] + "\\b", "i"), "blocked personal name"],
  [new RegExp("\\b" + blockedNames[1] + "\\b", "i"), "blocked personal name"],
  [blockedHome, "blocked personal absolute path"],
];

const args = parseArgs(process.argv.slice(2));
const scanRoot = path.resolve(args.path || ".");
const jsonOutput = args.json === true;

if (!fs.existsSync(scanRoot)) {
  console.error("Scan path not found: " + scanRoot);
  process.exit(1);
}

const violations = [];

for (const file of walk(scanRoot)) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    // Skip binary or unreadable files.
    continue;
  }

  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({ file: path.relative(scanRoot, file), label });
    }
  }
}

if (jsonOutput) {
  console.log(JSON.stringify({ violations, passed: violations.length === 0 }, null, 2));
} else {
  if (violations.length === 0) {
    console.log("Secret scan passed. No committed secrets detected.");
  } else {
    console.error("Secret scan FAILED. Committed secrets detected:");
    for (const { file, label } of violations) {
      console.error("  " + file + " — " + label);
    }
    console.error("");
    console.error("Note: real credentials belong only in ./rendered (git-ignored).");
    console.error("Templates should use {{PLACEHOLDER}} syntax instead.");
  }
}

process.exit(violations.length === 0 ? 0 : 1);
