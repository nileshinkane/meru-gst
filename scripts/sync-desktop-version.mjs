import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
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

const packageJson = readJson(desktopPackagePath);
const version = packageJson.version;

if (!isSemver(version)) {
  throw new Error(
    `apps/desktop/package.json has invalid SemVer version: ${version}`,
  );
}

const tauriConfig = readJson(tauriConfigPath);
tauriConfig.version = version;
writeJson(tauriConfigPath, tauriConfig);

const cargoManifest = readFileSync(cargoManifestPath, "utf8");
const nextCargoManifest = cargoManifest.replace(
  /^version = ".*"$/m,
  `version = "${version}"`,
);

if (nextCargoManifest === cargoManifest && !cargoManifest.includes(`version = "${version}"`)) {
  throw new Error("Could not find Cargo package version to update.");
}

writeFileSync(cargoManifestPath, nextCargoManifest);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isSemver(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    value,
  );
}
