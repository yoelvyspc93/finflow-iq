import "./load-env.mjs";

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = ["supabase", "gen", "types", "typescript", "--linked", "--schema", "public"];

const result = spawnSync("npx", args, {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
  shell: true,
  windowsHide: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if ((result.status ?? 1) !== 0) {
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exit(result.status ?? 1);
}

if (!result.stdout) {
  console.error("Supabase CLI did not return any generated types.");
  process.exit(1);
}

const targetPath = resolve(process.cwd(), "src/types/supabase.ts");
writeFileSync(targetPath, result.stdout);

console.log(`Wrote linked database types to ${targetPath}`);
