import { describe, expect, it } from "vitest";
import { buildPartInfoList, resolveAliyunPartSize } from "./upload-planner.js";

describe("aliyundrive-upload-planner", () => {
	it("single part for small file", () => {
		expect(buildPartInfoList(1)).toEqual([{ part_number: 1 }]);
	});

	it("resolveAliyunPartSize for tiny file", () => {
		expect(resolveAliyunPartSize(1024)).toBe(64 * 1024 * 1024);
	});
});
