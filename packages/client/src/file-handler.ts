import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { createNoesisError } from "@noesis/shared";

const MAX_WRITE_BYTES = 10 * 1024 * 1024;

export interface FileListEntry {
	name: string;
	path: string;
	kind: "file" | "directory";
	size?: number;
}

function normalizeAllowed(allowedPaths: string[] | undefined): string[] {
	if (!allowedPaths?.length) return [process.cwd()];
	return allowedPaths.map((p) => path.resolve(p));
}

function assertInsideRoots(target: string, roots: string[]): void {
	const resolved = path.resolve(target);
	const ok = roots.some(
		(root) => resolved === root || resolved.startsWith(root + path.sep),
	);
	if (!ok) {
		throw createNoesisError(
			"PATH_NOT_ALLOWED",
			"Path is outside allowed roots",
		);
	}
}

function resolveTarget(
	rootPath: string,
	relativePath: string,
	roots: string[],
): string {
	const base = path.resolve(rootPath);
	assertInsideRoots(base, roots);
	const target = path.resolve(base, relativePath === "." ? "" : relativePath);
	assertInsideRoots(target, roots);
	return target;
}

/** 执行 file.list */
export async function executeFileListTask(payload: {
	diskId?: string;
	path: string;
	allowedPaths?: string[];
}): Promise<{ entries: FileListEntry[] }> {
	const roots = normalizeAllowed(payload.allowedPaths);
	const rootPath = roots[0];
	const dir = resolveTarget(rootPath, payload.path, roots);
	const names = await fsp.readdir(dir);
	const entries: FileListEntry[] = [];
	for (const name of names) {
		const full = path.join(dir, name);
		const stat = await fsp.stat(full);
		entries.push({
			name,
			path:
				path.posix
					.join(
						payload.path === "." ? "" : payload.path.replace(/\\/g, "/"),
						name,
					)
					.replace(/^\//, "") || name,
			kind: stat.isDirectory() ? "directory" : "file",
			size: stat.isFile() ? stat.size : undefined,
		});
	}
	return { entries };
}

/** 执行 file.read（文本或 base64） */
export async function executeFileReadTask(payload: {
	path: string;
	encoding?: "utf8" | "base64";
	allowedPaths?: string[];
}): Promise<{ content: string; size: number }> {
	const roots = normalizeAllowed(payload.allowedPaths);
	const filePath = resolveTarget(roots[0], payload.path, roots);
	const stat = await fsp.stat(filePath);
	if (!stat.isFile()) {
		throw createNoesisError("BAD_REQUEST", "Not a file");
	}
	if (stat.size > MAX_WRITE_BYTES) {
		throw createNoesisError("FILE_TOO_LARGE", "File exceeds read limit");
	}
	const buf = await fsp.readFile(filePath);
	const encoding = payload.encoding ?? "utf8";
	if (encoding === "base64") {
		return { content: buf.toString("base64"), size: stat.size };
	}
	return { content: buf.toString("utf8"), size: stat.size };
}

/** 执行 file.write（≤10MB） */
export async function executeFileWriteTask(payload: {
	path: string;
	content: string;
	encoding?: "utf8" | "base64";
	allowedPaths?: string[];
}): Promise<{ path: string; size: number }> {
	const roots = normalizeAllowed(payload.allowedPaths);
	const filePath = resolveTarget(roots[0], payload.path, roots);
	const encoding = payload.encoding ?? "utf8";
	const buf =
		encoding === "base64"
			? Buffer.from(payload.content, "base64")
			: Buffer.from(payload.content, "utf8");
	if (buf.length > MAX_WRITE_BYTES) {
		throw createNoesisError("FILE_TOO_LARGE", "Write exceeds 10MB limit");
	}
	await fsp.mkdir(path.dirname(filePath), { recursive: true });
	await fsp.writeFile(filePath, buf);
	return { path: payload.path, size: buf.length };
}

/** 本机默认磁盘列表（hello 上报） */
export function defaultDisks(): Array<{
	id: string;
	label: string;
	path: string;
}> {
	const cwd = process.cwd();
	return [{ id: "default", label: "工作目录", path: cwd }];
}
