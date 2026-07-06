import { describe, expect, it } from "vitest";
import { openGatewayDb } from "./sqlite.js";

describe("openGatewayDb", () => {
	it("applies migrations and has machines table", () => {
		const db = openGatewayDb(":memory:");
		const row = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name='machines'",
			)
			.get();
		expect(row).toBeTruthy();
	});

	it("records schema_migrations for 001_initial.sql", () => {
		const db = openGatewayDb(":memory:");
		const row = db
			.prepare("SELECT version FROM schema_migrations WHERE version = ?")
			.get("001_initial.sql");
		expect(row).toBeTruthy();
	});
});
