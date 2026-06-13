import { Download, RefreshCw } from "lucide-react";

import { Button } from "@meru/ui/components/button";

import type { AppUpdateState } from "@/lib/app-updates";

export function AppUpdateButton({
  updateState,
  installUpdate,
}: {
  updateState: AppUpdateState;
  installUpdate: () => void;
}) {
  if (
    updateState.status !== "available" &&
    updateState.status !== "downloading" &&
    updateState.status !== "installed"
  ) {
    return null;
  }

  const isDownloading = updateState.status === "downloading";
  const isInstalled = updateState.status === "installed";
  const progress =
    isDownloading && updateState.contentLength
      ? Math.min(
          99,
          Math.round(
            (updateState.downloadedBytes / updateState.contentLength) * 100,
          ),
        )
      : undefined;
  const label = isInstalled
    ? "Restarting"
    : isDownloading
      ? progress
        ? `Updating ${progress}%`
        : "Updating"
      : "Update";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-9 px-3"
      title={
        updateState.version
          ? `Install MERU GST ${updateState.version}`
          : undefined
      }
      disabled={isDownloading || isInstalled}
      onClick={installUpdate}
    >
      {isDownloading || isInstalled ? (
        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
