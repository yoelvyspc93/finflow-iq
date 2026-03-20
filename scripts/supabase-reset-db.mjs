import "./load-env.mjs";

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node ./scripts/supabase-reset-db.mjs [--linked | --local] --confirm

Resets app data without dropping schema:
- truncates all tables in schema public
- deletes all users from auth.users

Examples:
  yarn supabase:db:clean --local --confirm
  yarn supabase:db:clean --linked --confirm
`);
  process.exit(0);
}

const hasLinked = args.includes("--linked");
const hasLocal = args.includes("--local");
const hasConfirm = args.includes("--confirm");

if (hasLinked === hasLocal) {
  console.error("Choose exactly one target: --linked or --local.");
  process.exit(1);
}

if (!hasConfirm) {
  console.error("Missing --confirm. Refusing to wipe database data without explicit confirmation.");
  process.exit(1);
}

const queryArgs = [
  "supabase",
  "db",
  "query",
  hasLinked ? "--linked" : "--local",
  "--file",
  resolve(process.cwd(), "supabase", "reset.sql"),
];

const result = spawnSync("npx", queryArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
