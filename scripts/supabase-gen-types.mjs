import "./load-env.mjs";

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();

if (!projectId) {
  console.error("Missing SUPABASE_PROJECT_ID in the environment.");
  process.exit(1);
}

const npxCommand = "npx";
const result = spawnSync(
  npxCommand,
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectId,
    "--schema",
    "public",
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    stdio: ["inherit", "pipe", "inherit"],
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0 || !result.stdout) {
  process.exit(result.status ?? 1);
}

const targetPath = resolve(process.cwd(), "src/types/supabase.ts");
writeFileSync(targetPath, result.stdout);

console.log(`Wrote remote database types to ${targetPath}`);
