import { describe, expect, it } from "vitest";
import { NoesisClient } from "./index.js";

describe("Noesis SDK shell", () => {
	it("constructs a client and exposes a deterministic ping shape", async () => {
		const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });

		await expect(client.ping()).resolves.toEqual({
			ok: true,
			baseUrl: "http://127.0.0.1:8080",
			protocolVersion: "0.1.0",
		});
	});
});
