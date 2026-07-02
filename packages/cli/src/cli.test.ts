import { describe, expect, it } from "vitest";
import { runCli, type CliClient } from "./main.js";

const fakeClient: CliClient = {
	runCommandAndWait: async () => ({
		taskId: "task_1",
		status: "succeeded",
		stdout: "noesis-ok\n",
	}),
};

describe("Noesis CLI shell", () => {
	it("renders help", async () => {
		await expect(runCli(["--help"])).resolves.toEqual({
			exitCode: 0,
			stdout:
				"Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n  noesis task run --gateway <url> --machine <id> --json -- node -e \"console.log('noesis-ok')\"\n",
			stderr: "",
		});
	});

	it("renders version through the SDK shell", async () => {
		await expect(runCli(["version"])).resolves.toEqual({
			exitCode: 0,
			stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
			stderr: "",
		});
	});

	it("runs a distribution smoke command and prints JSON", async () => {
		await expect(
			runCli(
				[
					"task",
					"run",
					"--gateway",
					"http://127.0.0.1:8080",
					"--machine",
					"local-dev-machine",
					"--json",
					"--",
					"node",
					"-e",
					"console.log('noesis-ok')",
				],
				{ client: fakeClient },
			),
		).resolves.toEqual({
			exitCode: 0,
			stdout:
				JSON.stringify({
					taskId: "task_1",
					status: "succeeded",
					stdout: "noesis-ok\n",
				}) + "\n",
			stderr: "",
		});
	});
});
