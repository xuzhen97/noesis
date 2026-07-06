import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startClientAgent } from "@noesis/client";
import { startGateway } from "./gateway-runtime.js";

describe("Gateway transfer import mock E2E", () => {
	const ownerToken = "transfer-owner";
	const machineId = "machine-transfer-e2e";

	beforeEach(() => {
		process.env.NOESIS_STORAGE_MOCK = "1";
	});

	afterEach(() => {
		delete process.env.NOESIS_STORAGE_MOCK;
	});

	it("cli-upload-complete triggers client download and completes", async () => {
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
		const auth = { Authorization: `Bearer ${ownerToken}` };
		try {
			const createRes = await fetch(
				`${gateway.httpUrl}/api/transfers/uploads`,
				{
					method: "POST",
					headers: { ...auth, "Content-Type": "application/json" },
					body: JSON.stringify({
						machineId,
						path: ".",
						filename: "imported.txt",
						size: 24,
						transfer: "aliyundrive",
					}),
				},
			);
			expect(createRes.status).toBe(201);
			const created = (await createRes.json()) as {
				ok: boolean;
				data: { transferId: string; mode: string };
			};
			expect(created.data.mode).toBe("aliyundrive");
			const transferId = created.data.transferId;

			const completeRes = await fetch(
				`${gateway.httpUrl}/api/transfers/${transferId}/cli-upload-complete`,
				{
					method: "POST",
					headers: { ...auth, "Content-Type": "application/json" },
					body: "{}",
				},
			);
			expect(completeRes.status).toBe(200);

			let status = "waiting_client_download";
			for (let i = 0; i < 50; i += 1) {
				const getRes = await fetch(
					`${gateway.httpUrl}/api/transfers/${transferId}`,
					{ headers: auth },
				);
				const body = (await getRes.json()) as {
					ok: boolean;
					data: { status: string };
				};
				status = body.data.status;
				if (status === "completed" || status === "failed") break;
				await new Promise((r) => setTimeout(r, 100));
			}
			expect(status).toBe("completed");
		} finally {
			client.close();
			await gateway.close();
		}
	});
});
