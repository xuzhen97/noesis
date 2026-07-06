import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const migrationsDir = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

/**
 * 打开 Gateway SQLite 并执行未应用的迁移。
 * @param databasePath 文件路径或 `:memory:`
 */
export function openGatewayDb(databasePath: string): Database.Database {
	const db = new Database(databasePath);
	db.pragma("foreign_keys = ON");
	applyMigrations(db);
	return db;
}

function applyMigrations(db: Database.Database): void {
	db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

	const applied = new Set(
		db
			.prepare("SELECT version FROM schema_migrations")
			.all()
			.map((row) => String((row as { version: string }).version)),
	);

	const files = readdirSync(migrationsDir)
		.filter((name) => name.endsWith(".sql"))
		.sort();

	const now = new Date().toISOString();
	const insert = db.prepare(
		"INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
	);

	for (const file of files) {
		if (applied.has(file)) continue;
		const sql = readFileSync(join(migrationsDir, file), "utf8");
		db.exec(sql);
		insert.run(file, now);
	}
}
