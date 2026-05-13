# MERUGST Modernization

This repository contains the untouched legacy FoxBASE/FoxPro files plus a new
Node.js workspace for rebuilding the application as a modern terminal app.

## Layout

- `apps/cli` - TypeScript CLI/TUI application.
- legacy `.PRG`, `.DBF`, `.IDX`, `.PRN` files remain at the repository root.

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
