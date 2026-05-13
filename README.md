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

## Layout

- `apps/cli` - TypeScript CLI/TUI application.
- legacy `.PRG`, `.DBF`, `.IDX`, `.PRN` files remain at the repository root.
- `legacy/` is intentionally not included in this repository because it contains
  the original application data.

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
