# Development

## Prerequisites

- Node.js (or Bun)
- npm or Bun for installing dependencies

## Install

```bash
npm install
# or
bun install
```

## Run locally

**Development** (ensures DB exists, then starts Next.js dev server):

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000). The first run will create `.data/sqlite.db` and tables and seed 8 semesters if empty.

**Production** (build then start; ensure-db runs before `next start`):

```bash
npm run build
npm run start
```

## Database

- **Default path**: `.data/sqlite.db`. Override with the `SQLITE_PATH` environment variable.
- **Creation**: Handled by `scripts/ensure-db.js`, which runs automatically with `npm run dev` and `npm run start`. See [database.md](database.md) for schema and setup.

## Lint

```bash
npm run lint
```

Uses ESLint (config in `eslint.config.mjs`).

## Where to change things

| Task | Files / location |
|------|-------------------|
| Schema / tables | [src/db/schema.js](../src/db/schema.js); DDL and migrations in [scripts/ensure-db.js](../scripts/ensure-db.js) |
| New API endpoint | New route under `src/app/api/` (e.g. `src/app/api/foo/route.js` with `GET`/`POST` exports) |
| Schedule rules or algorithm | [src/lib/schedule/validate.js](../src/lib/schedule/validate.js), [src/lib/schedule/generator.js](../src/lib/schedule/generator.js) |
| Domain constants / parity | [src/lib/domain.js](../src/lib/domain.js) |
| UI (schedule/calendar) | [src/components/schedule/](../src/components/schedule/) |
| Reusable UI primitives | [src/components/ui/](../src/components/ui/) (shadcn) |
