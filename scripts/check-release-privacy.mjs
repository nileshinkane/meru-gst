import { execFileSync } from "node:child_process";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const denied = [
  /(^|\/)legacy\//i,
  /(^|\/)db\//i,
  /(^|\/)data\/private\//i,
  /\.(db|db-shm|db-wal|sqlite|sqlite3)$/i,
  /\.(dbf|cdx|ndx|ntx|idx|dbt|fpt|bak)$/i,
  /apps\/desktop\/src-tauri\/migrations\/.*(seed|data|sample).*\.sql$/i,
];

const matches = trackedFiles.filter((file) =>
  denied.some((pattern) => pattern.test(file)),
);

if (matches.length > 0) {
  console.error(
    [
      "Release privacy check failed. These tracked files look like customer or runtime data:",
      ...matches.map((file) => `- ${file}`),
      "",
      "Remove them from git before publishing a desktop release.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Release privacy check passed.");
