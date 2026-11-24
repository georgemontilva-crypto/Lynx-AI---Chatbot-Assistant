/**
 * Self-healing schema check, run once at boot.
 *
 * WHY THIS EXISTS: Drizzle selects every column it knows about. The moment the
 * code ships with a new column that the database does not have yet, EVERY query
 * on that table fails — and for `users` that means nobody can log in. The site
 * goes down because of a forgotten ALTER TABLE, which has happened here more
 * than once.
 *
 * So the columns added after the original schema are listed below, and at
 * startup each one is created if (and only if) it is missing. It is idempotent
 * and additive: it never drops, renames or changes anything that exists.
 * Running the same ALTER by hand first is harmless — it is simply skipped.
 */

import { sql } from "drizzle-orm";
import { getDb } from "./db";

type ColumnSpec = { table: string; column: string; ddl: string };

const REQUIRED_COLUMNS: ColumnSpec[] = [
  // Overdue payments (grace period + service pause)
  { table: "users", column: "pastDueSince", ddl: "TIMESTAMP NULL" },
  { table: "users", column: "pastDueStage", ddl: "INT NOT NULL DEFAULT 0" },
  // Last scan summary, so the Scanner page can show it after a reload
  { table: "chatbots", column: "lastScanResult", ddl: "JSON NULL" },
  // Automatic re-scan bookkeeping
  { table: "chatbots", column: "lastAutoScanAt", ddl: "TIMESTAMP NULL" },
];

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  // mysql2 returns [rows, fields]; other drivers return rows directly.
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as Array<Record<string, unknown>>;
  return Array.isArray(result) ? (result as Array<Record<string, unknown>>) : [];
}

export async function ensureSchema(): Promise<{ added: string[]; failed: string[] }> {
  const added: string[] = [];
  const failed: string[] = [];
  const db = await getDb();
  if (!db) return { added, failed };

  for (const spec of REQUIRED_COLUMNS) {
    const label = `${spec.table}.${spec.column}`;
    try {
      const found = rowsOf(await db.execute(sql`
        SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${spec.table} AND COLUMN_NAME = ${spec.column}
      `));
      if (Number(found[0]?.n ?? 0) > 0) continue;
      // Identifiers and DDL come from the constant list above, never from input.
      await db.execute(sql.raw(`ALTER TABLE \`${spec.table}\` ADD COLUMN \`${spec.column}\` ${spec.ddl}`));
      added.push(label);
    } catch (err) {
      // Two instances booting together can race; "duplicate column" means the
      // other one won, which is success.
      const msg = String((err as { message?: string })?.message ?? err);
      if (/duplicate column/i.test(msg)) continue;
      failed.push(label);
      console.error(`[Schema] Could not add ${label}:`, msg);
    }
  }
  if (added.length) console.log(`[Schema] Added missing columns: ${added.join(", ")}`);
  if (failed.length) {
    console.error(
      `[Schema] MISSING COLUMNS — the app will misbehave until these exist: ${failed.join(", ")}. ` +
      `Add them manually in the database console.`
    );
  }
  return { added, failed };
}
