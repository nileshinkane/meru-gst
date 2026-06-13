import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkForAppUpdate,
  initialAppUpdateState,
  installAppUpdate,
  type AppUpdateState,
} from "@/lib/app-updates";

const updateCheckThrottleMs = 60_000;

export function useAppUpdates() {
  const [state, setState] = useState<AppUpdateState>(initialAppUpdateState);
  const pendingUpdateRef =
    useRef<Awaited<ReturnType<typeof checkForAppUpdate>>>(null);
  const checkingRef = useRef(false);
  const lastCheckAtRef = useRef(0);

  const checkForUpdates = useCallback(async (force = false) => {
    const now = Date.now();

    if (checkingRef.current) {
      return;
    }

    if (pendingUpdateRef.current) {
      return;
    }

    if (!force && now - lastCheckAtRef.current < updateCheckThrottleMs) {
      return;
    }

    checkingRef.current = true;
    lastCheckAtRef.current = now;
    setState((current) =>
      current.status === "downloading"
        ? current
        : { ...current, status: "checking", error: undefined },
    );

    try {
      const update = await checkForAppUpdate();
      pendingUpdateRef.current = update;

      if (update) {
        setState({
          status: "available",
          currentVersion: update.currentVersion,
          version: update.version,
          body: update.body,
          downloadedBytes: 0,
        });
      } else {
        setState({
          status: "current",
          downloadedBytes: 0,
        });
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: getErrorMessage(error),
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = pendingUpdateRef.current;

    if (!update) {
      await checkForUpdates(true);
      return;
    }

    let downloadedBytes = 0;
    setState((current) => ({
      ...current,
      status: "downloading",
      downloadedBytes,
      error: undefined,
    }));

    try {
      await installAppUpdate(update, (event) => {
        if (event.event === "Started") {
          downloadedBytes = 0;
          setState((current) => ({
            ...current,
            downloadedBytes,
            contentLength: event.data.contentLength,
          }));
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setState((current) => ({
            ...current,
            downloadedBytes,
          }));
          return;
        }

        setState((current) => ({
          ...current,
          downloadedBytes: current.contentLength ?? downloadedBytes,
        }));
      });

      setState((current) => ({ ...current, status: "installed" }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "available",
        error: getErrorMessage(error),
      }));
    }
  }, [checkForUpdates]);

  useEffect(() => {
    void checkForUpdates(true);

    const handleInteraction = () => {
      void checkForUpdates();
    };

    window.addEventListener("pointerdown", handleInteraction, true);
    window.addEventListener("keydown", handleInteraction, true);
    window.addEventListener("focus", handleInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleInteraction, true);
      window.removeEventListener("keydown", handleInteraction, true);
      window.removeEventListener("focus", handleInteraction);
    };
  }, [checkForUpdates]);

  return { state, installUpdate };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
