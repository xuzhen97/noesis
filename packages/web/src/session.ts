export const ownerTokenKey = "noesis.ownerToken";
export const themeKey = "noesis.theme";
export const sidebarCollapsedKey = "noesis.sidebarCollapsed";

export type NoesisTheme = "dark" | "light";

export interface BrowserStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export function readOwnerToken(storage: Pick<BrowserStorage, "getItem">): string | null {
	try {
		const token = storage.getItem(ownerTokenKey)?.trim();
		return token === undefined || token.length === 0 ? null : token;
	} catch {
		return null;
	}
}

export function saveOwnerToken(storage: Pick<BrowserStorage, "setItem">, token: string): boolean {
	const normalized = token.trim();

	if (normalized.length === 0) {
		return false;
	}

	try {
		storage.setItem(ownerTokenKey, normalized);
		return true;
	} catch {
		return false;
	}
}

export function clearOwnerToken(storage: Pick<BrowserStorage, "removeItem">): boolean {
	try {
		storage.removeItem(ownerTokenKey);
		return true;
	} catch {
		return false;
	}
}

export function readTheme(
	storage: Pick<BrowserStorage, "getItem">,
	fallback: NoesisTheme = "dark",
): NoesisTheme {
	try {
		const value = storage.getItem(themeKey);
		return value === "dark" || value === "light" ? value : fallback;
	} catch {
		return fallback;
	}
}

export function saveTheme(storage: Pick<BrowserStorage, "setItem">, theme: NoesisTheme): boolean {
	try {
		storage.setItem(themeKey, theme);
		return true;
	} catch {
		return false;
	}
}

export function readSidebarCollapsed(storage: Pick<BrowserStorage, "getItem">): boolean {
	try {
		return storage.getItem(sidebarCollapsedKey) === "true";
	} catch {
		return false;
	}
}

export function saveSidebarCollapsed(
	storage: Pick<BrowserStorage, "setItem">,
	collapsed: boolean,
): boolean {
	try {
		storage.setItem(sidebarCollapsedKey, collapsed ? "true" : "false");
		return true;
	} catch {
		return false;
	}
}
