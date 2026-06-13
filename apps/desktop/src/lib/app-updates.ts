import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installed"
  | "current"
  | "error";

export type AppUpdateState = {
  status: AppUpdateStatus;
  currentVersion?: string;
  version?: string;
  body?: string;
  downloadedBytes: number;
  contentLength?: number;
  error?: string;
};

export const initialAppUpdateState: AppUpdateState = {
  status: "idle",
  downloadedBytes: 0,
};

export async function checkForAppUpdate() {
  if (!isTauri()) {
    return null;
  }

  return check({ timeout: 15_000 });
}

export async function installAppUpdate(
  update: Update,
  onEvent: (event: DownloadEvent) => void,
) {
  await update.downloadAndInstall(onEvent, { timeout: 120_000 });
  await relaunch();
}
