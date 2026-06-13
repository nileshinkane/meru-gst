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
      : isInstalled
        ? 100
        : 0;
  const label = isInstalled
    ? "Restarting"
    : isDownloading
      ? `${progress}%`
      : "Update";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="relative h-8 min-w-[112px] overflow-hidden border-amber-400/70 bg-amber-300 px-2.5 text-amber-950 shadow-md shadow-amber-500/25 transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-500/35"
      title={
        updateState.version
          ? `Install MERU GST ${updateState.version}`
          : "Install update"
      }
      disabled={isDownloading || isInstalled}
      onClick={installUpdate}
    >
      <span
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 transition-[width] duration-75 ease-linear"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
      <span
        className="app-update-button-shine"
        aria-hidden="true"
      />
      <span className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/10 to-amber-600/10" />
      <span className="relative z-10 flex items-center gap-1.5 font-semibold uppercase text-sm">
        {isDownloading || isInstalled ? (
          <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-3.5" aria-hidden="true" />
        )}
        {label}
      </span>
    </Button>
  );
}
