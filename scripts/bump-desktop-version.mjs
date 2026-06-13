import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopPackagePath = path.join(repoRoot, "apps/desktop/package.json");
const tauriConfigPath = path.join(
  repoRoot,
  "apps/desktop/src-tauri/tauri.conf.json",
);
const cargoManifestPath = path.join(
  repoRoot,
  "apps/desktop/src-tauri/Cargo.toml",
);

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const desktopPackage = readJson(desktopPackagePath);
  const currentVersion = desktopPackage.version;
  const nextVersion = options.setVersion ?? bumpPatchVersion(currentVersion);

  if (!isPlainSemver(nextVersion)) {
    throw new Error(`Invalid target version: ${nextVersion}`);
  }

  desktopPackage.version = nextVersion;

  const tauriConfig = readJson(tauriConfigPath);
  tauriConfig.version = nextVersion;

  const cargoManifest = readFileSync(cargoManifestPath, "utf8");
  const nextCargoManifest = replacePackageVersion(
    cargoManifest,
    nextVersion,
    "Cargo.toml",
  );

  const updates = [
    [desktopPackagePath, `${JSON.stringify(desktopPackage, null, 2)}\n`],
    [tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`],
    [cargoManifestPath, nextCargoManifest],
  ];

  if (!options.dryRun) {
    for (const [filePath, contents] of updates) {
      writeFileSync(filePath, contents);
    }

    refreshCargoLock();
  }

  const action = options.dryRun ? "Would bump" : "Bumped";
  console.log(`${action} desktop version ${currentVersion} -> ${nextVersion}`);
  for (const [filePath] of updates) {
    console.log(`- ${path.relative(repoRoot, filePath)}`);
  }
  console.log(
    options.dryRun
      ? "- apps/desktop/src-tauri/Cargo.lock (would be refreshed by cargo check)"
      : "- apps/desktop/src-tauri/Cargo.lock (refreshed by cargo check if needed)",
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseArgs(args) {
  const options = {
    dryRun: false,
    help: false,
    setVersion: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--set") {
      options.setVersion = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--set=")) {
      options.setVersion = arg.slice("--set=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.setVersion !== undefined && !isPlainSemver(options.setVersion)) {
    throw new Error(`--set must be a plain SemVer version, got: ${options.setVersion}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/bump-desktop-version.mjs [--dry-run] [--set x.y.z]

By default, bumps the desktop app patch version and updates:
- apps/desktop/package.json
- apps/desktop/src-tauri/tauri.conf.json
- apps/desktop/src-tauri/Cargo.toml

Then runs cargo check so Cargo refreshes apps/desktop/src-tauri/Cargo.lock if needed.`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function bumpPatchVersion(version) {
  if (!isPlainSemver(version)) {
    throw new Error(
      `Cannot patch-bump non-plain SemVer version: ${version}. Use --set x.y.z instead.`,
    );
  }

  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function replacePackageVersion(contents, version, fileName) {
  const nextContents = contents.replace(
    /(\[package\][\s\S]*?\nversion = ")([^"]+)(")/,
    `$1${version}$3`,
  );

  if (nextContents === contents) {
    throw new Error(`Could not find [package] version in ${fileName}.`);
  }

  return nextContents;
}

function refreshCargoLock() {
  const result = spawnSync("cargo", ["check"], {
    cwd: path.dirname(cargoManifestPath),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`cargo check failed with exit code ${result.status}`);
  }
}

function isPlainSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version ?? "");
}
