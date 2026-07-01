import { describe, expect, it } from "vitest";
import { runCli } from "./main.js";

describe("Noesis CLI shell", () => {
	it("renders help", () => {
		expect(runCli(["--help"])).toEqual({
			exitCode: 0,
			stdout: "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n",
		});
	});

	it("renders version through the SDK shell", () => {
		expect(runCli(["version"])).toEqual({
			exitCode: 0,
			stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
		});
	});
});
