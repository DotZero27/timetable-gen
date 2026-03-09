# Timetable-gen

College examination timetable generator. Define semesters and subjects, set holidays, pick a date range and cycle (EVEN or ODD), and generate a deterministic exam schedule with at most two slots per day (Forenoon / Afternoon). Schedules are versioned (draft or published) and stored in SQLite.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will create a SQLite database at `.data/sqlite.db` on first run and seed 8 semesters if empty.

## Documentation

See the **[docs](docs/README.md)** folder for:

- [Architecture](docs/architecture.md) — tech stack, structure, data flow
- [API reference](docs/api.md) — endpoints and request/response shapes
- [Database](docs/database.md) — schema and setup
- [Schedule generation](docs/schedule-generation.md) — algorithm and validation rules
- [Development](docs/development.md) — install, run, lint, where to change things

## Scripts

- `npm run dev` — ensure DB, then start Next.js dev server
- `npm run build` — build for production
- `npm run start` — ensure DB, then start production server
- `npm run lint` — run ESLint
