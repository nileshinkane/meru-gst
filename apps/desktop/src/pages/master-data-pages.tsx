import {
  ArrowDownAZ,
  ArrowUpAZ,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@meru/ui/components/badge";
import { Button } from "@meru/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@meru/ui/components/dialog";
import {
  FormBuilder,
  type FormBuilderField,
  type FormBuilderSubmitResult,
} from "@meru/ui/components/form-builder";
import { Input } from "@meru/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@meru/ui/components/table";

import {
  listCustomers,
  listManufacturers,
  listMedicines,
  listTransporters,
  upsertCustomer,
  upsertMedicine,
  type CustomerListRow,
  type CustomerWriteInput,
  type ManufacturerOption,
  type MedicineListRow,
  type MedicineWriteInput,
  type TransporterOption,
} from "@/lib/database";

const NONE_VALUE = "__none__";

type SortDirection = "asc" | "desc";
type CustomerSortKey = "name" | "district" | "gstin" | "updated_at";
type MedicineSortKey =
  | "name"
  | "hsn_code"
  | "manufacturer_name"
  | "default_mrp"
  | "updated_at";
type ActiveFilter = "all" | "active" | "inactive";

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListRow[]>([]);
  const [transporters, setTransporters] = useState<TransporterOption[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<CustomerSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListRow | null>(
    null,
  );

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [customerRows, transporterRows] = await Promise.all([
        listCustomers(),
        listTransporters(),
      ]);
      setCustomers(customerRows);
      setTransporters(transporterRows);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleCustomers = useMemo(() => {
    const filtered = customers.filter((customer) =>
      matchesQuery(query, [
        customer.name,
        customer.address_line1,
        customer.address_line2,
        customer.city,
        customer.district,
        customer.state,
        customer.gstin,
        customer.drug_license,
        customer.phone,
        customer.default_transport_name,
      ]),
    );

    return filtered.sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        return (
          direction *
          compareText(left.updated_at, right.updated_at)
        );
      }

      return direction * compareText(left[sortKey], right[sortKey]);
    });
  }, [customers, query, sortDirection, sortKey]);

  function toggleSort(nextKey: CustomerSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function openNewCustomer() {
    setEditingCustomer(null);
    setDialogOpen(true);
  }

  function openEditCustomer(customer: CustomerListRow) {
    setEditingCustomer(customer);
    setDialogOpen(true);
  }

  return (
    <section className="min-h-[calc(100vh-96px)] space-y-4">
      <MasterPageHeader
        title="Customers"
        description="Customer master records read from the SQLite customer table."
        count={customers.length}
        actionLabel="Add customer"
        onAction={openNewCustomer}
      />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search name, GSTIN, license, town, transport..."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void loadData()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {error ? <InlineError>{error}</InlineError> : null}

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                active={sortKey === "name"}
                direction={sortDirection}
                onClick={() => toggleSort("name")}
              >
                Customer
              </SortableHead>
              <TableHead>Contact</TableHead>
              <SortableHead
                active={sortKey === "district"}
                direction={sortDirection}
                onClick={() => toggleSort("district")}
              >
                Location
              </SortableHead>
              <SortableHead
                active={sortKey === "gstin"}
                direction={sortDirection}
                onClick={() => toggleSort("gstin")}
              >
                GSTIN
              </SortableHead>
              <TableHead>Transport</TableHead>
              <SortableHead
                active={sortKey === "updated_at"}
                direction={sortDirection}
                onClick={() => toggleSort("updated_at")}
              >
                Updated
              </SortableHead>
              <TableHead className="w-16 text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {compactText([
                      customer.address_line1,
                      customer.address_line2,
                    ])}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{customer.phone || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    DL: {customer.drug_license || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{compactText([customer.city, customer.district]) || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {compactText([customer.state, customer.pincode]) || "-"}
                  </div>
                </TableCell>
                <TableCell>{customer.gstin || "-"}</TableCell>
                <TableCell>{customer.default_transport_name || "-"}</TableCell>
                <TableCell>{formatDateTime(customer.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${customer.name}`}
                    onClick={() => openEditCustomer(customer)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && visibleCustomers.length === 0 ? (
              <EmptyTableRow colSpan={7}>
                No customers match the current filters.
              </EmptyTableRow>
            ) : null}
            {isLoading ? (
              <EmptyTableRow colSpan={7}>Loading customers...</EmptyTableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog
        open={dialogOpen}
        customer={editingCustomer}
        transporters={transporters}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCustomer(null);
          }
        }}
        onSaved={loadData}
      />
    </section>
  );
}

export function MedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineListRow[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [sortKey, setSortKey] = useState<MedicineSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineListRow | null>(
    null,
  );

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [medicineRows, manufacturerRows] = await Promise.all([
        listMedicines(),
        listManufacturers(),
      ]);
      setMedicines(medicineRows);
      setManufacturers(manufacturerRows);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const visibleMedicines = useMemo(() => {
    const filtered = medicines.filter((medicine) => {
      if (activeFilter === "active" && medicine.is_active !== 1) return false;
      if (activeFilter === "inactive" && medicine.is_active === 1) return false;

      return matchesQuery(query, [
        medicine.name,
        medicine.hsn_code,
        medicine.default_pack,
        medicine.manufacturer_name,
        medicine.manufacturer_code,
        medicine.schedule,
      ]);
    });

    return filtered.sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "default_mrp") {
        return direction * (left.default_mrp - right.default_mrp);
      }

      return direction * compareText(left[sortKey], right[sortKey]);
    });
  }, [activeFilter, medicines, query, sortDirection, sortKey]);

  function toggleSort(nextKey: MedicineSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function openNewMedicine() {
    setEditingMedicine(null);
    setDialogOpen(true);
  }

  function openEditMedicine(medicine: MedicineListRow) {
    setEditingMedicine(medicine);
    setDialogOpen(true);
  }

  return (
    <section className="min-h-[calc(100vh-96px)] space-y-4">
      <MasterPageHeader
        title="Medicines"
        description="Medicine master records with manufacturer and batch counts."
        count={medicines.length}
        actionLabel="Add medicine"
        onAction={openNewMedicine}
      />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <SearchBox
              value={query}
              onChange={setQuery}
              placeholder="Search name, HSN, pack, manufacturer..."
            />
            <SegmentedFilter
              value={activeFilter}
              onChange={setActiveFilter}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => void loadData()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {error ? <InlineError>{error}</InlineError> : null}

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                active={sortKey === "name"}
                direction={sortDirection}
                onClick={() => toggleSort("name")}
              >
                Medicine
              </SortableHead>
              <SortableHead
                active={sortKey === "hsn_code"}
                direction={sortDirection}
                onClick={() => toggleSort("hsn_code")}
              >
                HSN / GST
              </SortableHead>
              <TableHead>Pack</TableHead>
              <SortableHead
                active={sortKey === "manufacturer_name"}
                direction={sortDirection}
                onClick={() => toggleSort("manufacturer_name")}
              >
                Manufacturer
              </SortableHead>
              <SortableHead
                active={sortKey === "default_mrp"}
                direction={sortDirection}
                onClick={() => toggleSort("default_mrp")}
              >
                Pricing
              </SortableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Status</TableHead>
              <SortableHead
                active={sortKey === "updated_at"}
                direction={sortDirection}
                onClick={() => toggleSort("updated_at")}
              >
                Updated
              </SortableHead>
              <TableHead className="w-16 text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMedicines.map((medicine) => (
              <TableRow key={medicine.id}>
                <TableCell>
                  <div className="font-medium">{medicine.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Schedule: {medicine.schedule || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{medicine.hsn_code || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    GST {formatNumber(medicine.gst_rate)}%
                  </div>
                </TableCell>
                <TableCell>{medicine.default_pack || "-"}</TableCell>
                <TableCell>
                  <div>{medicine.manufacturer_name || "-"}</div>
                  <div className="text-xs text-muted-foreground">
                    {medicine.manufacturer_code || ""}
                  </div>
                </TableCell>
                <TableCell>
                  <div>MRP {formatCurrency(medicine.default_mrp)}</div>
                  <div className="text-xs text-muted-foreground">
                    Sale {formatCurrency(medicine.default_sale_rate)}
                  </div>
                </TableCell>
                <TableCell>{medicine.batch_count}</TableCell>
                <TableCell>
                  {medicine.is_active === 1 ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(medicine.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${medicine.name}`}
                    onClick={() => openEditMedicine(medicine)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && visibleMedicines.length === 0 ? (
              <EmptyTableRow colSpan={9}>
                No medicines match the current filters.
              </EmptyTableRow>
            ) : null}
            {isLoading ? (
              <EmptyTableRow colSpan={9}>Loading medicines...</EmptyTableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <MedicineFormDialog
        open={dialogOpen}
        medicine={editingMedicine}
        manufacturers={manufacturers}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingMedicine(null);
          }
        }}
        onSaved={loadData}
      />
    </section>
  );
}

function CustomerFormDialog({
  open,
  customer,
  transporters,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  customer: CustomerListRow | null;
  transporters: TransporterOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const fields = useMemo<FormBuilderField[]>(
    () => [
      {
        name: "name",
        type: "text",
        label: "Customer name",
        required: true,
        validation: { required: "Customer name is required." },
        className: "sm:col-span-2",
      },
      { name: "phone", type: "tel", label: "Phone" },
      { name: "gstin", type: "text", label: "GSTIN" },
      {
        name: "drug_license",
        type: "text",
        label: "Drug license",
        className: "sm:col-span-2",
      },
      {
        name: "address_line1",
        type: "text",
        label: "Address line 1",
        className: "sm:col-span-2",
      },
      {
        name: "address_line2",
        type: "text",
        label: "Address line 2",
        className: "sm:col-span-2",
      },
      { name: "city", type: "text", label: "City / Town" },
      { name: "district", type: "text", label: "District" },
      { name: "state", type: "text", label: "State" },
      { name: "pincode", type: "text", label: "Pincode" },
      {
        name: "default_transport_id",
        type: "select",
        label: "Default transport",
        defaultValue: NONE_VALUE,
        options: [
          { value: NONE_VALUE, label: "No default transport" },
          ...transporters.map((transporter) => ({
            value: transporter.id,
            label: transporter.name,
          })),
        ],
        className: "sm:col-span-2",
      },
      {
        name: "notes",
        type: "textarea",
        label: "Notes",
        className: "sm:col-span-2",
      },
    ],
    [transporters],
  );

  async function handleSubmit(
    values: Record<string, unknown>,
  ): Promise<FormBuilderSubmitResult> {
    try {
      await upsertCustomer(customerFormValues(values, customer?.id ?? ""));
      await onSaved();
      onOpenChange(false);
    } catch (submitError) {
      return { rootError: errorMessage(submitError) };
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>
            Customer data is saved to the SQLite customer master.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <FormBuilder
            key={customer?.id ?? "new-customer"}
            fields={fields}
            defaultValues={customerDefaultValues(customer)}
            fieldGroupClassName="grid gap-4 sm:grid-cols-2"
            submitLabel={customer ? "Save customer" : "Create customer"}
            onSubmit={handleSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MedicineFormDialog({
  open,
  medicine,
  manufacturers,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  medicine: MedicineListRow | null;
  manufacturers: ManufacturerOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const fields = useMemo<FormBuilderField[]>(
    () => [
      {
        name: "name",
        type: "text",
        label: "Medicine name",
        required: true,
        validation: { required: "Medicine name is required." },
        className: "sm:col-span-2",
      },
      { name: "hsn_code", type: "text", label: "HSN code" },
      {
        name: "gst_rate",
        type: "number",
        label: "GST %",
        min: 0,
        max: 100,
        step: 0.01,
        validation: { min: 0, max: 100 },
      },
      { name: "default_pack", type: "text", label: "Default pack" },
      {
        name: "manufacturer_id",
        type: "select",
        label: "Manufacturer",
        defaultValue: NONE_VALUE,
        options: [
          { value: NONE_VALUE, label: "No manufacturer" },
          ...manufacturers.map((manufacturer) => ({
            value: manufacturer.id,
            label: manufacturer.code
              ? `${manufacturer.name} (${manufacturer.code})`
              : manufacturer.name,
          })),
        ],
      },
      {
        name: "default_mrp",
        type: "number",
        label: "Default MRP",
        min: 0,
        step: 0.01,
        validation: { min: 0 },
      },
      {
        name: "default_sale_rate",
        type: "number",
        label: "Default sale rate",
        min: 0,
        step: 0.01,
        validation: { min: 0 },
      },
      { name: "schedule", type: "text", label: "Schedule" },
      {
        name: "is_active",
        type: "switch",
        label: "Active medicine",
        description: "Inactive medicines stay in history but can be filtered out.",
      },
      {
        name: "notes",
        type: "textarea",
        label: "Notes",
        className: "sm:col-span-2",
      },
    ],
    [manufacturers],
  );

  async function handleSubmit(
    values: Record<string, unknown>,
  ): Promise<FormBuilderSubmitResult> {
    try {
      await upsertMedicine(medicineFormValues(values, medicine?.id ?? ""));
      await onSaved();
      onOpenChange(false);
    } catch (submitError) {
      return { rootError: errorMessage(submitError) };
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit medicine" : "Add medicine"}</DialogTitle>
          <DialogDescription>
            Medicine defaults are used when invoice line items are created.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <FormBuilder
            key={medicine?.id ?? "new-medicine"}
            fields={fields}
            defaultValues={medicineDefaultValues(medicine)}
            fieldGroupClassName="grid gap-4 sm:grid-cols-2"
            submitLabel={medicine ? "Save medicine" : "Create medicine"}
            onSubmit={handleSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MasterPageHeader({
  title,
  description,
  count,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <Badge variant="outline">{count} records</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" onClick={onAction}>
        <Plus aria-hidden="true" />
        {actionLabel}
      </Button>
    </header>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative min-w-64 flex-1 sm:max-w-md">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        placeholder={placeholder}
        className="pl-8"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SortableHead({
  active,
  direction,
  children,
  onClick,
}: {
  active: boolean;
  direction: SortDirection;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium"
        onClick={onClick}
      >
        {children}
        {active && direction === "desc" ? (
          <ArrowDownAZ className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowUpAZ
            className={
              active
                ? "size-3.5"
                : "size-3.5 text-muted-foreground opacity-40"
            }
            aria-hidden="true"
          />
        )}
      </button>
    </TableHead>
  );
}

function SegmentedFilter<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="inline-flex h-8 rounded-md border bg-background p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            option.value === value
              ? "rounded-[5px] bg-primary px-2.5 text-xs font-medium text-primary-foreground"
              : "rounded-[5px] px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          }
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="border-b bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {children}
    </div>
  );
}

function EmptyTableRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

function customerDefaultValues(customer: CustomerListRow | null) {
  return {
    id: customer?.id ?? "",
    name: customer?.name ?? "",
    address_line1: customer?.address_line1 ?? "",
    address_line2: customer?.address_line2 ?? "",
    city: customer?.city ?? "",
    district: customer?.district ?? "",
    state: customer?.state ?? "",
    pincode: customer?.pincode ?? "",
    gstin: customer?.gstin ?? "",
    drug_license: customer?.drug_license ?? "",
    phone: customer?.phone ?? "",
    default_transport_id: customer?.default_transport_id ?? NONE_VALUE,
    notes: customer?.notes ?? "",
  };
}

function customerFormValues(
  values: Record<string, unknown>,
  id: string,
): CustomerWriteInput {
  return {
    id,
    name: textValue(values.name),
    address_line1: textValue(values.address_line1),
    address_line2: textValue(values.address_line2),
    city: textValue(values.city),
    district: textValue(values.district),
    state: textValue(values.state),
    pincode: textValue(values.pincode),
    gstin: textValue(values.gstin),
    drug_license: textValue(values.drug_license),
    phone: textValue(values.phone),
    default_transport_id: nullableId(values.default_transport_id),
    notes: textValue(values.notes),
  };
}

function medicineDefaultValues(medicine: MedicineListRow | null) {
  return {
    id: medicine?.id ?? "",
    name: medicine?.name ?? "",
    hsn_code: medicine?.hsn_code ?? "",
    gst_rate: medicine?.gst_rate ?? 0,
    default_pack: medicine?.default_pack ?? "",
    manufacturer_id: medicine?.manufacturer_id ?? NONE_VALUE,
    default_mrp: medicine?.default_mrp ?? 0,
    default_sale_rate: medicine?.default_sale_rate ?? 0,
    schedule: medicine?.schedule ?? "",
    notes: medicine?.notes ?? "",
    is_active: medicine ? medicine.is_active === 1 : true,
  };
}

function medicineFormValues(
  values: Record<string, unknown>,
  id: string,
): MedicineWriteInput {
  return {
    id,
    name: textValue(values.name),
    hsn_code: textValue(values.hsn_code),
    gst_rate: numberValue(values.gst_rate),
    default_pack: textValue(values.default_pack),
    manufacturer_id: nullableId(values.manufacturer_id),
    default_mrp: numberValue(values.default_mrp),
    default_sale_rate: numberValue(values.default_sale_rate),
    schedule: textValue(values.schedule),
    notes: textValue(values.notes),
    is_active: booleanValue(values.is_active) ? 1 : 0,
  };
}

function matchesQuery(query: string, parts: Array<string | number | null>) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const haystack = parts
    .filter((part) => part !== null && part !== undefined)
    .join(" ")
    .toLowerCase();

  return trimmed
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

function compareText(left: string | number | null, right: string | number | null) {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function textValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanValue(value: unknown) {
  return value === true;
}

function nullableId(value: unknown) {
  const text = textValue(value);
  return text && text !== NONE_VALUE ? text : null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
