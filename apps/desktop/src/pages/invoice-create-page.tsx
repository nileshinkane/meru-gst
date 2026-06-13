import {
  Calendar as CalendarIcon,
  FileDown,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@meru/ui/components/button";
import { Calendar } from "@meru/ui/components/calendar";
import { ClipTabs } from "@meru/ui/components/clip-tabs";
import { Input } from "@meru/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@meru/ui/components/popover";
import { cn } from "@meru/ui/lib/utils";

import {
  calculateLineAmount,
  calculateTotals,
  createDefaultInvoice,
  formatInvoiceDocument,
  type Invoice,
  type InvoiceLineItem,
  type PrintCharacterSet,
} from "@/lib/invoice-format";

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
const invoiceDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const invoiceDateStartMonth = new Date(2000, 0, 1);
const invoiceDateEndMonth = new Date(2100, 11, 31);

export function InvoiceCreatePage() {
  const [invoiceTab, setInvoiceTab] = useState<InvoiceTab>("edit");
  const [invoice, setInvoice] = useState(createDefaultInvoice);
  const [characterSet, setCharacterSet] = useState<PrintCharacterSet>("box");

  const totals = useMemo(() => calculateTotals(invoice), [invoice]);
  const printText = useMemo(
    () => formatInvoiceDocument(invoice, { characterSet }),
    [characterSet, invoice],
  );

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
          printText={printText}
          setCharacterSet={setCharacterSet}
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
        <DateField
          label="Date"
          value={invoice.invoiceDate}
          onChange={(value) => updateInvoiceField("invoiceDate", value)}
        />
        <DateField
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
  printText,
  setCharacterSet,
  printInvoice,
}: {
  characterSet: PrintCharacterSet;
  printText: string;
  setCharacterSet: (characterSet: PrintCharacterSet) => void;
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseInvoiceDate(value);

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-empty={!selectedDate}
            className={cn(
              "h-8 w-full justify-start rounded-md px-2 text-left font-normal",
              !selectedDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon aria-hidden="true" />
            {selectedDate ? value : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            startMonth={invoiceDateStartMonth}
            endMonth={invoiceDateEndMonth}
            captionLayout="dropdown"
            navLayout="after"
            onSelect={(date) => {
              if (!date) {
                return;
              }

              onChange(formatInvoiceDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </label>
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

function parseInvoiceDate(value: string) {
  const match = invoiceDatePattern.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
}

function formatInvoiceDate(date: Date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
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
