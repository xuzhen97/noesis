import { describe, expect, it } from "vitest";
import { open, seal } from "./secret-box.js";

describe("secret-box", () => {
	it("seal/open roundtrip", () => {
		const key = Buffer.alloc(32, 7);
		expect(open(seal("secret", key), key)).toBe("secret");
	});
});
