import { describe, expect, it } from "vitest";
import { AliyunDriveOpenApiClient } from "./openapi.js";

describe("AliyunDriveOpenApiClient", () => {
	it("getDriveInfo parses default_drive_id", async () => {
		const fetchImpl = async () =>
			new Response(JSON.stringify({ default_drive_id: "drive-1" }), {
				status: 200,
			});
		const client = new AliyunDriveOpenApiClient({
			openapiBase: "https://openapi.alipan.com",
			accessToken: "tok",
			fetchImpl: fetchImpl as typeof fetch,
		});
		const info = await client.getDriveInfo();
		expect(info.driveId).toBe("drive-1");
	});
});
