import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  AlertTriangle,
  Bug,
  FileWarning,
  Power,
  RefreshCw,
} from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@meru/ui/components/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error?: Error;
  errorInfo?: ErrorInfo;
  isRestarting: boolean;
  restartError: string;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    isRestarting: false,
    restartError: "",
  };

  static getDerivedStateFromError(error: unknown) {
    return { error: normalizeError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Unhandled app error", error, errorInfo);
  }

  private handleRestart = async () => {
    this.setState({ isRestarting: true, restartError: "" });

    try {
      if (isTauri()) {
        await relaunch();
        return;
      }

      window.location.reload();
    } catch (error) {
      this.setState({
        isRestarting: false,
        restartError: normalizeError(error).message,
      });
    }
  };

  private handleTryAgain = () => {
    this.setState({
      error: undefined,
      errorInfo: undefined,
      isRestarting: false,
      restartError: "",
    });
  };

  render() {
    const { error, errorInfo, isRestarting, restartError } = this.state;

    if (!error) {
      return this.props.children;
    }

    const errorDetails = [
      error.name ? `${error.name}: ${error.message}` : error.message,
      error.stack,
      errorInfo?.componentStack,
    ]
      .filter(Boolean)
      .join("\n\n");

    return (
      <main className="app-error-screen min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-8">
          <div className="grid w-full items-center gap-8 rounded-lg border bg-card p-6 shadow-xl md:grid-cols-[0.82fr_1.18fr] md:p-8">
            <div className="app-error-illustration" aria-hidden="true">
              <div className="app-error-illustration__halo" />
              <div className="app-error-illustration__document">
                <div className="app-error-illustration__status">
                  <AlertTriangle className="size-7" />
                </div>
                <div className="app-error-illustration__line app-error-illustration__line--wide" />
                <div className="app-error-illustration__line" />
                <div className="app-error-illustration__line app-error-illustration__line--short" />
              </div>
              <div className="app-error-illustration__tile app-error-illustration__tile--bug">
                <Bug className="size-6" />
              </div>
              <div className="app-error-illustration__tile app-error-illustration__tile--file">
                <FileWarning className="size-6" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                  <AlertTriangle className="size-4" />
                  App stopped unexpectedly
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold leading-tight tracking-normal text-foreground">
                    MERU GST ran into a problem.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                    Restart the app to get back to your work. If the same screen
                    appears again, close MERU GST fully and reopen it from your
                    applications folder.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-md border bg-background/80 p-3">
                  <span className="block text-xs font-semibold uppercase tracking-normal text-foreground">
                    Step 1
                  </span>
                  Click restart and let the app reopen itself.
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <span className="block text-xs font-semibold uppercase tracking-normal text-foreground">
                    Step 2
                  </span>
                  If restart fails, close MERU GST and open it again.
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <span className="block text-xs font-semibold uppercase tracking-normal text-foreground">
                    Step 3
                  </span>
                  If this repeats, note what you clicked just before the crash.
                </div>
              </div>

              {restartError ? (
                <div className="rounded-md border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Restart failed: {restartError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="lg"
                  onClick={this.handleRestart}
                  disabled={isRestarting}
                  className="min-w-40 bg-gradient-to-r from-primary via-[#8d75bd] to-accent text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-105"
                >
                  {isRestarting ? (
                    <RefreshCw className="size-5 animate-spin" />
                  ) : (
                    <Power className="size-5" />
                  )}
                  {isRestarting ? "Restarting" : "Restart app"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={this.handleTryAgain}
                  disabled={isRestarting}
                >
                  <RefreshCw className="size-5" />
                  Try again
                </Button>
              </div>

              <details className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">
                  Show technical details
                </summary>
                <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
                  {errorDetails || "No additional details were reported."}
                </pre>
              </details>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
