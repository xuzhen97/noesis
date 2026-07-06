import { describe, expect, it } from "vitest";
import { openGatewayDb } from "../../db/sqlite.js";
import { AliyunDriveAuthService } from "./auth.js";

describe("AliyunDriveAuthService", () => {
	it("startOAuth returns authorizationUrl with state", () => {
		const db = openGatewayDb(":memory:");
		const key = Buffer.alloc(32, 1);
		const svc = new AliyunDriveAuthService(db, key);
		svc.saveConfig({ clientId: "cid-test" });
		const start = svc.startOAuth();
		expect(start.authorizationUrl).toContain("state=");
		expect(start.state.length).toBeGreaterThan(0);
	});

	it("status exposes saved account metadata", () => {
		const db = openGatewayDb(":memory:");
		const key = Buffer.alloc(32, 1);
		const svc = new AliyunDriveAuthService(db, key, { now: () => 1_000 });
		svc.saveConfig({ clientId: "cid-test" });
		svc.saveAuth({
			accessToken: "token",
			refreshToken: null,
			tokenType: "Bearer",
			expiresAt: 3_601_000,
			driveId: "drive-1",
			authorizedAccountName: "人称无敌兄",
		});

		const status = svc.getStatus();
		expect(status.driveId).toBe("drive-1");
		expect(status.authorizedAccountName).toBe("人称无敌兄");
		expect(status.expiresAt).toBe(3_601_000);
		expect(status.checkedAt).toEqual(expect.any(Number));
	});
});
