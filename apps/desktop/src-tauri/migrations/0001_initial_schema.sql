PRAGMA foreign_keys = ON;

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  drug_license TEXT NOT NULL DEFAULT '',
  fssai_no TEXT NOT NULL DEFAULT '',
  jurisdiction TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transporters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  drug_license TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  default_transport_id TEXT REFERENCES transporters(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manufacturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, code)
);

CREATE TABLE medicines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hsn_code TEXT NOT NULL DEFAULT '',
  gst_rate REAL NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  default_pack TEXT NOT NULL DEFAULT '',
  manufacturer_id TEXT REFERENCES manufacturers(id),
  default_mrp REAL NOT NULL DEFAULT 0 CHECK (default_mrp >= 0),
  default_sale_rate REAL NOT NULL DEFAULT 0 CHECK (default_sale_rate >= 0),
  schedule TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medicine_batches (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year INTEGER,
  mrp REAL NOT NULL DEFAULT 0 CHECK (mrp >= 0),
  sale_rate REAL NOT NULL DEFAULT 0 CHECK (sale_rate >= 0),
  stock_qty REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(medicine_id, batch_no)
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  invoice_number TEXT NOT NULL,
  financial_year TEXT NOT NULL DEFAULT '',
  invoice_type TEXT NOT NULL DEFAULT 'CREDIT',
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'posted', 'cancelled')),
  dm_no TEXT NOT NULL DEFAULT '',
  dm_date TEXT,
  seller_name_snapshot TEXT NOT NULL DEFAULT '',
  seller_address_snapshot TEXT NOT NULL DEFAULT '',
  seller_gstin_snapshot TEXT NOT NULL DEFAULT '',
  seller_drug_license_snapshot TEXT NOT NULL DEFAULT '',
  seller_fssai_snapshot TEXT NOT NULL DEFAULT '',
  customer_name_snapshot TEXT NOT NULL DEFAULT '',
  customer_address_snapshot TEXT NOT NULL DEFAULT '',
  customer_gstin_snapshot TEXT NOT NULL DEFAULT '',
  customer_drug_license_snapshot TEXT NOT NULL DEFAULT '',
  transport_id TEXT REFERENCES transporters(id),
  transport_name_snapshot TEXT NOT NULL DEFAULT '',
  cartons INTEGER NOT NULL DEFAULT 0 CHECK (cartons >= 0),
  cases_bales INTEGER NOT NULL DEFAULT 0 CHECK (cases_bales >= 0),
  lr_no TEXT NOT NULL DEFAULT '',
  lr_date TEXT,
  taxable_amount REAL NOT NULL DEFAULT 0,
  cgst_amount REAL NOT NULL DEFAULT 0,
  sgst_amount REAL NOT NULL DEFAULT 0,
  freight_adjustment_amount REAL NOT NULL DEFAULT 0,
  round_off_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL DEFAULT 0,
  amount_in_words TEXT NOT NULL DEFAULT '',
  print_profile TEXT NOT NULL DEFAULT 'dot_matrix_box',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, invoice_number, financial_year)
);

CREATE TABLE invoice_line_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  medicine_id TEXT REFERENCES medicines(id),
  batch_id TEXT REFERENCES medicine_batches(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  mrp REAL NOT NULL DEFAULT 0,
  product_name_snapshot TEXT NOT NULL,
  hsn_code_snapshot TEXT NOT NULL DEFAULT '',
  gst_rate REAL NOT NULL DEFAULT 0,
  pack_snapshot TEXT NOT NULL DEFAULT '',
  batch_no_snapshot TEXT NOT NULL DEFAULT '',
  expiry_month INTEGER CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year INTEGER,
  manufacturer_name_snapshot TEXT NOT NULL DEFAULT '',
  sale_qty REAL NOT NULL DEFAULT 0,
  free_qty REAL NOT NULL DEFAULT 0,
  rate REAL NOT NULL DEFAULT 0,
  line_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_tax_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  gst_rate REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  cgst_rate REAL NOT NULL DEFAULT 0,
  cgst_amount REAL NOT NULL DEFAULT 0,
  sgst_rate REAL NOT NULL DEFAULT 0,
  sgst_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(invoice_id, gst_rate)
);

CREATE TABLE invoice_print_settings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  page_size TEXT NOT NULL DEFAULT 'A4',
  copies_per_page INTEGER NOT NULL DEFAULT 2 CHECK (copies_per_page IN (1, 2)),
  character_set TEXT NOT NULL DEFAULT 'box'
    CHECK (character_set IN ('box', 'ascii')),
  font_family TEXT NOT NULL DEFAULT 'Courier New',
  font_size_pt REAL NOT NULL DEFAULT 8.2,
  line_height REAL NOT NULL DEFAULT 1.04,
  margin_top_mm REAL NOT NULL DEFAULT 8,
  margin_right_mm REAL NOT NULL DEFAULT 8,
  margin_bottom_mm REAL NOT NULL DEFAULT 8,
  margin_left_mm REAL NOT NULL DEFAULT 8,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name COLLATE NOCASE);
CREATE INDEX idx_customers_gstin ON customers(gstin COLLATE NOCASE);
CREATE INDEX idx_medicines_name ON medicines(name COLLATE NOCASE);
CREATE INDEX idx_medicines_hsn ON medicines(hsn_code COLLATE NOCASE);
CREATE INDEX idx_batches_batch_no ON medicine_batches(batch_no COLLATE NOCASE);
CREATE INDEX idx_invoices_number ON invoices(invoice_number COLLATE NOCASE);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id, sort_order);
CREATE INDEX idx_invoice_line_items_medicine ON invoice_line_items(medicine_id);

CREATE VIEW customer_search AS
SELECT
  customers.id,
  customers.name,
  trim(
    customers.name || ' ' ||
    customers.address_line1 || ' ' ||
    customers.address_line2 || ' ' ||
    customers.city || ' ' ||
    customers.district || ' ' ||
    customers.gstin || ' ' ||
    customers.drug_license || ' ' ||
    coalesce(transporters.name, '')
  ) AS search_text
FROM customers
LEFT JOIN transporters ON transporters.id = customers.default_transport_id;

CREATE VIEW medicine_search AS
SELECT
  medicines.id,
  medicines.name,
  trim(
    medicines.name || ' ' ||
    medicines.hsn_code || ' ' ||
    medicines.default_pack || ' ' ||
    coalesce(manufacturers.name, '') || ' ' ||
    coalesce(manufacturers.code, '')
  ) AS search_text
FROM medicines
LEFT JOIN manufacturers ON manufacturers.id = medicines.manufacturer_id;

CREATE VIEW invoice_search AS
SELECT
  invoices.id,
  invoices.invoice_number,
  trim(
    invoices.invoice_number || ' ' ||
    invoices.financial_year || ' ' ||
    invoices.invoice_type || ' ' ||
    invoices.customer_name_snapshot || ' ' ||
    invoices.customer_address_snapshot || ' ' ||
    invoices.customer_gstin_snapshot || ' ' ||
    invoices.customer_drug_license_snapshot || ' ' ||
    invoices.transport_name_snapshot || ' ' ||
    group_concat(invoice_line_items.product_name_snapshot, ' ')
  ) AS search_text
FROM invoices
LEFT JOIN invoice_line_items ON invoice_line_items.invoice_id = invoices.id
GROUP BY invoices.id;
