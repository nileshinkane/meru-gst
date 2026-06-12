INSERT INTO companies (
  id, name, address_line1, city, state, pincode, phone, gstin,
  drug_license, fssai_no, jurisdiction, terms
) VALUES (
  'company-meru',
  'MERU PHARMACEUTICALS',
  '76, Ayodhya Nagar',
  'NAGPUR',
  'Maharashtra',
  '440024',
  '(0712) 744708',
  '27AACPI7993N1ZY',
  '20B-255760/2018, 21B-255761/2018',
  '21518260001528',
  'NAGPUR JURISDICTION',
  'All goods sold on non-returnable basis. 24% interest charged after due date.'
);

INSERT INTO transporters (id, name) VALUES
  ('transport-bramhapuri-roadlines', 'BRAMHAPURI ROADLINES'),
  ('transport-syndicate-garage', 'SYNDICATE GARAGE');

INSERT INTO customers (
  id, name, address_line1, district, gstin, drug_license, default_transport_id
) VALUES
  (
    'customer-tara-medicals',
    'TARA MEDICALS',
    'BRAMHAPURI',
    'CHANDRAPUR',
    '27AADFT3389G1ZW',
    '20-830,21-830',
    'transport-bramhapuri-roadlines'
  ),
  (
    'customer-shivkripa-medical-stores',
    'SHIVKRIPA MEDICAL STORES',
    'KIRMITI (MENDHA)',
    'CHANDRAPUR',
    '',
    '20-1178,21-1178',
    'transport-syndicate-garage'
  );

INSERT INTO manufacturers (id, name, code) VALUES
  ('manufacturer-orange', 'Orange', 'Orang'),
  ('manufacturer-yp', 'Y.P.', 'Y.P.'),
  ('manufacturer-bioco', 'Bioco', 'Bioco');

INSERT INTO medicines (
  id, name, hsn_code, gst_rate, default_pack, manufacturer_id, default_mrp, default_sale_rate
) VALUES
  ('medicine-lycorange-syrup', 'LYCORANGE SYRUP', '2106', 5, '200ml.', 'manufacturer-orange', 160.00, 126.98),
  ('medicine-aclopass-tab', 'ACLOPASS TAB.', '3004', 5, '10''TAB', 'manufacturer-yp', 59.05, 14.80),
  ('medicine-ketoven-plus-6', 'Ketoven-Plus 6', '3004', 5, '15 gms', 'manufacturer-yp', 112.50, 28.85),
  ('medicine-gimptino-m1', 'GIMPTINO-M1', '3004', 5, '15''Tab', 'manufacturer-yp', 109.00, 38.80),
  ('medicine-rabiyu-dsr', 'RABIYU-DSR.', '3004', 5, '10''CAP', 'manufacturer-yp', 89.00, 22.45),
  ('medicine-yupred-4', 'Yupred 4', '3004', 5, '10''TAB', 'manufacturer-yp', 56.25, 18.95),
  ('medicine-vengab-100-tab', 'Vengab-100 Tab.', '3004', 5, '100TAB', 'manufacturer-yp', 79.68, 17.60),
  ('medicine-pantro-d-tab', 'Pantro-D tab.', '3004', 5, '10''TAB', 'manufacturer-bioco', 83.00, 17.55);

INSERT INTO medicine_batches (
  id, medicine_id, batch_no, expiry_month, expiry_year, mrp, sale_rate
) VALUES
  ('batch-lycorange-fs-1437', 'medicine-lycorange-syrup', 'FS-1437', 10, 2027, 160.00, 126.98),
  ('batch-aclopass-yt250740b', 'medicine-aclopass-tab', 'YT250740B', 9, 2027, 59.05, 14.80),
  ('batch-ketoven-y227', 'medicine-ketoven-plus-6', 'Y227', 10, 2027, 112.50, 28.85),
  ('batch-gimptino-yt250934a', 'medicine-gimptino-m1', 'YT250934A', 11, 2027, 109.00, 38.80),
  ('batch-rabiyu-yc250226b', 'medicine-rabiyu-dsr', 'YC250226B', 1, 2028, 89.00, 22.45),
  ('batch-yupred-yt250696d', 'medicine-yupred-4', 'YT250696D', 9, 2027, 56.25, 18.95),
  ('batch-vengab-yt250435', 'medicine-vengab-100-tab', 'YT250435', 7, 2027, 79.68, 17.60),
  ('batch-pantro-bt25-577a', 'medicine-pantro-d-tab', 'BT25-577A', 1, 2028, 83.00, 17.55);

INSERT INTO invoices (
  id, company_id, customer_id, invoice_number, financial_year, invoice_type,
  invoice_date, due_date, status, dm_no, dm_date, seller_name_snapshot,
  seller_address_snapshot, seller_gstin_snapshot, seller_drug_license_snapshot,
  seller_fssai_snapshot, customer_name_snapshot, customer_address_snapshot,
  customer_gstin_snapshot, customer_drug_license_snapshot, transport_id,
  transport_name_snapshot, cartons, cases_bales, taxable_amount, cgst_amount,
  sgst_amount, freight_adjustment_amount, round_off_amount, net_amount, amount_in_words,
  print_profile
) VALUES
  (
    'invoice-mp-3-2026-2027',
    'company-meru',
    'customer-tara-medicals',
    'MP/ 3/2026-2027',
    '2026-2027',
    'CREDIT',
    '2026-04-24',
    '2026-05-09',
    'posted',
    '0',
    '2026-04-24',
    'MERU PHARMACEUTICALS',
    '76, Ayodhya Nagar NAGPUR-440 024',
    '27AACPI7993N1ZY',
    '20B-255760/2018, 21B-255761/2018',
    '21518260001528',
    'TARA MEDICALS',
    'BRAMHAPURI, DIST.CHANDRAPUR',
    '27AADFT3389G1ZW',
    '20-830,21-830',
    'transport-bramhapuri-roadlines',
    'BRAMHAPURI ROADLINES',
    1,
    1,
    6349.00,
    158.72,
    158.72,
    -15.00,
    -0.45,
    6651.00,
    'Six Thousand Six Hundred Fifty One Only',
    'dot_matrix_box'
  ),
  (
    'invoice-mp-4-2026-2027',
    'company-meru',
    'customer-shivkripa-medical-stores',
    'MP/ 4/2026-2027',
    '2026-2027',
    'CREDIT',
    '2026-04-24',
    '2026-05-09',
    'posted',
    '0',
    '2026-04-24',
    'MERU PHARMACEUTICALS',
    '76, Ayodhya Nagar NAGPUR-440 024',
    '27AACPI7993N1ZY',
    '20B-255760/2018, 21B-255761/2018',
    '21518260001528',
    'SHIVKRIPA MEDICAL STORES',
    'KIRMITI (MENDHA) DIST.CHANDRAPUR',
    '',
    '20-1178,21-1178',
    'transport-syndicate-garage',
    'SYNDICATE GARAGE',
    0,
    0,
    8776.50,
    219.41,
    219.41,
    0.00,
    -0.33,
    9215.00,
    'Nine Thousand Two Hundred Fifteen Only',
    'dot_matrix_box'
  );

INSERT INTO invoice_line_items (
  id, invoice_id, medicine_id, batch_id, sort_order, mrp, product_name_snapshot,
  hsn_code_snapshot, gst_rate, pack_snapshot, batch_no_snapshot, expiry_month,
  expiry_year, manufacturer_name_snapshot, sale_qty, free_qty, rate, line_amount
) VALUES
  ('invoice-line-mp3-1', 'invoice-mp-3-2026-2027', 'medicine-lycorange-syrup', 'batch-lycorange-fs-1437', 1, 160.00, 'LYCORANGE SYRUP', '2106', 5, '200ml.', 'FS-1437', 10, 2027, 'Orang', 50, 10, 126.98, 6349.00),
  ('invoice-line-mp4-1', 'invoice-mp-4-2026-2027', 'medicine-aclopass-tab', 'batch-aclopass-yt250740b', 1, 59.05, 'ACLOPASS TAB.', '3004', 5, '10''TAB', 'YT250740B', 9, 2027, 'Y.P.', 60, 0, 14.80, 888.00),
  ('invoice-line-mp4-2', 'invoice-mp-4-2026-2027', 'medicine-ketoven-plus-6', 'batch-ketoven-y227', 2, 112.50, 'Ketoven-Plus 6', '3004', 5, '15 gms', 'Y227', 10, 2027, 'Y.P.', 30, 0, 28.85, 865.50),
  ('invoice-line-mp4-3', 'invoice-mp-4-2026-2027', 'medicine-gimptino-m1', 'batch-gimptino-yt250934a', 3, 109.00, 'GIMPTINO-M1', '3004', 5, '15''Tab', 'YT250934A', 11, 2027, 'Y.P.', 30, 0, 38.80, 1164.00),
  ('invoice-line-mp4-4', 'invoice-mp-4-2026-2027', 'medicine-rabiyu-dsr', 'batch-rabiyu-yc250226b', 4, 89.00, 'RABIYU-DSR.', '3004', 5, '10''CAP', 'YC250226B', 1, 2028, 'Y.P.', 20, 0, 22.45, 449.00),
  ('invoice-line-mp4-5', 'invoice-mp-4-2026-2027', 'medicine-yupred-4', 'batch-yupred-yt250696d', 5, 56.25, 'Yupred 4', '3004', 5, '10''TAB', 'YT250696D', 9, 2027, 'Y.P.', 100, 0, 18.95, 1895.00),
  ('invoice-line-mp4-6', 'invoice-mp-4-2026-2027', 'medicine-vengab-100-tab', 'batch-vengab-yt250435', 6, 79.68, 'Vengab-100 Tab.', '3004', 5, '100TAB', 'YT250435', 7, 2027, 'Y.P', 100, 0, 17.60, 1760.00),
  ('invoice-line-mp4-7', 'invoice-mp-4-2026-2027', 'medicine-pantro-d-tab', 'batch-pantro-bt25-577a', 7, 83.00, 'Pantro-D tab.', '3004', 5, '10''TAB', 'BT25-577A', 1, 2028, 'Bioco', 100, 0, 17.55, 1755.00);

INSERT INTO invoice_tax_lines (
  id, invoice_id, gst_rate, taxable_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount
) VALUES
  ('tax-mp3-5', 'invoice-mp-3-2026-2027', 5, 6349.00, 2.5, 158.72, 2.5, 158.72),
  ('tax-mp4-5', 'invoice-mp-4-2026-2027', 5, 8776.50, 2.5, 219.41, 2.5, 219.41);

INSERT INTO invoice_print_settings (
  id, name, page_size, copies_per_page, character_set, font_family, font_size_pt,
  line_height, margin_top_mm, margin_right_mm, margin_bottom_mm, margin_left_mm,
  is_default
) VALUES
  (
    'print-dot-matrix-box',
    'Dot matrix box drawing',
    'A4',
    2,
    'box',
    'Courier New',
    8.2,
    1.04,
    8,
    8,
    8,
    8,
    1
  ),
  (
    'print-dot-matrix-ascii',
    'Dot matrix ASCII safe',
    'A4',
    2,
    'ascii',
    'Courier New',
    8.2,
    1.04,
    8,
    8,
    8,
    8,
    0
  );

INSERT INTO app_settings (key, value) VALUES
  ('database.schema_version', '2'),
  ('invoice.default_company_id', 'company-meru'),
  ('invoice.default_print_settings_id', 'print-dot-matrix-box');
