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
				"Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n  noesis task run --gateway <url> --machine <id> --json [--owner-token <token>] -- node -e \"console.log('noesis-ok')\"\n  noesis transfer upload --gateway <url> --machine <id> --file <path> [--path <dir>] [--json] [--owner-token <token>]\n  noesis transfer download --gateway <url> --transfer <id> --out <path> [--json] [--owner-token <token>]\n",
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
					"--owner-token",
					"test-token",
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

	it("fails task run without owner token", async () => {
		await expect(
			runCli([
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
			]),
		).resolves.toEqual({
			exitCode: 1,
			stdout: "",
			stderr:
				"Owner Token is required for task run (--owner-token or NOESIS_OWNER_TOKEN)\n",
		});
	});

	it("reads owner token from NOESIS_OWNER_TOKEN env", async () => {
		process.env.NOESIS_OWNER_TOKEN = "env-token";
		try {
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
		} finally {
			delete process.env.NOESIS_OWNER_TOKEN;
		}
	});
});
