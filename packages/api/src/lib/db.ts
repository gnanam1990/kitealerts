import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.KITEALERTS_DB ?? resolve(here, "../../alerts.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    match_type TEXT NOT NULL,
    address TEXT NOT NULL,
    min_value_wei TEXT,
    webhook_url TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_seen_block INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    http_status INTEGER,
    error TEXT,
    delivered_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(rule_id, tx_hash)
  );
  CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(active);
  CREATE INDEX IF NOT EXISTS idx_deliveries_rule ON deliveries(rule_id);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const rows = db.pragma(`table_info(${table})`) as { name: string }[];
  if (!rows.some((row) => row.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

ensureColumn("deliveries", "attempts", "attempts INTEGER NOT NULL DEFAULT 0");
ensureColumn("deliveries", "next_attempt_at", "next_attempt_at INTEGER");
ensureColumn("deliveries", "last_attempt_at", "last_attempt_at INTEGER");
