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

export type CurrentOrgProfile = {
  company_id: string | null;
  org_owner_first_name: string;
  org_owner_last_name: string;
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  gstin: string;
  drug_license: string;
  fssai_no: string;
  jurisdiction: string;
  terms: string;
  updated_at: string;
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

export async function getCurrentOrgProfile(): Promise<CurrentOrgProfile> {
  const database = await getDatabase();

  const currentOrg = await database.select<CurrentOrgProfile[]>(
    `
      SELECT
        current_org.company_id,
        current_org.org_owner_first_name,
        current_org.org_owner_last_name,
        coalesce(companies.name, '') AS name,
        coalesce(companies.address_line1, '') AS address_line1,
        coalesce(companies.address_line2, '') AS address_line2,
        coalesce(companies.city, '') AS city,
        coalesce(companies.state, '') AS state,
        coalesce(companies.pincode, '') AS pincode,
        coalesce(companies.phone, '') AS phone,
        coalesce(companies.gstin, '') AS gstin,
        coalesce(companies.drug_license, '') AS drug_license,
        coalesce(companies.fssai_no, '') AS fssai_no,
        coalesce(companies.jurisdiction, '') AS jurisdiction,
        coalesce(companies.terms, '') AS terms,
        current_org.updated_at
      FROM current_org
      LEFT JOIN companies ON companies.id = current_org.company_id
      WHERE current_org.id = 'current'
      LIMIT 1
    `,
  );

  if (currentOrg[0]) return currentOrg[0];

  const defaultCompany = await database.select<CurrentOrgProfile[]>(
    `
      SELECT
        companies.id AS company_id,
        '' AS org_owner_first_name,
        '' AS org_owner_last_name,
        companies.name,
        companies.address_line1,
        companies.address_line2,
        companies.city,
        companies.state,
        companies.pincode,
        companies.phone,
        companies.gstin,
        companies.drug_license,
        companies.fssai_no,
        companies.jurisdiction,
        companies.terms,
        companies.updated_at
      FROM companies
      ORDER BY
        CASE
          WHEN companies.id = (
            SELECT value
            FROM app_settings
            WHERE key = 'invoice.default_company_id'
          )
          THEN 0
          ELSE 1
        END,
        companies.name COLLATE NOCASE
      LIMIT 1
    `,
  );

  return defaultCompany[0] ?? createEmptyCurrentOrgProfile();
}

export async function upsertCurrentOrgProfile(input: CurrentOrgProfile) {
  const database = await getDatabase();
  const normalized = normalizeCurrentOrgProfile(input);
  const hasCompanyDetails = [
    normalized.name,
    normalized.address_line1,
    normalized.address_line2,
    normalized.city,
    normalized.state,
    normalized.pincode,
    normalized.phone,
    normalized.gstin,
    normalized.drug_license,
    normalized.fssai_no,
    normalized.jurisdiction,
    normalized.terms,
  ].some(Boolean);
  let companyId = normalized.company_id || null;

  if (hasCompanyDetails && !normalized.name) {
    throw new Error("Organization name is required before saving company details.");
  }

  if (hasCompanyDetails) {
    companyId ??= createEntityId("company", normalized.name);

    await database.execute(
      `
        INSERT INTO companies (
          id,
          name,
          address_line1,
          address_line2,
          city,
          state,
          pincode,
          phone,
          gstin,
          drug_license,
          fssai_no,
          jurisdiction,
          terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          address_line1 = excluded.address_line1,
          address_line2 = excluded.address_line2,
          city = excluded.city,
          state = excluded.state,
          pincode = excluded.pincode,
          phone = excluded.phone,
          gstin = excluded.gstin,
          drug_license = excluded.drug_license,
          fssai_no = excluded.fssai_no,
          jurisdiction = excluded.jurisdiction,
          terms = excluded.terms,
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        companyId,
        normalized.name,
        normalized.address_line1,
        normalized.address_line2,
        normalized.city,
        normalized.state,
        normalized.pincode,
        normalized.phone,
        normalized.gstin,
        normalized.drug_license,
        normalized.fssai_no,
        normalized.jurisdiction,
        normalized.terms,
      ],
    );

    await database.execute(
      `
        INSERT INTO app_settings (key, value)
        VALUES ('invoice.default_company_id', ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `,
      [companyId],
    );
  }

  await database.execute(
    `
      INSERT INTO current_org (
        id,
        company_id,
        org_owner_first_name,
        org_owner_last_name
      ) VALUES ('current', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company_id = excluded.company_id,
        org_owner_first_name = excluded.org_owner_first_name,
        org_owner_last_name = excluded.org_owner_last_name,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      companyId,
      normalized.org_owner_first_name,
      normalized.org_owner_last_name,
    ],
  );

  return companyId;
}

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

function createEmptyCurrentOrgProfile(): CurrentOrgProfile {
  return {
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
}

function normalizeCurrentOrgProfile(
  profile: CurrentOrgProfile,
): CurrentOrgProfile {
  return {
    company_id: profile.company_id?.trim() || null,
    org_owner_first_name: profile.org_owner_first_name.trim(),
    org_owner_last_name: profile.org_owner_last_name.trim(),
    name: profile.name.trim(),
    address_line1: profile.address_line1.trim(),
    address_line2: profile.address_line2.trim(),
    city: profile.city.trim(),
    state: profile.state.trim(),
    pincode: profile.pincode.trim(),
    phone: profile.phone.trim(),
    gstin: profile.gstin.trim(),
    drug_license: profile.drug_license.trim(),
    fssai_no: profile.fssai_no.trim(),
    jurisdiction: profile.jurisdiction.trim(),
    terms: profile.terms.trim(),
    updated_at: profile.updated_at,
  };
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
  "current_org",
  "companies",
  "invoice_print_settings",
  "app_settings",
];

const currentOrgSchemaSql = `
  CREATE TABLE IF NOT EXISTS current_org (
    id TEXT PRIMARY KEY NOT NULL CHECK (id = 'current'),
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    org_owner_first_name TEXT NOT NULL DEFAULT '',
    org_owner_last_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

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
    await ensureCurrentOrgTable(database);
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

  await ensureCurrentOrgTable(database);
}

async function ensureCurrentOrgTable(database: Database) {
  await database.execute(currentOrgSchemaSql);
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
