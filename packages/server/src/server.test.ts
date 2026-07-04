import { describe, expect, it } from "vitest";
import { createGatewayApp } from "./index.js";
import { readBearerToken, ownerTokenEquals } from "./auth.js";

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

describe("readBearerToken", () => {
	it("extracts Bearer token from Authorization header", () => {
		expect(readBearerToken("Bearer my-token")).toBe("my-token");
	});

	it("returns null for missing header", () => {
		expect(readBearerToken(undefined)).toBeNull();
	});

	it("returns null for non-Bearer header", () => {
		expect(readBearerToken("Basic abc")).toBeNull();
	});

	it("returns null for empty token", () => {
		expect(readBearerToken("Bearer ")).toBeNull();
	});
});

describe("ownerTokenEquals", () => {
	it("matches identical tokens", () => {
		expect(ownerTokenEquals("abc", "abc")).toBe(true);
	});

	it("rejects different tokens", () => {
		expect(ownerTokenEquals("abc", "abd")).toBe(false);
	});

	it("rejects different length tokens", () => {
		expect(ownerTokenEquals("abc", "ab")).toBe(false);
	});

	it("matches with timing-safe comparison", () => {
		const token = "dev-owner-token-12345";
		expect(ownerTokenEquals(token, token)).toBe(true);
	});
});
