import { describe, expect, it } from "vitest";
import { startClientAgent } from "@noesis/client";
import { startGateway } from "./gateway-runtime.js";

describe("Gateway file.list API", () => {
	it("sync waits for client and returns entries", async () => {
		const ownerToken = "file-test-owner";
		const machineId = "machine-file-test";
		const gateway = await startGateway({
			port: 0,
			ownerToken,
			databasePath: ":memory:",
		});
		const client = await startClientAgent({
			gatewayUrl: gateway.httpUrl,
			machineId,
			ownerToken,
		});
		try {
			const res = await fetch(`${gateway.httpUrl}/api/files/list`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${ownerToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ machineId, path: "." }),
			});
			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				ok: boolean;
				data: { entries: unknown[] };
			};
			expect(body.ok).toBe(true);
			expect(Array.isArray(body.data.entries)).toBe(true);
		} finally {
			client.close();
			await gateway.close();
		}
	});
});
