import "./load-env.mjs";

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectId = process.env.SUPABASE_PROJECT_ID?.trim();

if (!projectId) {
  console.error("Missing SUPABASE_PROJECT_ID in the environment.");
  process.exit(1);
}

const command = [
  "npx",
  "supabase",
  "gen",
  "types",
  "typescript",
  "--project-id",
  projectId,
  "--schema",
  "public",
].join(" ");

let stdout = "";

try {
  stdout = execSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
    stdio: ["inherit", "pipe", "inherit"],
    windowsHide: true,
  });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

if (!stdout) {
  process.exit(1);
}

const targetPath = resolve(process.cwd(), "src/types/supabase.ts");
writeFileSync(targetPath, stdout);

console.log(`Wrote remote database types to ${targetPath}`);
