import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openGatewayDb } from "./db/sqlite.js";
import { AliyunDriveAuthService } from "./storage/aliyundrive/auth.js";
import { TransferService } from "./transfer.js";

describe("TransferService mock import", () => {
	let db: ReturnType<typeof openGatewayDb>;
	const key = Buffer.alloc(32, 3);

	beforeEach(() => {
		process.env.NOESIS_STORAGE_MOCK = "1";
		db = openGatewayDb(":memory:");
	});

	afterEach(() => {
		delete process.env.NOESIS_STORAGE_MOCK;
	});

	it("creates aliyundrive upload plan", async () => {
		const auth = new AliyunDriveAuthService(db, key);
		const svc = new TransferService(db, auth, {
			sendToMachine: () => true,
		});
		const plan = await svc.createImportUpload({
			machineId: "m1",
			path: ".",
			filename: "a.bin",
			size: 128,
		});
		expect(plan.mode).toBe("aliyundrive");
		if (plan.mode === "aliyundrive") {
			expect(plan.uploadParts.length).toBeGreaterThan(0);
		}
	});
});
