# MERUGST Porting Guide

This is the handoff document for agents working on the MERUGST modernization.
Read this before changing code. The goal is not to redesign the product. The
goal is to port the legacy FoxBASE/FoxPro billing application to a modern,
cross-platform terminal application while preserving the workflow that the
operator already knows.

## Current Status

### Done

- [x] Legacy files have been inventoried at a high level.
- [x] TypeScript workspace exists under `apps/cli`.
- [x] Local CLI entry points exist: `meru-local` for development and `meru` for
  production-style invocation.
- [x] Read-only DBF viewer exists.
- [x] DBF list command exists: `pnpm meru-local -- dbf list`.
- [x] DBF schema command exists: `pnpm meru-local -- dbf schema CUSTMST.DBF`.
- [x] DBF rows command exists with field selection, exact filters, substring
  filters, JSON output, encoding, loose mode, and deleted-record inclusion.
- [x] Interactive terminal DBF browser exists: `pnpm meru-local -- dbf browse`.
- [x] Smoke test exists for the DBF command registration.
- [x] TypeScript compile/typecheck currently passes.
- [x] Unit/smoke tests currently pass.

Do not reimplement the DBF viewer from scratch. Extend it only when it directly
supports import, parity checks, or operator workflows.

### Not Done

- [ ] SQLite schema and migrations.
- [ ] DBF-to-SQLite importer.
- [ ] Raw archival import tables.
- [ ] Normalized business tables.
- [ ] Terminal business shell/menu system.
- [ ] Invoice entry.
- [ ] Invoice modification/cancellation.
- [ ] GST invoice calculation engine.
- [ ] Invoice printing pipeline.
- [ ] `print.spl` edit workflow.
- [ ] Payment entry.
- [ ] Outstanding report.
- [ ] Monthly sales register.
- [ ] Purchase register.
- [ ] Credit note register.
- [ ] Stock report.
- [ ] Price list.
- [ ] Data parity tests against DBF and existing `.PRN` files.
- [ ] Windows 10/11 packaging.
- [ ] macOS packaging.
- [ ] Backup/restore tooling.

## Hard Requirements

1. This is a FoxBASE/FoxPro-era project. The modern port must run on Windows 10,
   Windows 11, and macOS.
2. The UX must remain a terminal-controlled app, not a browser app. The operator
   should be able to work from menus, keyboard prompts, boxes, rows, and
   terminal forms.
3. Invoice creation and invoice editing/modification must happen inside the
   terminal in the same old FoxBASE-style, keyboard-driven, form-like workflow.
   Do not replace this with one-shot CLI flags, a browser form, or a GUI-only
   editor.
4. The old workflow allowed generating `print.spl`, opening it in a vim-like
   editor, editing it, and then printing it. Preserve this behavior.
5. All old data must be ported: medicines, medicine codes, customers, invoice
   headers, invoice lines, purchases, credit notes, bill totals, balances, GST
   fields, stock quantities, payment status, and report-relevant fields.
6. The legacy directory is original source/data. Treat it as read-only unless
   the user explicitly asks for a legacy-file operation.
7. `.IDX` files are legacy indexes. Do not migrate their binary format as the
   source of truth. Recreate their intent with SQLite indexes.
8. Existing `.PRN` and `.SPL` outputs are valuable golden-master references for
   report and print layout parity.
9. Preserve old financial-year behavior. A date after March belongs to the
   current year plus next year. A date from January through March belongs to the
   previous year plus current year.
10. Preserve old field semantics before renaming them. Add clear aliases in the
   normalized model only after raw import is exact.
11. Prefer correctness and parity over "modern" UX. The first working version
    should feel like the old app.

## Repository Layout

- `README.md` - quick project overview and current task ledger.
- `MERUGST_PORTING_GUIDE.md` - this detailed agent handoff.
- `apps/cli` - modern TypeScript terminal app.
- `apps/cli/src/program.ts` - CLI setup and command registration.
- `apps/cli/src/commands/dbf.ts` - read-only DBF commands.
- `apps/cli/src/tui/dbf-browser.ts` - interactive terminal table browser.
- `apps/cli/src/ui/output.ts` - simple table, JSON, and value formatters.
- `apps/cli/test/smoke.test.ts` - current smoke tests.
- `legacy/` - original program/data files when present locally.

Important note: some clean repositories may not include `legacy/` because it can
contain private operational data. This local workspace currently has it. Agents
must write code that accepts `--data-dir` and does not assume private data is
committed everywhere.

## Modern CLI Already Built

The current CLI is intentionally small.

Root package scripts:

- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm meru-local -- doctor`
- `pnpm meru-local -- dbf list`
- `pnpm meru-local -- dbf schema CUSTMST.DBF`
- `pnpm meru-local -- dbf rows CUSTMST.DBF --limit 10 --fields CUSTNO,NAME,TOWN`
- `pnpm meru-local -- dbf browse CUSTMST.DBF --fields CUSTNO,NAME,TOWN`
- `pnpm meru -- doctor`

Current dependencies:

- `commander` for CLI commands.
- `dbffile` for DBF reads.
- `terminal-kit` for terminal UI.
- `zod` for validation, though it is not deeply used yet.
- `typescript`, `tsx`, and `vitest` for development.

The DBF commands resolve the data directory automatically by looking for
`CUSTMST.DBF`, then `legacy/CUSTMST.DBF`, then a workspace root. This matters
because agents should keep `--data-dir` support for all future import and parity
commands.

## Legacy Program Overview

The legacy app is a collection of `.PRG` files, `.DBF` tables, `.IDX` indexes,
and printed report files. The program code is about 27,001 lines across the
`.PRG` files in this checkout.

Core modules:

- `MINVENT.PRG` - main invoice entry, modification, purchase entry, credit-note
  selection, yearly file creation, and header writes.
- `MINVPROC.PRG` - line-item entry procedure `INVPADD` used by invoice entry.
- `MINVGST.PRG` - GST-era invoice printing, calculation, totals, due date,
  amount-in-words, and final header total updates.
- `MPAYENT.PRG` - payment entry and invoice cancellation status updates.
- `CUSOUT.PRG` - outstanding reports.
- `MMSALE.PRG` and variants - monthly sales registers.
- `PURCHASE.PRG` and `MINVPURC.PRG` - purchase registers.
- `MCNLIST.PRG` - credit note register.
- `MISALE.PRG` - product-wise monthly sales chart.
- `MSTOCK.PRG` and `MPSTOCK.PRG` - stock hypothecation statements.
- `MPRICE.PRG` - price list.
- `DUEDATE.PRG` - due-date procedure.
- `WORD.PRG` - word/letter style output helper.

Important fragments and suspicious files:

- `MM.PRG` is a fragment, not a complete runnable module.
- `MPR.PRG` is a print destination snippet, not a complete runnable module.
- `INVPR.PRG` is effectively a one-line or fragment file.
- `CMAIN.PRG` references `INOUTENT`, `INOUTMOD`, and `INOUTPRN`, but those
  procedures were not found in this checkout. Treat it as orphaned until proven
  otherwise.
- Many `MINVP*` and `MINVPN*` files are historical print variants. Use them as
  references, but pick the current GST path first: `MINVGST.PRG`.

## Legacy UX Model

The old app is screen-coordinate driven:

- `@ row,col SAY ...` draws text.
- `@ row,col GET ...` collects typed input.
- `@ row,col PROMPT ...` and `MENU TO` draw keyboard menus.
- `READKEY() = 12` is used as Escape/exit behavior in many places.
- Row 23 and row 24 are commonly used for operator prompts and validation
  messages.
- Screens assume an 80-column, roughly 24-line terminal.
- Borders are drawn with box characters in the legacy code. The modern port can
  use ASCII or terminal box drawing, but positioning and workflow should remain
  familiar.

The modern terminal framework must support:

- Fixed-size form layouts.
- Menus controlled by arrow keys and Enter.
- Escape/back-out behavior.
- Prompt rows for status and errors.
- Form fields with masks, such as dates, invoice numbers, quantities, and
  one-character status fields.
- Confirmation prompts with `Y/N`.
- Table-like line entry with stable columns.
- File/printer/screen destination selection.
- A way to preview and edit `print.spl` before printing.

Do not replace this with a web dashboard. A browser UI can be a future companion
only after the terminal app is complete.

## Invoice Create/Edit UX Requirement

The old software allowed invoices to be created and modified inside a terminal
form, with behavior closer to a full-screen editor than a sequence of simple
command-line prompts. The modern port must preserve that.

Required behavior:

- Start invoice entry from a terminal menu.
- Draw the invoice header and item grid on an 80x24-style screen.
- Let the operator enter header fields in-place: customer code, order number,
  order date, challan number/date, invoice number/date, and status.
- Let the operator enter medicine lines in-place: company code, item code, size,
  batch, manufacturing date, expiry date, sale/free quantities, and rate.
- Support invoice modification from the same terminal experience by entering an
  invoice number, loading the existing invoice, editing the header/lines, and
  saving changes.
- Support old correction behavior: Escape/back out of a field, return to header
  correction, reject invalid customer/item/date values on the status row, and
  confirm before ending or saving.
- Support line-level actions from the modification screen, including add,
  modify, delete/cancel, next/view behavior where the legacy code exposes it.
- Keep this keyboard-only. Mouse support can exist, but it cannot be required.
- Do not model invoice creation as `meru invoice create --customer ...` only.
  Non-interactive commands can be added later for tests/imports, but the primary
  operator workflow must be full-screen terminal entry.

## Legacy Financial-Year Naming

Legacy code computes year suffixes like this:

```text
if month(date) > 03:
  left_year = year(date)
  right_year = left_year + 1
else:
  right_year = year(date)
  left_year = right_year - 1

suffix = last_two_digits(left_year) + last_two_digits(right_year)
```

Examples:

- `2026-05-30` maps to `2627`.
- `2026-03-30` maps to `2526`.
- `2025-04-01` maps to `2526`.

Annual file families:

- `RIC####.DBF` - regular invoice control/header family.
- `RID####.DBF` - regular invoice detail/line family.
- `RIT####.DBF` - GST/print-side regular invoice header family in current data.
- `RIG####.DBF` - GST/print-side regular invoice detail family in current data.
- `PI####.DBF` - purchase invoice/order header family.
- `PID####.DBF` - purchase invoice/order detail family.
- `TI####.DBF` - transfer/credit note header family.
- `TID####.DBF` - transfer/credit note detail family.

Legacy files sometimes use drive prefixes such as `C:` or `b:`. The modern port
must remove drive assumptions and use configured data roots.

## DBF Data Inventory

This workspace currently has these key master tables:

### `CUSTMST.DBF`

Customer master. Current record count: 301.

Fields:

- `CUSTNO` - customer code, 5 chars.
- `NAME` - customer name.
- `ADD1`, `ADD2`, `ADD3` - address lines.
- `TOWN`, `PIN` - location.
- `TYPE`, `GROUP`, `ZONE`, `AREA`, `HQUART` - classification fields.
- `TEL1`, `TEL2`, `TLX` - contact fields.
- `STNO`, `CSTNO` - tax/GST-era registration fields in legacy naming.
- `DRUGLNO` - drug license number.
- `BANK`, `TRANSPORT` - customer default bank/transport text.
- `CREDIT` - credit text/terms.
- `DISC`, `ATD`, `OCT` - discounts/tax-related customer settings.
- `SITE` - used as due-days input in `DUEDATE.PRG`.

### `ITEMMST.DBF`

Medicine/item master. Current record count: 868.

Fields:

- `CCODE` - company/manufacturer code.
- `SRL` - item serial code.
- `SIZE` - item size code.
- `NAME` - medicine name.
- `PACK`, `UNIT`, `CAT` - packing/category fields.
- `LIFE` - shelf-life months for expiry calculation.
- `MRP`, `TP`, `TP1`, `TPS`, `NRV` - prices/rates.
- `STOCK` - on-hand quantity.
- `MINSTK`, `MAXSTK`, `REORDLVL`, `REORDQTY` - stock control.
- `TAX`, `GST`, `HSNC` - tax/GST/HSN fields.

The natural legacy item key is `CCODE + SRL + SIZE`.

### `LASTNO.DBF`

Invoice number counter. Current record count: 3.

Fields:

- `TYPE` - `INV`, `TRN`, or `PUR`.
- `LNO` - last number.

### Template Tables

`CUSTDATA.DBF` and `CUSTTRN.DBF` are empty templates used by `COPY STRU TO` in
legacy code.

- `CUSTDATA.DBF` is the source structure for annual header/control tables.
- `CUSTTRN.DBF` is the source structure for annual detail/line tables.

### Other Master/Reference Tables

- `MAST.DBF` - account heads, 277 records: `ACCODE`, `ACHEAD`.
- `LNO.DBF` - single `LNO` field, 1 record.
- `CUSTPAYM.DBF` - payment table structure, 0 records in this checkout.
- `DATA.DBF` - small purchase/order related table, 2 records.
- `FEVIADD.DBF` - address/contact table, 108 records.

## DBF Schema Groups

The DBF files cluster into a few families. Do not model every annual DBF as a
separate normalized table. Import them exactly, then normalize across years.

### Header Family Before GST Additions

Files include older `PI####` and `TI####` ranges.

Common fields:

```text
CUSTNO, INVNO, ORDNO, CHALNO, INVDT, CHALDT, ORDDT, TYPE, GROUP,
ZONE, AREA, HQUART, CARTON, TOTAL, AMT8, DISC8, AMT10, DISC10,
SSAMT, DISCS, DISCSSAMT, SUBTOTAL, SALESTAX, RRNO, RRDATE,
FREIGHT, CRNO, CRDATE, CRAMT, DBNO, DBDATE, DBAMT, STAXAMT6,
STAX6, STAXAMT4, STAX4, OCTPERC, OCTAMT, INVVALUE, ROUND,
R_SIGN, DUEDT, INVSTATUS, TRCUST, P_STATUS, AMTRECD, BALANCE,
CRTYPE, INVNOW, INVDTW, INVAMTW
```

### Header Family With GST/HSN Additions

Files include `CUSTDATA.DBF`, current `RIC####`, `RIT####`, newer `PI####`, and
some `TI####`.

Common fields add:

```text
STNO, IGST, SQTY9, FQTY9, STAXAMT3, STAX3C, STAX3S, SQTY3, FQTY3
```

The header table stores both operator-entered fields and calculated print
totals. `MINVGST.PRG` recalculates and writes many of these fields after
printing.

### Detail Family Before GST/HSN

Older detail files have fields:

```text
CCODE, CUSTNO, TYPE, GROUP, ZONE, AREA, HQUART, INVNO, SRL, SIZE,
CAT, MFGDT, EXPDT, BNO, SQTY, FQTY, TP, MRP, INVDT, STATUS
```

Some very old detail files do not include `MRP`.

### Detail Family With HSN

Newer detail files, including `CUSTTRN.DBF`, `RID####`, `RIG####`, `PID####`,
and `TID####`, add:

```text
HSNC
```

The detail natural relation is by financial year, invoice kind, and `INVNO`.
The item lookup key is `CCODE + SRL + SIZE`.

## Legacy Index Intent

Do not port `.IDX` files directly. Recreate their expressions in SQLite:

- Customer master: index on `CUSTNO`.
- Item master: index on `CCODE || SRL || SIZE`.
- Last number: index on `TYPE`.
- Header order 1: `INVNO`.
- Header order 2: `CUSTNO || STR(INVNO, 4)`.
- Header order 3: `CUSTNO`.
- Detail order 1: `INVNO`.
- Detail date/customer order: `DTOC(INVDT) || CUSTNO`.

Use exact string formatting compatibility where parity needs it. For normalized
queries, use proper typed date columns and integer invoice numbers.

## Invoice Entry Workflow

Primary source: `MINVENT.PRG`.

1. Set FoxBase runtime settings: no talk, no status, British dates, century on.
2. Ask for working date.
3. Ask invoice family:
   - regular invoice,
   - credit note/product transfer,
   - purchase order.
4. Ask entry mode:
   - entry,
   - modification.
5. Compute financial-year suffix from working date.
6. Resolve file names:
   - regular: `RIC/RIT` headers and `RID/RIG` details,
   - credit/transfer: `TI` headers and `TID` details,
   - purchase: `PI` headers and `PID` details.
7. If the annual files do not exist, create them from `CUSTDATA` and `CUSTTRN`
   structures and create index files.
8. Open item master, customer master, last number, header files, and detail
   files.
9. Draw the 80x24 invoice entry screen.
10. For a new invoice:
    - collect customer code,
    - validate against `CUSTMST`,
    - show name and town,
    - collect order number and date,
    - collect challan number and date,
    - validate challan date is not before order date,
    - increment `LASTNO.LNO`,
    - collect invoice date,
    - validate invoice date is not before challan date,
    - collect status, generally `A` or `M`.
11. For modification:
    - collect invoice number,
    - seek header by invoice number,
    - reject missing or cancelled invoices,
    - load prior header fields onto the screen.
12. Call `INVPADD` from `MINVPROC.PRG` to enter line items.
13. Write or update header rows.
14. Update `LASTNO.LNO`.
15. Rebuild detail date/customer indexes.

The current regular invoice path appears to maintain parallel `RIC/RID` and
`RIT/RIG` families. Preserve raw behavior first. Later, normalize this to one
invoice domain model with explicit print/data-copy provenance.

## Line-Item Entry Workflow

Primary source: `MINVPROC.PRG`, procedure `INVPADD`.

1. Start line entry at row 11 and continue until Escape or a blank line with
   confirmation.
2. Require at least one item before ending.
3. Collect company/item code as:
   - `CCODE`,
   - `SRL`,
   - `SIZE`.
4. Validate `CCODE` against legacy allowed values:
   - `H`, `B`, `C`, `R`, `A`, `W`, `O`.
5. Lookup item by `CCODE + SRL + SIZE`.
6. Reject unknown items with row-23 message.
7. Get product name, shelf life, rate, HSN code, pack, unit, MRP.
8. If customer `ATD = 10`, use `TP1`; otherwise use `TP`.
9. Collect batch number.
10. Collect manufacturing month/year.
11. Reject manufacturing date after invoice month/year.
12. Calculate expiry month/year from manufacturing month/year and `ITEMMST.LIFE`.
13. Collect sale quantity and free quantity.
14. Reject line where both quantities are zero.
15. Display rate.
16. Collect action:
    - `A` add,
    - `M` modify,
    - blank handling.
17. On add:
    - append detail record,
    - copy customer classification from `CUSTMST`,
    - copy item fields from `ITEMMST`,
    - write batch, manufacturing date, expiry date, sale/free quantities,
      invoice date, status, TP/MRP/HSN.
18. Reduce item stock by `SQTY + FQTY`.
19. The modern port must make this whole operation transactional.

Potential issue: the legacy code updates stock as lines are entered. The modern
port should preserve final behavior but avoid partial stock corruption by using
SQLite transactions and explicit rollback on cancel.

## Invoice Print and Calculation Workflow

Primary current GST source: `MINVGST.PRG`.

1. Ask for working date.
2. Ask print type:
   - regular invoice,
   - credit note,
   - purchase order.
3. Resolve financial-year files.
4. Open item master, customer master, header file, and detail files.
5. Ask for invoice/order number.
6. Seek header by invoice number.
7. Reject missing invoice.
8. Load current header values.
9. Seek customer.
10. Ask auxiliary print fields:
    - cartons,
    - credit note number/date/amount,
    - debit note number/date/amount,
    - RR/LR number/date,
    - freight,
    - credit/cash selection,
    - cash discount percentage where applicable,
    - credit note reason.
11. Ask whether to print.
12. Ask destination:
    - file,
    - printer,
    - screen.
13. For file destination, legacy writes `print.spl`.
14. Print header:
    - company name,
    - invoice title,
    - invoice number and financial year,
    - date,
    - GSTIN/MST/drug license,
    - customer name/address,
    - customer GST/CST/BST/drug license,
    - transport/cartons/RR-LR fields.
15. Print line items:
    - MRP,
    - product name,
    - HSN,
    - GST percentage,
    - pack/unit,
    - batch,
    - expiry,
    - manufacturer/category,
    - sale/free quantity,
    - rate,
    - amount.
16. Calculate per-line base amount as `SQTY * TP`.
17. Accumulate tax buckets:
    - 2.5 percent CGST/SGST bucket from `ITEMMST.TAX = 2.5`,
    - 6 percent CGST/SGST bucket from `ITEMMST.TAX = 6.0`,
    - 9 percent CGST/SGST bucket from `ITEMMST.TAX = 9.0`.
18. Apply cash discount percentage when selected.
19. Apply customer discount `CUSTMST.DISC` when present.
20. Add CGST and SGST totals.
21. Apply debit note amount.
22. Apply credit note amount.
23. Apply freight:
    - regular invoice subtracts freight,
    - credit note adds freight.
24. Round net invoice value to whole rupees:
    - if fractional part is greater than `.49`, round up and store `+`,
    - otherwise round down and store `-`.
25. Compute due date using `DUEDATE.PRG`.
26. Convert amount to words using the hard-coded Indian-numbering routine.
27. Print footer:
    - due date,
    - net amount,
    - amount in words,
    - E & O. E,
    - Nagpur jurisdiction,
    - GST certificate text,
    - non-returnable basis,
    - interest after due date,
    - signature lines.
28. Write calculated values back to the header row:
    - cartons,
    - total/subtotal,
    - RR/freight/credit/debit note fields,
    - discount,
    - invoice value,
    - rounding,
    - due date,
    - tax buckets,
    - quantity buckets,
    - credit note linkage fields,
    - payment fields if cash discount caused paid status.

Modern implementation rule: split this into pure calculation, pure rendering,
and persistence. Only persist after the operator accepts the print result.

## `print.spl` Editing Requirement

The legacy app can write invoice output to `print.spl`. The operator could open
that file in a vim-like editor, change text, and then print it. This is a hard
requirement.

Modern print pipeline should be:

1. Render draft invoice/report text into a spool file, default `print.spl`.
2. Preserve printer escape codes when needed for parity, but also support a
   plain-text mode for modern printers.
3. Offer actions:
   - view on screen,
   - edit spool file,
   - print spool file,
   - save as `.PRN`,
   - cancel.
4. For editing, prefer a configured terminal editor:
   - `$MERU_EDITOR`,
   - `$EDITOR`,
   - bundled/in-app minimal vim-like editor if no external editor is available.
5. On Windows, do not assume `vim` is installed. Either document a required
   editor dependency or provide an in-app editor.
6. Keep the edited spool file as the final printable artifact.
7. Store print job metadata in SQLite:
   - invoice id,
   - report type,
   - destination,
   - created timestamp,
   - original rendered text hash,
   - edited final text hash,
   - file path.

Do not skip the edit step by printing directly only. Direct print can exist as a
shortcut, but the old editable `print.spl` path must remain.

## Payment Entry Workflow

Primary source: `MPAYENT.PRG`.

1. Open customer master and the current regular invoice header file.
2. The legacy file currently hard-codes `RIC2526`; modern code must choose the
   financial year dynamically.
3. Ask customer number.
4. Validate customer.
5. Show customer name and town.
6. Ask confirmation.
7. Seek invoice headers by customer.
8. List invoices where:
   - `P_STATUS != "P"`,
   - `INVSTATUS != "C"`.
9. Show invoice number, date, value, and amount received.
10. Show total outstanding as `INVVALUE - AMTRECD`.
11. Ask invoice number or `9999` for next party.
12. Seek by `CUSTNO + STR(INVNO, 4)`.
13. Collect payment date and amount received.
14. Optionally collect cancellation marker `C`.
15. Confirm data.
16. Update:
    - `AMTRECD = AMTRECD + amount`,
    - `INVDTW = payment date`,
    - `INVSTATUS = "C"` if cancelled,
    - `P_STATUS = "P"` if fully paid,
    - `P_STATUS = "H"` if partially paid.

Modern implementation must audit all payment and cancellation changes.

## Outstanding Report Workflow

Primary source: `CUSOUT.PRG`.

1. Ask report date.
2. Open current invoice header file and customer master.
3. Offer:
   - partywise,
   - all,
   - exit.
4. Ask head-quarter code, for example `NG1`.
5. If partywise, ask customer code.
6. Offer report type:
   - outstanding report,
   - all invoices,
   - invoices of payment received,
   - exit.
7. Write report to `CUSOUT` plus option digits plus `.PRN`.
8. Filter by customer and head-quarter.
9. Exclude paid/cancelled records for outstanding view.
10. Include paid/half-paid records for payment-received view.
11. Print per-customer totals and grand totals:
    - invoice value,
    - amount received,
    - balance.

Modern reports should parameterize year, date, head-quarter, customer, and report
mode. Do not hard-code `RIC2526`.

## Due Date Logic

Primary source: `DUEDATE.PRG`.

Inputs:

- invoice or RR date,
- due days from customer `SITE`,
- output due date.

Behavior:

- Uses British date format.
- Handles leap years.
- Adds due days by rolling across month lengths.

Potential legacy edge: the loop uses `DD_WS >= M_DAYS(MM_WS)`, which can roll on
exact month length. Preserve behavior for parity tests before considering a bug
fix.

## Reports to Port

Port reports after invoice entry/printing/payment basics are stable.

Priority order:

1. Outstanding list: `CUSOUT.PRG`, then variants `CUSOUT1.PRG`, `CUSOUT2.PRG`,
   `MCUSOUT.PRG`, `CUSTVAT*.PRG`, `DRACC.PRG`.
2. Monthly sales register: `MMSALE.PRG` and GST-era variants.
3. Purchase register: `PURCHASE.PRG`, `MINVPURC.PRG`.
4. Credit note register: `MCNLIST.PRG`.
5. Stock reports: `MSTOCK.PRG`, `MPSTOCK.PRG`.
6. Price list: `MPRICE.PRG`.
7. Product-wise sales chart: `MISALE.PRG`.
8. Tax/GST report variants: `MMSTAX.PRG`, `MTAX.PRG`.

Most report programs hard-code a single yearly DBF and leave older years
commented out. The port must replace those hard-coded file references with
financial-year parameters.

## Data Migration Plan

Use a two-layer migration.

### Layer 1: Raw Archival Import

Create exact raw imports first. This protects against misunderstood fields.

Recommended tables:

- `legacy_import_runs`
  - import id,
  - source data directory,
  - started/finished timestamps,
  - app version,
  - status.
- `legacy_files`
  - file id,
  - source filename,
  - source size,
  - DBF updated date,
  - record count,
  - schema hash.
- `legacy_records`
  - file id,
  - record number,
  - deleted flag,
  - raw JSON,
  - normalized parse status.
- `legacy_fields`
  - file id,
  - field order,
  - field name,
  - DBF field type,
  - size,
  - decimal places.

Also consider wide raw tables per schema group for fast parity queries, but do
not skip the generic raw record store.

### Layer 2: Normalized Business Tables

Recommended normalized tables:

- `financial_years`
  - suffix,
  - start date,
  - end date.
- `customers`
  - customer code,
  - name/address/town/pin,
  - classification,
  - tax/drug license fields,
  - transport/bank/default discount,
  - due days.
- `items`
  - company code,
  - serial,
  - size,
  - medicine name,
  - pack/unit/category,
  - shelf life,
  - MRP/rate fields,
  - tax/GST/HSN.
- `stock_balances`
  - item id,
  - current quantity,
  - source quantity,
  - updated timestamp.
- `invoice_headers`
  - financial year,
  - kind (`regular`, `credit_note`, `purchase`, `transfer`),
  - legacy family (`RIC`, `RIT`, `PI`, `TI`),
  - invoice number,
  - customer,
  - order/challan/invoice dates,
  - status fields,
  - transport/freight/rounding/totals/tax buckets/payment fields.
- `invoice_lines`
  - header id,
  - line number,
  - item id,
  - batch,
  - mfg/exp dates,
  - sale/free quantity,
  - rate,
  - MRP,
  - HSN,
  - status.
- `payments`
  - customer,
  - invoice,
  - payment date,
  - amount,
  - resulting status,
  - source action.
- `print_jobs`
  - report/invoice id,
  - spool path,
  - rendered hash,
  - edited hash,
  - destination,
  - printed timestamp.
- `audit_log`
  - actor/session,
  - action,
  - table,
  - record id,
  - before JSON,
  - after JSON,
  - timestamp.

### Import Acceptance Criteria

- Every DBF file imports without mutation.
- File count and record count match the DBF viewer.
- Deleted records are either imported with flags or explicitly counted.
- Date parsing preserves empty/invalid dates.
- Numeric fields preserve decimal places.
- Character fields preserve significant spaces until normalized.
- All medicine codes from `ITEMMST` are present.
- All customers from `CUSTMST` are present.
- All annual invoice headers and lines are linked or listed as exceptions.
- All totals can be recomputed or reconciled to stored DBF fields.

## Business Calculation Strategy

Port calculations into pure TypeScript functions before attaching them to UI.

Create function groups:

- `financialYearForDate(date)`.
- `legacyFileSetForDate(date, kind)`.
- `legacyItemKey(ccode, srl, size)`.
- `calculateExpiryDate(manufacturingMonth, manufacturingYear, lifeMonths)`.
- `calculateInvoiceTotals(header, lines, customer, items, printOptions)`.
- `roundLegacyInvoiceValue(value)`.
- `calculateDueDate(baseDate, dueDays)`.
- `amountToIndianWords(value)`.
- `renderInvoiceText(invoice, calculation, options)`.
- `applyPayment(invoice, paymentAmount, paymentDate, cancelFlag)`.

Each function needs tests using real DBF samples and golden outputs.

## Terminal App Architecture

Keep the current CLI and add internal modules rather than putting business logic
inside command handlers.

Suggested structure:

```text
apps/cli/src/
  commands/
    dbf.ts
    import.ts
    app.ts
    report.ts
  db/
    connection.ts
    migrations/
    repositories/
  legacy/
    dbf-reader.ts
    manifest.ts
    financial-year.ts
    field-map.ts
  domain/
    customers.ts
    items.ts
    invoices.ts
    payments.ts
    reports.ts
    printing.ts
  tui/
    shell.ts
    menu.ts
    forms.ts
    table.ts
    editor.ts
  print/
    spool.ts
    render-invoice.ts
    render-report.ts
    printer.ts
```

Command split:

- `meru-local dbf ...` remains read-only legacy exploration.
- `meru-local import ...` imports DBF files to SQLite.
- `meru-local verify ...` runs parity checks.
- `meru-local app` starts the terminal business app.
- `meru-local report ...` can run reports non-interactively.

## Step-by-Step Porting Roadmap

### Phase 0: Protect Legacy Data

- Keep `legacy/` read-only in code.
- Add clear warnings before any command that writes outside SQLite.
- Add backup command before live migration.
- Add tests that DBF viewer commands do not write to `.DBF` or `.IDX`.

### Phase 1: Manifest and Import

- Build `legacy manifest` command that outputs DBF schemas, file groups, record
  counts, and inferred family/kind/year.
- Add SQLite dependency and connection layer.
- Add migrations.
- Import raw DBF files.
- Add import report with exact counts.
- Add failed-record report.
- Add idempotent re-import behavior.

### Phase 2: Normalization

- Normalize customers.
- Normalize items/medicine codes.
- Normalize financial years.
- Normalize invoice headers.
- Normalize invoice lines.
- Normalize payment/status fields.
- Link headers and lines by kind/year/invoice number.
- Produce exception reports for orphan lines, missing customers, missing items,
  invalid dates, duplicate invoice numbers.

### Phase 3: Read-Only Modern Views

- Customer lookup.
- Medicine lookup.
- Invoice lookup.
- Invoice line view.
- Outstanding view.
- Stock view.
- Print preview from migrated SQLite.

No write workflows until this phase is verified.

### Phase 4: Terminal UX Framework

- Build reusable menu component.
- Build form component with masks and validation.
- Build fixed-width table component.
- Build row-23/row-24 status prompt handling.
- Build Escape/back behavior.
- Build file/printer/screen destination menu.
- Build spool viewer/editor flow.

### Phase 5: Invoice Entry

- Implement regular invoice entry first.
- Implement line item add.
- Implement stock decrement transaction.
- Implement `LASTNO` equivalent sequence.
- Implement modification/cancellation.
- Implement credit note flow.
- Implement purchase flow.
- Add audit log for each write.

### Phase 6: Calculation and Printing

- Port GST calculation from `MINVGST.PRG`.
- Port due-date logic.
- Port amount-in-words.
- Render invoice text.
- Generate `print.spl`.
- Add edit step.
- Add printer output step.
- Store print job metadata.
- Compare against existing `.SPL` and `.PRN` outputs.

### Phase 7: Payment Entry

- Port customer invoice list.
- Port full and partial payment.
- Port cancellation marker.
- Update invoice payment status.
- Add audit log.
- Add outstanding recalculation tests.

### Phase 8: Reports

- Port outstanding reports.
- Port monthly sales register.
- Port purchase register.
- Port credit note register.
- Port stock statement.
- Port price list.
- Port product-wise sales chart.
- Port tax/GST reports.

### Phase 9: Packaging

- Package for Windows 10/11.
- Package for macOS.
- Decide SQLite file location per platform.
- Decide spool/output file location per platform.
- Bundle or configure terminal editor.
- Document printer setup.
- Provide backup/restore commands.

### Phase 10: Parallel Run and Cutover

- Run old and new systems side by side.
- Import old DBFs.
- Recompute totals.
- Compare invoices and reports for at least one current financial year.
- Print test invoices.
- Confirm operator workflow.
- Freeze DBF writes.
- Switch SQLite to live source.
- Keep rollback path.

## Verification Strategy

Add automated checks early:

- DBF schema snapshot tests.
- DBF record count tests.
- Import count tests.
- Header/detail link tests.
- Customer and item lookup tests.
- Financial-year suffix tests.
- Expiry-date tests.
- Due-date tests.
- Amount-in-words tests.
- Invoice total tests for sample invoices from `2526` and `2627`.
- Report total tests.
- Print text snapshot tests with normalized escape codes.
- TUI smoke tests for non-interactive pieces.

Manual checks:

- Operator can enter a sample invoice using keyboard only.
- Operator can create `print.spl`.
- Operator can edit `print.spl` in a vim-like editor.
- Operator can print edited spool output.
- Stock changes match expectation.
- Outstanding report changes after payment.

## Agent Rules

- Do not mutate `legacy/*.DBF`, `legacy/*.IDX`, or old output files unless the
  user explicitly asks.
- Do not delete generated `.PRN` or `.SPL` files unless the user explicitly
  asks.
- Do not rewrite all legacy logic at once. Port one workflow, test it, then move
  on.
- Do not infer field meaning from names alone when legacy code shows actual
  usage.
- Keep raw imports even after normalized tables exist.
- Keep terminal UX first.
- Keep `dbf` commands read-only.
- Prefer small, testable pure functions for calculations.
- Preserve legacy financial-year behavior.
- Replace hard-coded years with parameters.
- When a report has many variants, port the currently relevant GST/current
  variant first, then older variants as needed for historical parity.
- Mark completed work in `README.md` and this guide when done.

## Immediate Next Task Recommendation

Build the SQLite import foundation:

1. Choose SQLite library.
2. Add migrations.
3. Add raw import tables.
4. Add `meru-local import dbf --source legacy --database meru.sqlite`.
5. Import all DBFs exactly.
6. Print a summary of file counts, record counts, schema groups, and failures.
7. Add tests for financial-year parsing and DBF count preservation.

This is the safest next step because it unlocks data parity checks without
changing legacy data or implementing write workflows prematurely.
