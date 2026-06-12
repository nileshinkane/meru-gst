# MERUGST Modernization

## Why

My father created the original MERUGST application in 1991. He continued to
update it over the years, and it kept running faithfully until his Windows XP PC
finally gave up.

The application was built as a 16-bit program, which modern Windows versions
such as Windows 11 no longer support. This project is my effort to port the app
to modern technology while keeping the application and its user experience the
same for him.

This repository contains the untouched legacy FoxBASE/FoxPro files plus a new
Node.js workspace for rebuilding the application as a modern terminal app.

For detailed context, data mapping, completed tasks, and the step-by-step porting
plan, read [MERUGST_PORTING_GUIDE.md](MERUGST_PORTING_GUIDE.md) before changing
code.

## Layout

- `apps/cli` - TypeScript CLI/TUI application.
- `legacy/` - original FoxBASE/FoxPro `.PRG`, `.DBF`, `.IDX`, `.PRN`, `.SPL`,
  and related files when present locally. Treat this directory as read-only
  source data unless a user explicitly asks for a legacy-file operation. Some
  clean clones may omit it because it can contain private operational data.

## Current Status

Done:

- [x] TypeScript CLI workspace exists.
- [x] `meru-local` and `meru` command aliases exist.
- [x] Read-only DBF list/schema/rows commands exist.
- [x] Read-only interactive DBF browser exists.
- [x] DBF viewer supports field selection, filters, JSON output, encoding, loose
  mode, and deleted-record inclusion.
- [x] Smoke tests exist for command registration.

Not done yet:

- [ ] SQLite schema and DBF import.
- [ ] Data migration for customers, medicines, invoice headers, invoice lines,
  payments, stock, and reports.
- [ ] Terminal business app for full-screen invoice creation, invoice
  editing/modification, payment, and reporting.
- [ ] GST invoice calculation and printing.
- [ ] Editable `print.spl` workflow with a vim-like editor.
- [ ] Windows 10/11 and macOS packaging.

## Commands

```sh
pnpm build
pnpm typecheck
pnpm test

# Local/prod-style command names after build
pnpm meru-local -- doctor
pnpm meru-local -- dbf list
pnpm meru-local -- dbf schema CUSTMST.DBF
pnpm meru-local -- dbf rows CUSTMST.DBF --limit 10 --fields CUSTNO,NAME,TOWN
pnpm meru-local -- dbf browse CUSTMST.DBF --fields CUSTNO,NAME,TOWN

pnpm meru -- doctor
pnpm meru -- dbf list
```

The package exposes two binary names after build/link:

- `meru-local` - local development/testing alias.
- `meru` - production alias.

The DBF explorer is read-only. It does not update legacy `.DBF` or `.IDX` files.
