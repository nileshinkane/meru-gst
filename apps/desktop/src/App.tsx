import { Database, FileText, Monitor } from "lucide-react";

const ledgers = [
  {
    name: "Sales Register",
    period: "FY 2025-26",
    status: "Ready",
    amount: "Rs. 14,82,430",
  },
  {
    name: "Purchase Register",
    period: "FY 2025-26",
    status: "Pending review",
    amount: "Rs. 9,18,206",
  },
  {
    name: "Input Tax Credit",
    period: "April 2026",
    status: "Matched",
    amount: "Rs. 1,08,940",
  },
];

function App() {
  return (
    <main className="grid min-h-screen grid-cols-[240px_1fr] bg-background text-foreground">
      <aside className="border-r bg-muted/30 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Database className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">MERU GST</h1>
            <p className="mt-1 text-xs text-muted-foreground">Desktop ledger</p>
          </div>
        </div>

        <nav className="mt-8 grid gap-1 text-sm">
          {["Dashboard", "Returns", "Registers", "Settings"].map((item) => (
            <button
              key={item}
              className="rounded-md px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="min-w-0 px-8 py-6">
        <header className="flex items-center justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Offline first
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              GST workspace
            </h2>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Tauri desktop shell
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-[1fr_140px_150px_140px] border-b bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>Register</span>
              <span>Period</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
            </div>
            {ledgers.map((ledger) => (
              <div
                key={ledger.name}
                className="grid grid-cols-[1fr_140px_150px_140px] items-center border-b px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-medium">{ledger.name}</span>
                <span className="text-muted-foreground">{ledger.period}</span>
                <span>{ledger.status}</span>
                <span className="text-right tabular-nums">{ledger.amount}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Runtime</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Local-first desktop workspace for Windows 10/11 and modern macOS.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-4" aria-hidden="true" />
              <span>SQLite storage can be added from the Tauri side next.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
