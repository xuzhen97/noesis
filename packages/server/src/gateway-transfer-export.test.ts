import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startClientAgent } from "@noesis/client";
import { startGateway } from "./gateway-runtime.js";

describe("Gateway transfer export mock E2E", () => {
	const ownerToken = "export-owner";
	const machineId = "machine-export-e2e";

	beforeEach(() => {
		process.env.NOESIS_STORAGE_MOCK = "1";
	});

	afterEach(() => {
		delete process.env.NOESIS_STORAGE_MOCK;
	});

	it("export completes and refresh-download-url works", async () => {
		const localFile = path.join(process.cwd(), "noesis-export-e2e-out.txt");
		await fsp.writeFile(localFile, "export-source-content");

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
			const stat = await fsp.stat(localFile);
			const createRes = await fetch(
				`${gateway.httpUrl}/api/transfers/exports`,
				{
					method: "POST",
					headers: { ...auth, "Content-Type": "application/json" },
					body: JSON.stringify({
						machineId,
						path: ".",
						filename: "noesis-export-e2e-out.txt",
						size: stat.size,
					}),
				},
			);
			expect(createRes.status).toBe(201);
			const created = (await createRes.json()) as {
				ok: boolean;
				data: { transferId: string };
			};
			const transferId = created.data.transferId;

			let status = "waiting_client_upload";
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

			const dlRes = await fetch(
				`${gateway.httpUrl}/api/transfers/${transferId}/refresh-download-url`,
				{
					method: "POST",
					headers: { ...auth, "Content-Type": "application/json" },
					body: "{}",
				},
			);
			expect(dlRes.status).toBe(200);
			const dl = (await dlRes.json()) as {
				ok: boolean;
				data: { downloadUrl: string };
			};
			expect(dl.data.downloadUrl).toContain("noesis-mock-transfer");
		} finally {
			client.close();
			await gateway.close();
			await fsp.rm(localFile, { force: true });
		}
	}, 15_000);
});
