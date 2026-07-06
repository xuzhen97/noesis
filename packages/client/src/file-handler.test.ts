import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	executeFileListTask,
	executeFileReadTask,
	executeFileWriteTask,
} from "./file-handler.js";

let tmpDir = "";

afterEach(async () => {
	if (tmpDir) await fsp.rm(tmpDir, { recursive: true, force: true });
	tmpDir = "";
});

describe("file-handler", () => {
	it("lists directory entries", async () => {
		tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "noesis-file-"));
		await fsp.writeFile(path.join(tmpDir, "a.txt"), "hi");
		const { entries } = await executeFileListTask({
			path: ".",
			allowedPaths: [tmpDir],
		});
		expect(entries.some((e) => e.name === "a.txt")).toBe(true);
	});

	it("writes and reads utf8", async () => {
		tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "noesis-file-"));
		await executeFileWriteTask({
			path: "sub/b.txt",
			content: "hello",
			allowedPaths: [tmpDir],
		});
		const read = await executeFileReadTask({
			path: "sub/b.txt",
			allowedPaths: [tmpDir],
		});
		expect(read.content).toBe("hello");
	});
});
