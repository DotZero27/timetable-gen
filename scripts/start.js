/**
 * Start script: ensure DB exists and has tables, then start Next.js.
 * Run with: bun run start
 */

import { spawn } from "bun:spawn";
import { ensureDb } from "./ensure-db.js";

ensureDb();

const proc = spawn({
  cmd: ["bun", "run", "next", "start"],
  cwd: import.meta.dir + "/..",
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

proc.exited.then((code) => {
  process.exit(code ?? 0);
});
