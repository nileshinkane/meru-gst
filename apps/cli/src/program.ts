import fs from "node:fs";
import path from "node:path";
import { Command, Option } from "commander";
import {
  browseDbf,
  listDbfFiles,
  printDbfRows,
  printDbfSchema,
} from "./commands/dbf.js";

const VERSION = "0.1.0";

export function createCli(): Command {
  const program = new Command();
  const invokedName = path.basename(process.argv[1] ?? "meru");
  const defaultMode = invokedName.includes("local") ? "local" : "prod";

  program
    .name(invokedName.includes("local") ? "meru-local" : "meru")
    .description("Modern terminal app for Meru Pharmaceuticals legacy data")
    .version(VERSION)
    .addOption(
      new Option("--mode <mode>", "runtime mode label")
        .choices(["local", "prod"])
        .default(process.env.MERU_CLI_MODE ?? defaultMode),
    )
    .option("--data-dir <directory>", "legacy DBF directory", findDefaultDataDir());

  program
    .command("doctor")
    .description("Check that the CLI can run in this workspace")
    .action(() => {
      const mode = program.opts<{ mode: string }>().mode;
      console.log(`MERUGST CLI is ready. mode=${mode}`);
    });

  const dbf = program
    .command("dbf")
    .description("Read-only DBF explorer commands");

  dbf
    .command("list")
    .argument("[directory]", "directory to scan", ".")
    .option("-r, --recursive", "scan child directories")
    .option("--json", "print machine-readable JSON")
    .description("List DBF files")
    .action((directory: string, options: Record<string, unknown>) => {
      return listDbfFiles(directory, withDataDir(options, program));
    });

  dbf
    .command("schema")
    .argument("<file>", "DBF file path")
    .option("--encoding <encoding>", "DBF character encoding", "latin1")
    .option("--loose", "open DBF using loose read mode")
    .option("--json", "print machine-readable JSON")
    .description("Show DBF field schema")
    .action((file: string, options: Record<string, unknown>) => {
      return printDbfSchema(file, withDataDir(options, program));
    });

  dbf
    .command("rows")
    .argument("<file>", "DBF file path")
    .option("-l, --limit <count>", "maximum records to read", parsePositiveInt, 20)
    .option("-f, --fields <fields>", "comma-separated fields to display")
    .option("-w, --where <FIELD=value>", "exact field match filter", collectOption, [])
    .option("-c, --contains <FIELD=value>", "case-insensitive substring filter", collectOption, [])
    .option("--include-deleted", "include deleted DBF records")
    .option("--encoding <encoding>", "DBF character encoding", "latin1")
    .option("--loose", "open DBF using loose read mode")
    .option("--json", "print machine-readable JSON")
    .description("Show DBF records")
    .action((file: string, options: Record<string, unknown>) => {
      return printDbfRows(file, withDataDir(options, program) as Parameters<typeof printDbfRows>[1]);
    });

  dbf
    .command("browse")
    .argument("<file>", "DBF file path")
    .option("-l, --limit <count>", "maximum records to load into the browser", parsePositiveInt, 300)
    .option("-f, --fields <fields>", "comma-separated fields to display")
    .option("--include-deleted", "include deleted DBF records")
    .option("--encoding <encoding>", "DBF character encoding", "latin1")
    .option("--loose", "open DBF using loose read mode")
    .description("Open a read-only interactive terminal table")
    .action((file: string, options: Record<string, unknown>) => {
      return browseDbf(file, withDataDir(options, program) as Parameters<typeof browseDbf>[1]);
    });

  return program;
}

function withDataDir(options: Record<string, unknown>, program: Command): Record<string, unknown> & { dataDir: string } {
  return {
    ...options,
    dataDir: program.opts<{ dataDir: string }>().dataDir,
  };
}

function findDefaultDataDir(): string {
  let current = process.cwd();

  for (;;) {
    if (fs.existsSync(path.join(current, "CUSTMST.DBF"))) {
      return current;
    }

    const legacyDir = path.join(current, "legacy");
    if (fs.existsSync(path.join(legacyDir, "CUSTMST.DBF"))) {
      return legacyDir;
    }

    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return process.cwd();
    }

    current = parent;
  }
}

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Expected a positive integer, got: ${value}`);
  }
  return parsed;
}

function collectOption(value: string, previous: string[]): string[] {
  return [...previous, value];
}
