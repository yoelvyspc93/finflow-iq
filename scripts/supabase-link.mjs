import "./load-env.mjs";

import { spawnSync } from "node:child_process";

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();

if (!projectId) {
  console.error("Missing SUPABASE_PROJECT_ID in the environment.");
  process.exit(1);
}

const npxCommand = "npx";
const args = ["supabase", "link", "--project-ref", projectId];

if (process.env.SUPABASE_PASSWORD?.trim()) {
  args.push("--password", process.env.SUPABASE_PASSWORD.trim());
}

const result = spawnSync(npxCommand, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
