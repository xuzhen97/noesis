import { describe, expect, it } from "vitest";
import { createClientSupervisor } from "./index.js";
import { executeCommandRunTask } from "./command-executor/index.js";

describe("Client Agent command.run shape", () => {
	it("exposes the P0 Client Agent execution shape without running a shell", () => {
		const supervisor = createClientSupervisor({
			gatewayUrl: "http://127.0.0.1:8080",
		});

		expect(supervisor.kind).toBe("client-agent-supervisor");
		expect(supervisor.ws.gatewayUrl).toBe("http://127.0.0.1:8080");
		expect(supervisor.taskRunner.canHandle("command.run")).toBe(true);
		expect(supervisor.commandExecutor.describe()).toEqual({
			taskType: "command.run",
			execution: "not-started",
		});
	});

	it("executes only the fixed distribution smoke command", async () => {
		await expect(
			executeCommandRunTask({ command: ["node", "-e", "console.log('noesis-ok')"] }),
		).resolves.toEqual({
			stdout: "noesis-ok\n",
			stderr: "",
			exitCode: 0,
		});
	});

	it("rejects any command outside the fixed distribution smoke command", async () => {
		await expect(
			executeCommandRunTask({ command: ["node", "-e", "console.log('no')"] }),
		).rejects.toMatchObject({
			code: "COMMAND_NOT_ALLOWED",
		});
	});
});
