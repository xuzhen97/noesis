import { describe, expect, it } from "vitest";
import {
	clearOwnerToken,
	ownerTokenKey,
	readOwnerToken,
	readTheme,
	saveOwnerToken,
	saveTheme,
	themeKey,
	type BrowserStorage,
} from "./session.js";

class MemoryStorage implements BrowserStorage {
	private readonly values = new Map<string, string>();

	public shouldThrow = false;

	getItem(key: string): string | null {
		if (this.shouldThrow) {
			throw new Error("storage unavailable");
		}

		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		if (this.shouldThrow) {
			throw new Error("storage unavailable");
		}

		this.values.set(key, value);
	}

	removeItem(key: string): void {
		if (this.shouldThrow) {
			throw new Error("storage unavailable");
		}

		this.values.delete(key);
	}
}

describe("Owner Token storage", () => {
	it("trims and stores a non-empty Owner Token", () => {
		const storage = new MemoryStorage();

		expect(saveOwnerToken(storage, "  owner-token  ")).toBe(true);
		expect(readOwnerToken(storage)).toBe("owner-token");
	});

	it("rejects an empty Owner Token", () => {
		const storage = new MemoryStorage();

		expect(saveOwnerToken(storage, "   ")).toBe(false);
		expect(storage.getItem(ownerTokenKey)).toBeNull();
	});

	it("clears an existing Owner Token", () => {
		const storage = new MemoryStorage();
		expect(saveOwnerToken(storage, "owner-token")).toBe(true);

		expect(clearOwnerToken(storage)).toBe(true);
		expect(readOwnerToken(storage)).toBeNull();
	});

	it("fails closed when storage throws", () => {
		const storage = new MemoryStorage();
		storage.shouldThrow = true;

		expect(saveOwnerToken(storage, "owner-token")).toBe(false);
		expect(readOwnerToken(storage)).toBeNull();
		expect(clearOwnerToken(storage)).toBe(false);
	});
});

describe("theme storage", () => {
	it("stores dark and light theme preferences", () => {
		const storage = new MemoryStorage();

		expect(saveTheme(storage, "light")).toBe(true);
		expect(storage.getItem(themeKey)).toBe("light");
		expect(readTheme(storage)).toBe("light");

		expect(saveTheme(storage, "dark")).toBe(true);
		expect(readTheme(storage)).toBe("dark");
	});

	it("falls back to dark for unknown theme values", () => {
		const storage = new MemoryStorage();
		storage.setItem(themeKey, "neon");

		expect(readTheme(storage)).toBe("dark");
	});

	it("falls back when storage throws", () => {
		const storage = new MemoryStorage();
		storage.shouldThrow = true;

		expect(readTheme(storage, "light")).toBe("light");
		expect(saveTheme(storage, "dark")).toBe(false);
	});
});
