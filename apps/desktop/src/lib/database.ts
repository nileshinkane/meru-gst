import { isTauri } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

import initialSchemaSql from "../../src-tauri/migrations/0001_initial_schema.sql?raw";

export const MERU_DATABASE_URL = "sqlite:meru-gst.db";

let databasePromise: Promise<Database> | undefined;

export function getDatabase() {
  assertTauriDatabaseAvailable();

  databasePromise ??= Database.load(MERU_DATABASE_URL).then(async (database) => {
    await database.execute("PRAGMA foreign_keys = ON");
    await ensureDatabaseSchema(database);
    return database;
  });

  return databasePromise;
}

export function canUseTauriDatabase() {
  return isTauri();
}

export async function closeDatabaseConnection() {
  if (!databasePromise) return;

  const database = await databasePromise;
  await database.close(MERU_DATABASE_URL);
  databasePromise = undefined;
}

export async function resetAndSeedDatabase(sql: string) {
  const database = await getDatabase();
  const statements = splitSqlStatements(sql);

  await database.execute("PRAGMA foreign_keys = OFF");
  await database.execute("BEGIN");

  try {
    for (const table of resettableTables) {
      await database.execute(`DELETE FROM ${table}`);
    }

    for (const statement of statements) {
      await database.execute(statement);
    }

    await database.execute("COMMIT");
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  } finally {
    await database.execute("PRAGMA foreign_keys = ON");
  }
}

export type SearchEntityType = "customer" | "medicine" | "invoice";

export type SearchResult = {
  entity_type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string;
};

export async function searchMeruData(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const database = await getDatabase();
  const pattern = `%${trimmed}%`;

  return database.select<SearchResult[]>(
    `
      SELECT 'customer' AS entity_type, id, name AS title, search_text AS subtitle
      FROM customer_search
      WHERE search_text LIKE ? COLLATE NOCASE
      UNION ALL
      SELECT 'medicine' AS entity_type, id, name AS title, search_text AS subtitle
      FROM medicine_search
      WHERE search_text LIKE ? COLLATE NOCASE
      UNION ALL
      SELECT 'invoice' AS entity_type, id, invoice_number AS title, search_text AS subtitle
      FROM invoice_search
      WHERE search_text LIKE ? COLLATE NOCASE
      ORDER BY entity_type, title
      LIMIT 50
    `,
    [pattern, pattern, pattern],
  );
}

export type InvoiceListRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name_snapshot: string;
  net_amount: number;
  status: string;
};

export async function listInvoices() {
  const database = await getDatabase();

  return database.select<InvoiceListRow[]>(
    `
      SELECT
        id,
        invoice_number,
        invoice_date,
        customer_name_snapshot,
        net_amount,
        status
      FROM invoices
      ORDER BY invoice_date DESC, invoice_number DESC
    `,
  );
}

export type TransporterOption = {
  id: string;
  name: string;
};

export type ManufacturerOption = {
  id: string;
  name: string;
  code: string;
};

export type CustomerListRow = {
  id: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  gstin: string;
  drug_license: string;
  phone: string;
  default_transport_id: string | null;
  default_transport_name: string;
  notes: string;
  updated_at: string;
};

export type CustomerWriteInput = Omit<
  CustomerListRow,
  "default_transport_name" | "updated_at"
>;

export type MedicineListRow = {
  id: string;
  name: string;
  hsn_code: string;
  gst_rate: number;
  default_pack: string;
  manufacturer_id: string | null;
  manufacturer_name: string;
  manufacturer_code: string;
  default_mrp: number;
  default_sale_rate: number;
  schedule: string;
  notes: string;
  is_active: number;
  batch_count: number;
  updated_at: string;
};

export type MedicineWriteInput = Omit<
  MedicineListRow,
  "batch_count" | "manufacturer_code" | "manufacturer_name" | "updated_at"
>;

export async function listCustomers() {
  const database = await getDatabase();

  return database.select<CustomerListRow[]>(
    `
      SELECT
        customers.id,
        customers.name,
        customers.address_line1,
        customers.address_line2,
        customers.city,
        customers.district,
        customers.state,
        customers.pincode,
        customers.gstin,
        customers.drug_license,
        customers.phone,
        customers.default_transport_id,
        coalesce(transporters.name, '') AS default_transport_name,
        customers.notes,
        customers.updated_at
      FROM customers
      LEFT JOIN transporters ON transporters.id = customers.default_transport_id
      ORDER BY customers.name COLLATE NOCASE
    `,
  );
}

export async function listTransporters() {
  const database = await getDatabase();

  return database.select<TransporterOption[]>(
    `
      SELECT id, name
      FROM transporters
      ORDER BY name COLLATE NOCASE
    `,
  );
}

export async function upsertCustomer(input: CustomerWriteInput) {
  const database = await getDatabase();
  const id = input.id || createEntityId("customer", input.name);

  await database.execute(
    `
      INSERT INTO customers (
        id,
        name,
        address_line1,
        address_line2,
        city,
        district,
        state,
        pincode,
        gstin,
        drug_license,
        phone,
        default_transport_id,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        address_line1 = excluded.address_line1,
        address_line2 = excluded.address_line2,
        city = excluded.city,
        district = excluded.district,
        state = excluded.state,
        pincode = excluded.pincode,
        gstin = excluded.gstin,
        drug_license = excluded.drug_license,
        phone = excluded.phone,
        default_transport_id = excluded.default_transport_id,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      id,
      input.name,
      input.address_line1,
      input.address_line2,
      input.city,
      input.district,
      input.state,
      input.pincode,
      input.gstin,
      input.drug_license,
      input.phone,
      input.default_transport_id,
      input.notes,
    ],
  );

  return id;
}

export async function listMedicines() {
  const database = await getDatabase();

  return database.select<MedicineListRow[]>(
    `
      SELECT
        medicines.id,
        medicines.name,
        medicines.hsn_code,
        medicines.gst_rate,
        medicines.default_pack,
        medicines.manufacturer_id,
        coalesce(manufacturers.name, '') AS manufacturer_name,
        coalesce(manufacturers.code, '') AS manufacturer_code,
        medicines.default_mrp,
        medicines.default_sale_rate,
        medicines.schedule,
        medicines.notes,
        medicines.is_active,
        count(medicine_batches.id) AS batch_count,
        medicines.updated_at
      FROM medicines
      LEFT JOIN manufacturers ON manufacturers.id = medicines.manufacturer_id
      LEFT JOIN medicine_batches ON medicine_batches.medicine_id = medicines.id
      GROUP BY medicines.id
      ORDER BY medicines.name COLLATE NOCASE
    `,
  );
}

export async function listManufacturers() {
  const database = await getDatabase();

  return database.select<ManufacturerOption[]>(
    `
      SELECT id, name, code
      FROM manufacturers
      ORDER BY name COLLATE NOCASE, code COLLATE NOCASE
    `,
  );
}

export async function upsertMedicine(input: MedicineWriteInput) {
  const database = await getDatabase();
  const id = input.id || createEntityId("medicine", input.name);

  await database.execute(
    `
      INSERT INTO medicines (
        id,
        name,
        hsn_code,
        gst_rate,
        default_pack,
        manufacturer_id,
        default_mrp,
        default_sale_rate,
        schedule,
        notes,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        hsn_code = excluded.hsn_code,
        gst_rate = excluded.gst_rate,
        default_pack = excluded.default_pack,
        manufacturer_id = excluded.manufacturer_id,
        default_mrp = excluded.default_mrp,
        default_sale_rate = excluded.default_sale_rate,
        schedule = excluded.schedule,
        notes = excluded.notes,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      id,
      input.name,
      input.hsn_code,
      input.gst_rate,
      input.default_pack,
      input.manufacturer_id,
      input.default_mrp,
      input.default_sale_rate,
      input.schedule,
      input.notes,
      input.is_active,
    ],
  );

  return id;
}

function createEntityId(prefix: string, name: string) {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "entry";
  const unique =
    globalThis.crypto?.randomUUID?.().split("-")[0] ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}-${slug}-${unique}`;
}

const resettableTables = [
  "invoice_tax_lines",
  "invoice_line_items",
  "invoices",
  "medicine_batches",
  "medicines",
  "manufacturers",
  "customers",
  "transporters",
  "companies",
  "invoice_print_settings",
  "app_settings",
];

async function ensureDatabaseSchema(database: Database) {
  const tables = await database.select<Array<{ name: string }>>(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'customers'
      LIMIT 1
    `,
  );

  if (tables.length > 0) {
    return;
  }

  await database.execute("PRAGMA foreign_keys = OFF");
  await database.execute("BEGIN");

  try {
    for (const statement of splitSqlStatements(initialSchemaSql)) {
      await database.execute(statement);
    }

    await database.execute("COMMIT");
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  } finally {
    await database.execute("PRAGMA foreign_keys = ON");
  }
}

function assertTauriDatabaseAvailable() {
  if (!canUseTauriDatabase()) {
    throw new Error(
      "Database access is available only inside the Tauri desktop app. Run `pnpm dev:desktop` for the real app, or use Settings inside the desktop window.",
    );
  }
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "-" && next === "-") {
      current += char;
      current += next;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "/" && next === "*") {
      current += char;
      current += next;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      current += char;
      if (inSingleQuote && next === "'") {
        current += next;
        index += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const finalStatement = current.trim();
  if (finalStatement) statements.push(finalStatement);

  return statements;
}
