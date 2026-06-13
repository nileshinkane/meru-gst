# MERUGST Modernization

## What

MERU GST is a modern desktop rewrite of a legacy FoxBASE/FoxPro medicine
billing and GST invoicing system. The current app is a Tauri desktop application
for Windows and macOS, with a React/Vite frontend and a local SQLite database.

The goal is to keep the original business workflow familiar while making the app
installable on modern machines, safer to back up, and easy to update through
signed GitHub Releases using the Tauri updater plugin.

## Why

My father created the original MERUGST application in 1991. He continued to
update it over the years, and it kept running faithfully until his Windows XP PC
finally gave up.

The application was built as a 16-bit program in foxbase pro, which modern Windows versions
such as Windows 11 no longer support. This project is my effort to port the app
to modern technology while keeping the application and its user experience the
same for him.

This repository contains the legacy FoxBASE/FoxPro reference material when
available locally, plus the new desktop app, shared UI package, and CLI tools
used to inspect and migrate old `.DBF` data.

For detailed historical context and data mapping notes, read
[MERUGST_PORTING_GUIDE.md](MERUGST_PORTING_GUIDE.md) before changing legacy data
or migration code.

## Layout

- `apps/desktop` - Tauri 2 desktop app with React, Vite, Tailwind, and local
  SQLite storage.
- `apps/desktop/src-tauri/migrations` - SQLite schema migrations used by the
  desktop database.
- `apps/cli` - TypeScript CLI/TUI tools for read-only legacy `.DBF` inspection.
- `packages/ui` - shared shadcn-style UI components used by the desktop app.
- `legacy/` - original FoxBASE/FoxPro `.PRG`, `.DBF`, `.IDX`, `.PRN`, `.SPL`,
  and related files when present locally. Treat this directory as read-only
  source data unless a user explicitly asks for a legacy-file operation. Some
  clean clones may omit it because it can contain private operational data.

## Current App

- Tauri desktop packaging exists for Windows and macOS.
- Signed over-the-air updates are configured through GitHub Releases and
  Tauri's updater plugin.
- The desktop app uses a local SQLite database named `meru-gst.db` in the app
  data directory, not inside the repository.
- The SQLite schema covers companies, transporters, customers, manufacturers,
  medicines, medicine batches, invoices, invoice line items, tax lines, and
  invoice print settings.
- Settings include local database seed/import/export flows for development,
  testing, and backup workflows.
- The desktop UI is built with React, Tailwind CSS, lucide icons, and the
  shared shadcn-style `@meru/ui` component package.
- Invoice creation has editable header/customer/dispatch/line-item fields,
  GST totals, print preview, and print/export actions.
- Invoice printing supports box-drawing output and ASCII-safe output. The ASCII
  mode is intended for safer dot-matrix/plain-text printing paths where box
  drawing characters may not render reliably.

## Legacy Data Tools

The CLI remains important even though the main product is now the Tauri desktop
app. It is the read-only bridge for understanding old `.DBF` tables before data
is mapped into SQLite.

- TypeScript CLI workspace exists.
- `meru-local` and `meru` command aliases exist.
- Read-only DBF list/schema/rows commands exist.
- Read-only interactive DBF browser exists.
- DBF viewer supports field selection, filters, JSON output, encoding, loose
  mode, and deleted-record inclusion.
- Smoke tests exist for command registration.

The DBF explorer is read-only. It does not update legacy `.DBF` or `.IDX` files.

## Releases And Updates

Desktop releases are built by the `Release Desktop` GitHub Actions workflow.
The workflow reads the version from `apps/desktop/package.json`, verifies that
Tauri/Rust version metadata is synced, runs a release privacy check, builds
Windows/macOS installers, signs updater artifacts, and uploads `latest.json`.

Installed apps check:

```text
https://github.com/nileshinkane/meru-gst/releases/latest/download/latest.json
```

When a newer signed release is available, the desktop navbar shows an `Update`
button. Draft and prerelease GitHub releases are not intended for normal OTA
delivery.

## Commands

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm typecheck:desktop
pnpm build:desktop

# Keep package.json, Tauri config, and Cargo metadata on the same desktop version.
pnpm sync:desktop-version

# Check that tracked files do not include local customer/runtime data.
pnpm release:privacy-check

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
