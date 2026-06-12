import {
  Database,
  FileDown,
  FileText,
  Home,
  Moon,
  Pill,
  Plus,
  Printer,
  Settings,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@meru/ui/components/button";
import { ClipTabs } from "@meru/ui/components/clip-tabs";
import { Input } from "@meru/ui/components/input";

import {
  calculateLineAmount,
  calculateTotals,
  createDefaultInvoice,
  formatInvoiceDocument,
  type Invoice,
  type InvoiceLineItem,
  type PrintCharacterSet,
} from "@/lib/invoice-format";

type Page =
  | "home"
  | "customers"
  | "invoices"
  | "invoice-create"
  | "medicines"
  | "settings";
type InvoiceTab = "edit" | "preview";

const numericInvoiceFields = new Set<keyof Invoice>([
  "cartons",
  "cases",
  "freight",
]);
const numericLineFields = new Set<keyof InvoiceLineItem>([
  "mrp",
  "gstRate",
  "saleQty",
  "freeQty",
  "rate",
]);

const navItems: Array<{
  page: Page;
  label: string;
  icon: ReactNode;
}> = [
  { page: "home", label: "Home", icon: <Home aria-hidden="true" /> },
  { page: "customers", label: "Customers", icon: <Users aria-hidden="true" /> },
  {
    page: "invoices",
    label: "Invoices",
    icon: <FileText aria-hidden="true" />,
  },
  { page: "medicines", label: "Medicines", icon: <Pill aria-hidden="true" /> },
  {
    page: "settings",
    label: "Settings",
    icon: <Settings aria-hidden="true" />,
  },
];

function App() {
  const [page, setPage] = useState<Page>("home");
  const [isDark, setIsDark] = useState(false);
  const [invoiceTab, setInvoiceTab] = useState<InvoiceTab>("edit");
  const [invoice, setInvoice] = useState(createDefaultInvoice);
  const [characterSet, setCharacterSet] = useState<PrintCharacterSet>("box");
  const [copies, setCopies] = useState(2);

  const totals = useMemo(() => calculateTotals(invoice), [invoice]);
  const printText = useMemo(
    () => formatInvoiceDocument(invoice, { characterSet, copies }),
    [characterSet, copies, invoice],
  );

  function openCreateInvoice() {
    setPage("invoice-create");
    setInvoiceTab("edit");
  }

  function updateInvoiceField(field: keyof Invoice, value: string) {
    setInvoice((current) => ({
      ...current,
      [field]: numericInvoiceFields.has(field) ? numberValue(value) : value,
    }));
  }

  function updateLineItem(
    id: string,
    field: keyof InvoiceLineItem,
    value: string,
  ) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: numericLineFields.has(field)
                ? numberValue(value)
                : value,
            }
          : item,
      ),
    }));
  }

  function addLineItem() {
    setInvoice((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `line-${Date.now()}`,
          mrp: 0,
          product: "",
          hsn: "",
          gstRate: 5,
          pack: "",
          batch: "",
          expiry: "",
          manufacturer: "",
          saleQty: 1,
          freeQty: 0,
          rate: 0,
        },
      ],
    }));
  }

  function removeLineItem(id: string) {
    setInvoice((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((item) => item.id !== id),
    }));
  }

  function printInvoice() {
    window.print();
  }

  const pageTitle =
    page === "invoice-create"
      ? "Create Invoice"
      : (navItems.find((item) => item.page === page)?.label ?? "Home");

  return (
    <main
      className={`workspace-shell grid min-h-screen grid-cols-[240px_minmax(0,1fr)] bg-background text-foreground ${
        isDark ? "dark" : ""
      }`}
    >
      <Sidebar
        page={page}
        setPage={setPage}
        openCreateInvoice={openCreateInvoice}
      />

      <section className="min-w-0">
        <header className="appbar flex h-14 items-center justify-between border-b bg-background px-5">
          <div>
            <h1 className="text-base font-semibold">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground">MERU GST desktop</p>
          </div>
          <button
            type="button"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsDark((current) => !current)}
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </button>
        </header>

        <div className="p-5">
          {page === "home" ? (
            <HomePage openCreateInvoice={openCreateInvoice} />
          ) : null}
          {page === "invoice-create" ? (
            <CreateInvoicePage
              invoice={invoice}
              invoiceTab={invoiceTab}
              setInvoiceTab={setInvoiceTab}
              characterSet={characterSet}
              copies={copies}
              totals={totals}
              printText={printText}
              setCharacterSet={setCharacterSet}
              setCopies={setCopies}
              updateInvoiceField={updateInvoiceField}
              updateLineItem={updateLineItem}
              addLineItem={addLineItem}
              removeLineItem={removeLineItem}
              printInvoice={printInvoice}
            />
          ) : null}
          {page === "invoices" ? (
            <EmptyPage
              title="Invoices"
              actionLabel="Create new invoice"
              onAction={openCreateInvoice}
            />
          ) : null}
          {page === "customers" ? <EmptyPage title="Customers" /> : null}
          {page === "medicines" ? <EmptyPage title="Medicines" /> : null}
          {page === "settings" ? <EmptyPage title="Settings" /> : null}
        </div>
      </section>
    </main>
  );
}

function Sidebar({
  page,
  setPage,
  openCreateInvoice,
}: {
  page: Page;
  setPage: (page: Page) => void;
  openCreateInvoice: () => void;
}) {
  return (
    <aside className="app-sidebar border-r bg-muted/30 px-4 py-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Database className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-none">MERU GST</h2>
          <p className="mt-1 text-xs text-muted-foreground">Desktop ledger</p>
        </div>
      </div>

      <nav className="mt-8 grid gap-1 text-sm">
        {navItems.map((item) => (
          <button
            key={item.page}
            type="button"
            className={
              page === item.page
                ? "flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-left text-primary-foreground"
                : "flex h-9 items-center gap-2 rounded-md px-3 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            }
            onClick={() => setPage(item.page)}
          >
            <span className="[&_svg]:size-4">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 rounded-md border bg-background p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FileText className="size-4" aria-hidden="true" />
          Invoices
        </div>
        <Button className="mt-3 w-full" size="sm" onClick={openCreateInvoice}>
          <Plus aria-hidden="true" />
          Create Invoice
        </Button>
      </div>
    </aside>
  );
}

function HomePage({ openCreateInvoice }: { openCreateInvoice: () => void }) {
  return (
    <section className="home-page min-h-[calc(100vh-96px)]">
      <Button onClick={openCreateInvoice}>
        <Plus aria-hidden="true" />
        Create Invoice
      </Button>
    </section>
  );
}

function EmptyPage({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="min-h-[calc(100vh-96px)] rounded-lg border border-dashed bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspace coming next.
          </p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction}>
            <Plus aria-hidden="true" />
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function CreateInvoicePage({
  invoice,
  invoiceTab,
  setInvoiceTab,
  characterSet,
  copies,
  totals,
  printText,
  setCharacterSet,
  setCopies,
  updateInvoiceField,
  updateLineItem,
  addLineItem,
  removeLineItem,
  printInvoice,
}: {
  invoice: Invoice;
  invoiceTab: InvoiceTab;
  setInvoiceTab: (tab: InvoiceTab) => void;
  characterSet: PrintCharacterSet;
  copies: number;
  totals: ReturnType<typeof calculateTotals>;
  printText: string;
  setCharacterSet: (characterSet: PrintCharacterSet) => void;
  setCopies: (copies: number) => void;
  updateInvoiceField: (field: keyof Invoice, value: string) => void;
  updateLineItem: (
    id: string,
    field: keyof InvoiceLineItem,
    value: string,
  ) => void;
  addLineItem: () => void;
  removeLineItem: (id: string) => void;
  printInvoice: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="editor-pane flex items-center justify-between gap-3">
        <ClipTabs
          tabs={[
            { name: "Edit", value: "edit" },
            { name: "Preview", value: "preview" },
          ]}
          value={invoiceTab}
          onValueChange={(value) => setInvoiceTab(value as InvoiceTab)}
        />
      </div>

      {invoiceTab === "edit" ? (
        <InvoiceEditor
          invoice={invoice}
          totals={totals}
          updateInvoiceField={updateInvoiceField}
          updateLineItem={updateLineItem}
          addLineItem={addLineItem}
          removeLineItem={removeLineItem}
        />
      ) : (
        <InvoicePreview
          characterSet={characterSet}
          copies={copies}
          printText={printText}
          setCharacterSet={setCharacterSet}
          setCopies={setCopies}
          printInvoice={printInvoice}
        />
      )}
    </section>
  );
}

function InvoiceEditor({
  invoice,
  totals,
  updateInvoiceField,
  updateLineItem,
  addLineItem,
  removeLineItem,
}: {
  invoice: Invoice;
  totals: ReturnType<typeof calculateTotals>;
  updateInvoiceField: (field: keyof Invoice, value: string) => void;
  updateLineItem: (
    id: string,
    field: keyof InvoiceLineItem,
    value: string,
  ) => void;
  addLineItem: () => void;
  removeLineItem: (id: string) => void;
}) {
  return (
    <section className="editor-pane space-y-5">
      <div className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-4">
        <Field
          label="Invoice No."
          value={invoice.invoiceNumber}
          onChange={(value) => updateInvoiceField("invoiceNumber", value)}
        />
        <Field
          label="Date"
          value={invoice.invoiceDate}
          onChange={(value) => updateInvoiceField("invoiceDate", value)}
        />
        <Field
          label="Due Date"
          value={invoice.dueDate}
          onChange={(value) => updateInvoiceField("dueDate", value)}
        />
        <Field
          label="Type"
          value={invoice.invoiceType}
          onChange={(value) => updateInvoiceField("invoiceType", value)}
        />
      </div>

      <div className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Customer</h2>
          <Field
            label="Name"
            value={invoice.customerName}
            onChange={(value) => updateInvoiceField("customerName", value)}
          />
          <Field
            label="Address"
            value={invoice.customerAddress}
            onChange={(value) => updateInvoiceField("customerAddress", value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="GST No."
              value={invoice.customerGstin}
              onChange={(value) => updateInvoiceField("customerGstin", value)}
            />
            <Field
              label="D.L. No."
              value={invoice.customerDrugLicense}
              onChange={(value) =>
                updateInvoiceField("customerDrugLicense", value)
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Dispatch</h2>
          <Field
            label="Transport"
            value={invoice.transport}
            onChange={(value) => updateInvoiceField("transport", value)}
          />
          <div className="grid gap-3 sm:grid-cols-4">
            <Field
              label="Cartons"
              value={invoice.cartons}
              type="number"
              onChange={(value) => updateInvoiceField("cartons", value)}
            />
            <Field
              label="C/B"
              value={invoice.cases}
              type="number"
              onChange={(value) => updateInvoiceField("cases", value)}
            />
            <Field
              label="LR No."
              value={invoice.lrNumber}
              onChange={(value) => updateInvoiceField("lrNumber", value)}
            />
            <Field
              label="Freight"
              value={invoice.freight}
              type="number"
              onChange={(value) => updateInvoiceField("freight", value)}
            />
          </div>
        </div>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Line Items</h2>
          <Button size="sm" onClick={addLineItem}>
            <Plus aria-hidden="true" />
            Add item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:border-b [&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th className="w-20">M.R.P.</th>
                <th>Product</th>
                <th className="w-20">HSN</th>
                <th className="w-16">GST %</th>
                <th className="w-24">Pack</th>
                <th className="w-32">Batch</th>
                <th className="w-20">Exp.</th>
                <th className="w-24">Mfgr.</th>
                <th className="w-20">Sale</th>
                <th className="w-20">Free</th>
                <th className="w-24">Rate</th>
                <th className="w-24 text-right">Amount</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr
                  key={item.id}
                  className="[&>td]:border-b [&>td]:px-2 [&>td]:py-2"
                >
                  <td>
                    <Input
                      value={item.mrp}
                      type="number"
                      onChange={(event) =>
                        updateLineItem(item.id, "mrp", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.product}
                      onChange={(event) =>
                        updateLineItem(item.id, "product", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.hsn}
                      onChange={(event) =>
                        updateLineItem(item.id, "hsn", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.gstRate}
                      type="number"
                      onChange={(event) =>
                        updateLineItem(item.id, "gstRate", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.pack}
                      onChange={(event) =>
                        updateLineItem(item.id, "pack", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.batch}
                      onChange={(event) =>
                        updateLineItem(item.id, "batch", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.expiry}
                      onChange={(event) =>
                        updateLineItem(item.id, "expiry", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.manufacturer}
                      onChange={(event) =>
                        updateLineItem(
                          item.id,
                          "manufacturer",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.saleQty}
                      type="number"
                      onChange={(event) =>
                        updateLineItem(item.id, "saleQty", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.freeQty}
                      type="number"
                      onChange={(event) =>
                        updateLineItem(item.id, "freeQty", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <Input
                      value={item.rate}
                      type="number"
                      onChange={(event) =>
                        updateLineItem(item.id, "rate", event.target.value)
                      }
                    />
                  </td>
                  <td className="text-right tabular-nums">
                    {calculateLineAmount(item).toFixed(2)}
                  </td>
                  <td>
                    <Button
                      aria-label="Remove item"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Metric label="Taxable" value={totals.taxableAmount} />
        <Metric label="CGST" value={totals.cgst} />
        <Metric label="SGST" value={totals.sgst} />
        <Metric label="Net Amount" value={totals.netAmount} strong />
      </div>
    </section>
  );
}

function InvoicePreview({
  characterSet,
  copies,
  printText,
  setCharacterSet,
  setCopies,
  printInvoice,
}: {
  characterSet: PrintCharacterSet;
  copies: number;
  printText: string;
  setCharacterSet: (characterSet: PrintCharacterSet) => void;
  setCopies: (copies: number) => void;
  printInvoice: () => void;
}) {
  return (
    <section id="print-root" className="print-pane min-w-0 space-y-3">
      <div className="print-actions rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedButton
              active={characterSet === "box"}
              onClick={() => setCharacterSet("box")}
            >
              Box drawing
            </SegmentedButton>
            <SegmentedButton
              active={characterSet === "ascii"}
              onClick={() => setCharacterSet("ascii")}
            >
              ASCII safe
            </SegmentedButton>
            <SegmentedButton active={copies === 1} onClick={() => setCopies(1)}>
              1 copy
            </SegmentedButton>
            <SegmentedButton active={copies === 2} onClick={() => setCopies(2)}>
              2 copies
            </SegmentedButton>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={printInvoice}>
              <Printer aria-hidden="true" />
              Print
            </Button>
            <Button onClick={printInvoice}>
              <FileDown aria-hidden="true" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="invoice-print-page overflow-auto rounded-lg border bg-white p-4 text-black shadow-sm">
        <pre className="invoice-print-text">{printText}</pre>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          strong ? "mt-1 text-xl font-semibold" : "mt-1 text-lg font-medium"
        }
      >
        Rs. {value.toFixed(2)}
      </p>
    </div>
  );
}

function SegmentedButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground"
          : "h-8 rounded-md border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default App;
