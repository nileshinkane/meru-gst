import { invoke } from "@tauri-apps/api/core";
import {
  Database,
  Download,
  FileInput,
  RefreshCw,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Badge } from "@meru/ui/components/badge";
import { Button } from "@meru/ui/components/button";

import {
  canUseTauriDatabase,
  closeDatabaseConnection,
  listCustomers,
  listInvoices,
  listMedicines,
  resetAndSeedDatabase,
} from "@/lib/database";

type DatabaseExport = {
  bytes: number[];
  file_name: string;
  path: string;
};

type DatabaseImportResult = {
  path: string;
  backup_path?: string | null;
};

type LocalSeedScript = {
  path: string;
  sql: string;
};

type DatabaseCounts = {
  customers: number;
  medicines: number;
  invoices: number;
};

export function SettingsPage() {
  const seedInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [databasePath, setDatabasePath] = useState("");
  const [counts, setCounts] = useState<DatabaseCounts>({
    customers: 0,
    medicines: 0,
    invoices: 0,
  });
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const tauriAvailable = canUseTauriDatabase();

  async function refreshStatus() {
    setError("");
    setMessage("");

    if (!tauriAvailable) {
      setError(
        "Database actions are available only in the Tauri desktop app, not the plain Vite browser.",
      );
      return;
    }

    try {
      const [path, customers, medicines, invoices] = await Promise.all([
        invoke<string>("meru_database_path"),
        listCustomers(),
        listMedicines(),
        listInvoices(),
      ]);

      setDatabasePath(path);
      setCounts({
        customers: customers.length,
        medicines: medicines.length,
        invoices: invoices.length,
      });
    } catch (statusError) {
      setError(errorMessage(statusError));
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function seedFromLocalScript() {
    await runAction("Seeded local database from local private SQL.", async () => {
      const seed = await invoke<LocalSeedScript>("read_local_seed_script");
      await resetAndSeedDatabase(seed.sql);
      setMessage(`Seeded local database from ${seed.path}`);
    });
  }

  async function seedFromSelectedFile(file: File | undefined) {
    if (!file) return;

    await runAction(`Seeded local database from ${file.name}.`, async () => {
      const sql = await file.text();
      await resetAndSeedDatabase(sql);
      setMessage(`Seeded local database from ${file.name}`);
    });
  }

  async function exportDatabase() {
    await runAction("Exported database.", async () => {
      await closeDatabaseConnection();
      const exported = await invoke<DatabaseExport>("export_meru_database");
      downloadBytes(exported.bytes, exported.file_name);
      setMessage(`Exported ${exported.file_name} from ${exported.path}`);
    });
  }

  async function importDatabase(file: File | undefined) {
    if (!file) return;

    const confirmed = window.confirm(
      "Importing a database replaces the current local database completely. A backup of the current database will be created first. Continue?",
    );
    if (!confirmed) return;

    await runAction(`Imported database from ${file.name}.`, async () => {
      const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
      await closeDatabaseConnection();
      const result = await invoke<DatabaseImportResult>("import_meru_database", {
        bytes,
      });

      setMessage(
        result.backup_path
          ? `Imported ${file.name}. Backup saved at ${result.backup_path}`
          : `Imported ${file.name} into ${result.path}`,
      );

      window.setTimeout(() => window.location.reload(), 750);
    });
  }

  async function runAction(successMessage: string, action: () => Promise<void>) {
    setIsWorking(true);
    setError("");
    setMessage("");

    try {
      await action();
      setMessage((current) => current || successMessage);
      await refreshStatus();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setIsWorking(false);
      if (seedInputRef.current) seedInputRef.current.value = "";
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <section className="min-h-[calc(100vh-96px)] space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Settings</h2>
            <Badge variant={tauriAvailable ? "secondary" : "destructive"}>
              {tauriAvailable ? "Desktop DB" : "Browser preview"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage local SQLite data, seed scripts, and database import/export.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isWorking || !tauriAvailable}
          onClick={() => void refreshStatus()}
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
      {message ? <StatusBanner variant="success">{message}</StatusBanner> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Local database</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              The runtime database lives in Tauri app data, outside the repo.
            </p>
          </div>

          <div className="grid gap-4 p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Path
              </p>
              <p className="mt-1 break-all rounded-md border bg-muted/30 p-2 font-mono text-xs">
                {databasePath || "Unavailable in browser preview"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Customers" value={counts.customers} />
              <Metric label="Medicines" value={counts.medicines} />
              <Metric label="Invoices" value={counts.invoices} />
            </div>
          </div>
        </div>

        <aside className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert
              className="mt-0.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-semibold">Data policy</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Schema migrations are public. Seed SQL and exported DB files are
                local/private and ignored by Git.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ActionPanel
          title="Seed local DB"
          description="Run the ignored local private seed SQL file from src-tauri/migrations or app data."
        >
          <Button
            type="button"
            disabled={isWorking || !tauriAvailable}
            onClick={() => void seedFromLocalScript()}
          >
            <Database aria-hidden="true" />
            Run local seed
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isWorking || !tauriAvailable}
            onClick={() => seedInputRef.current?.click()}
          >
            <FileInput aria-hidden="true" />
            Choose seed SQL
          </Button>
          <input
            ref={seedInputRef}
            type="file"
            accept=".sql,text/sql,text/plain"
            className="hidden"
            onChange={(event) =>
              void seedFromSelectedFile(event.currentTarget.files?.[0])
            }
          />
        </ActionPanel>

        <ActionPanel
          title="Export DB"
          description="Download the current SQLite database so it can be emailed or archived."
        >
          <Button
            type="button"
            disabled={isWorking || !tauriAvailable}
            onClick={() => void exportDatabase()}
          >
            <Download aria-hidden="true" />
            Export database
          </Button>
        </ActionPanel>

        <ActionPanel
          title="Import DB"
          description="Replace this app's current database with a selected SQLite file."
        >
          <Button
            type="button"
            variant="destructive"
            disabled={isWorking || !tauriAvailable}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            Import and replace
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3,application/octet-stream"
            className="hidden"
            onChange={(event) =>
              void importDatabase(event.currentTarget.files?.[0])
            }
          />
        </ActionPanel>
      </section>
    </section>
  );
}

function ActionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBanner({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={
        variant === "error"
          ? "rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
          : "rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary"
      }
    >
      {children}
    </div>
  );
}

function downloadBytes(bytes: number[], fileName: string) {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.sqlite3",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
