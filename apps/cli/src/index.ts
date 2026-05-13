#!/usr/bin/env node

import { createCli } from "./program.js";

const argv =
  process.argv[2] === "--"
    ? [process.argv[0] ?? "node", process.argv[1] ?? "meru", ...process.argv.slice(3)]
    : process.argv;

try {
  await createCli().parseAsync(argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
