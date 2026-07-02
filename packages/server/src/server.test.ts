import { describe, expect, it } from "vitest";
import { createGatewayApp } from "./index.js";

describe("Gateway health slice", () => {
	it("exposes a minimal Gateway app shape", () => {
		const app = createGatewayApp();

		expect(app.name).toBe("Noesis Gateway");
		expect(app.health).toEqual({
			ok: true,
			service: "gateway",
			protocolVersion: "0.1.0",
		});
		expect(app.slices).toEqual(["health", "machines", "tasks", "ws", "db"]);
	});
});
