import * as schema from "./schema.js";

const SQLITE_PATH = process.env.SQLITE_PATH || ".data/sqlite.db";

let _db = null;

/**
 * Get the Drizzle db instance. Uses Bun SQLite when running under Bun, else better-sqlite3 (e.g. Next.js build).
 * @returns {import("drizzle-orm/sqlite-core").BaseSQLiteDatabase}
 */
export function getDb() {
  if (!_db) {
    if (typeof globalThis.Bun !== "undefined") {
      const { Database } = require("bun:sqlite");
      const { drizzle } = require("drizzle-orm/bun-sqlite");
      const sqlite = new Database(SQLITE_PATH);
      _db = drizzle(sqlite, { schema });
    } else {
      const Database = require("better-sqlite3");
      const { drizzle } = require("drizzle-orm/better-sqlite3");
      const sqlite = new Database(SQLITE_PATH);
      _db = drizzle(sqlite, { schema });
    }
  }
  return _db;
}

export { schema };
