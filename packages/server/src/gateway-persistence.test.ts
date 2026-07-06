import { describe, expect, it } from "vitest";
import { startGateway } from "./gateway-runtime.js";

describe("Gateway task persistence", () => {
	it("persists created task to SQLite", async () => {
		const gateway = await startGateway({
			port: 0,
			ownerToken: "test-owner-token",
			databasePath: ":memory:",
		});
		try {
			const res = await fetch(`${gateway.httpUrl}/api/tasks`, {
				method: "POST",
				headers: {
					Authorization: "Bearer test-owner-token",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					machineId: "machine-a",
					taskType: "command.run",
					payload: { command: ["node", "-e", "console.log('noesis-ok')"] },
				}),
			});
			expect(res.status).toBe(201);
			const body = (await res.json()) as { ok: boolean; data: { id: string } };
			expect(body.ok).toBe(true);

			const getRes = await fetch(
				`${gateway.httpUrl}/api/tasks/${body.data.id}`,
				{ headers: { Authorization: "Bearer test-owner-token" } },
			);
			expect(getRes.status).toBe(200);
		} finally {
			await gateway.close();
		}
	});
});
