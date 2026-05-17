import { spawnSync } from "node:child_process";

function runOpenClaw(args, env = process.env) {
  const result = spawnSync("openclaw", args, {
    encoding: "utf8",
    env,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function commandWorks(args, env) {
  const result = runOpenClaw(args, env);
  return result.status === 0;
}

function helpMentions(output, words) {
  const text = String(output || "").toLowerCase();
  return words.every((word) => text.includes(word.toLowerCase()));
}

function commandLikelyExists(parentArgs, childName, env) {
  const result = runOpenClaw([...parentArgs, "--help"], env);
  if (result.status !== 0) return false;
  return helpMentions(result.stdout + "\n" + result.stderr, [childName]);
}

export function detectOpenClawCliCapabilities(home) {
  const env = { ...process.env, OPENCLAW_HOME: home };
  const rootHelp = runOpenClaw(["--help"], env);
  const available = rootHelp.status === 0;

  if (!available) {
    return {
      available: false,
      cron: { available: false, add: false, list: false, run: false },
      agents: { available: false, add: false, list: false, bind: false },
    };
  }

  const rootOutput = rootHelp.stdout + "\n" + rootHelp.stderr;
  const cronAvailable = helpMentions(rootOutput, ["cron"]) || commandWorks(["cron", "--help"], env);
  const agentsAvailable = helpMentions(rootOutput, ["agents"]) || commandWorks(["agents", "--help"], env);

  return {
    available: true,
    cron: {
      available: cronAvailable,
      add: cronAvailable && commandLikelyExists(["cron"], "add", env),
      list: cronAvailable && commandLikelyExists(["cron"], "list", env),
      run: cronAvailable && commandLikelyExists(["cron"], "run", env),
    },
    agents: {
      available: agentsAvailable,
      add: agentsAvailable && commandLikelyExists(["agents"], "add", env),
      list: agentsAvailable && commandLikelyExists(["agents"], "list", env),
      bind: agentsAvailable && commandLikelyExists(["agents"], "bind", env),
    },
  };
}
