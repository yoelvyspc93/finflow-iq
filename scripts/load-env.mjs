import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

const envPath = resolve(process.cwd(), ".env");
const localEnvPath = resolve(process.cwd(), ".env.local");

if (existsSync(envPath)) {
  config({ path: envPath, quiet: true });
}

if (existsSync(localEnvPath)) {
  config({ path: localEnvPath, override: true, quiet: true });
}
