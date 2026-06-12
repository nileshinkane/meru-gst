import Database from "@tauri-apps/plugin-sql";

export const MERU_DATABASE_URL = "sqlite:meru-gst.db";

let databasePromise: Promise<Database> | undefined;

export function getDatabase() {
  databasePromise ??= Database.load(MERU_DATABASE_URL).then(async (database) => {
    await database.execute("PRAGMA foreign_keys = ON");
    return database;
  });

  return databasePromise;
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
