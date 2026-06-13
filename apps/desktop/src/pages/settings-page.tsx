import { invoke } from "@tauri-apps/api/core";
import {
  Building2,
  Database,
  Download,
  FileInput,
  RefreshCw,
  Save,
  ShieldAlert,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@meru/ui/components/badge";
import { Button } from "@meru/ui/components/button";
import { Input } from "@meru/ui/components/input";
import { Label } from "@meru/ui/components/label";
import { Separator } from "@meru/ui/components/separator";
import { Textarea } from "@meru/ui/components/textarea";

import {
  canUseTauriDatabase,
  closeDatabaseConnection,
  getCurrentOrgProfile,
  listCustomers,
  listInvoices,
  listMedicines,
  resetAndSeedDatabase,
  upsertCurrentOrgProfile,
  type CurrentOrgProfile,
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

const emptyOrgForm: CurrentOrgProfile = {
  company_id: null,
  org_owner_first_name: "",
  org_owner_last_name: "",
  name: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  gstin: "",
  drug_license: "",
  fssai_no: "",
  jurisdiction: "",
  terms: "",
  updated_at: "",
};

export function SettingsPage() {
  const seedInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [databasePath, setDatabasePath] = useState("");
  const [orgForm, setOrgForm] = useState<CurrentOrgProfile>(emptyOrgForm);
  const [counts, setCounts] = useState<DatabaseCounts>({
    customers: 0,
    medicines: 0,
    invoices: 0,
  });
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const tauriAvailable = canUseTauriDatabase();

  async function refreshStatus(options: { clearStatus?: boolean } = {}) {
    const clearStatus = options.clearStatus ?? true;
    if (clearStatus) {
      setError("");
    }

    if (!tauriAvailable) {
      setError(
        "Database actions are available only in the Tauri desktop app, not the plain Vite browser.",
      );
      return;
    }

    try {
      const [path, customers, medicines, invoices, orgProfile] = await Promise.all([
        invoke<string>("meru_database_path"),
        listCustomers(),
        listMedicines(),
        listInvoices(),
        getCurrentOrgProfile(),
      ]);

      setDatabasePath(path);
      setOrgForm(orgProfile);
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

  function updateOrgForm(field: keyof CurrentOrgProfile, value: string) {
    setOrgForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveOrgProfile() {
    await runAction("Saved organization profile.", async () => {
      await upsertCurrentOrgProfile(orgForm);
    });
  }

  async function seedFromLocalScript() {
    await runAction("Seeded local database from local private SQL.", async () => {
      const seed = await invoke<LocalSeedScript>("read_local_seed_script");
      await resetAndSeedDatabase(seed.sql);
      return `Seeded local database from ${seed.path}`;
    });
  }

  async function seedFromSelectedFile(file: File | undefined) {
    if (!file) return;

    await runAction(`Seeded local database from ${file.name}.`, async () => {
      const sql = await file.text();
      await resetAndSeedDatabase(sql);
      return `Seeded local database from ${file.name}`;
    });
  }

  async function exportDatabase() {
    await runAction("Exported database.", async () => {
      await closeDatabaseConnection();
      const exported = await invoke<DatabaseExport>("export_meru_database");
      downloadBytes(exported.bytes, exported.file_name);
      return `Exported ${exported.file_name} from ${exported.path}`;
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

      const importMessage = result.backup_path
        ? `Imported ${file.name}. Backup saved at ${result.backup_path}`
        : `Imported ${file.name} into ${result.path}`;

      window.setTimeout(() => window.location.reload(), 750);

      return importMessage;
    });
  }

  async function runAction(
    successMessage: string,
    action: () => Promise<string | void>,
  ) {
    setIsWorking(true);
    setError("");

    try {
      const actionMessage = await action();
      toast.success(actionMessage || successMessage);
      await refreshStatus({ clearStatus: false });
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

      <form
        className="rounded-lg border border-primary/20 bg-gradient-to-br from-card via-secondary/30 to-accent/10 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void saveOrgProfile();
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Organization profile</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Current seller, owner, GST, license, and invoice footer details.
              </p>
            </div>
          </div>
          <Button type="submit" disabled={isWorking || !tauriAvailable}>
            <Save aria-hidden="true" />
            Save organization
          </Button>
        </div>

        <Separator className="bg-primary/20" />

        <div className="grid gap-5 p-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <UserRound className="size-4" aria-hidden="true" />
              Owner
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInputField
                id="org-owner-first-name"
                label="First name"
                value={orgForm.org_owner_first_name}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) =>
                  updateOrgForm("org_owner_first_name", value)
                }
              />
              <TextInputField
                id="org-owner-last-name"
                label="Last name"
                value={orgForm.org_owner_last_name}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) =>
                  updateOrgForm("org_owner_last_name", value)
                }
              />
            </div>
          </div>

          <Separator className="bg-border/70" />

          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-4" aria-hidden="true" />
              Business
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TextInputField
                id="org-name"
                label="Organization name"
                value={orgForm.name}
                className="xl:col-span-2"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("name", value)}
              />
              <TextInputField
                id="org-phone"
                label="Phone"
                value={orgForm.phone}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("phone", value)}
              />
              <TextInputField
                id="org-gstin"
                label="GSTIN"
                value={orgForm.gstin}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("gstin", value)}
              />
              <TextInputField
                id="org-address-line1"
                label="Address line 1"
                value={orgForm.address_line1}
                className="xl:col-span-2"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("address_line1", value)}
              />
              <TextInputField
                id="org-address-line2"
                label="Address line 2"
                value={orgForm.address_line2}
                className="xl:col-span-2"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("address_line2", value)}
              />
              <TextInputField
                id="org-city"
                label="City"
                value={orgForm.city}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("city", value)}
              />
              <TextInputField
                id="org-state"
                label="State"
                value={orgForm.state}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("state", value)}
              />
              <TextInputField
                id="org-pincode"
                label="Pincode"
                value={orgForm.pincode}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("pincode", value)}
              />
              <TextInputField
                id="org-jurisdiction"
                label="Jurisdiction"
                value={orgForm.jurisdiction}
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("jurisdiction", value)}
              />
              <TextInputField
                id="org-drug-license"
                label="Drug license"
                value={orgForm.drug_license}
                className="xl:col-span-2"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("drug_license", value)}
              />
              <TextInputField
                id="org-fssai"
                label="FSSAI"
                value={orgForm.fssai_no}
                className="xl:col-span-2"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("fssai_no", value)}
              />
              <TextareaField
                id="org-terms"
                label="Terms"
                value={orgForm.terms}
                className="md:col-span-2 xl:col-span-4"
                disabled={isWorking || !tauriAvailable}
                onChange={(value) => updateOrgForm("terms", value)}
              />
            </div>
          </div>
        </div>
      </form>

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
  children,
}: {
  variant: "error";
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
      {children}
    </div>
  );
}

function TextInputField({
  id,
  label,
  value,
  onChange,
  disabled,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        className="mt-1.5 bg-background/80"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  disabled,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        className="mt-1.5 min-h-20 bg-background/80 text-sm"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
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
