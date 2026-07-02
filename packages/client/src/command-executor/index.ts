import { spawn } from "node:child_process";
import { createNoesisError, type CommandRunPayload } from "@noesis/shared";
import type { TaskType } from "@noesis/shared";

export interface CommandExecutorShape {
	describe(): { taskType: TaskType; execution: "not-started" };
}

export interface CommandRunResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

function isAllowedDistributionCommand(payload: CommandRunPayload): boolean {
	return (
		payload.command.length === 3 &&
		payload.command[0] === "node" &&
		payload.command[1] === "-e" &&
		payload.command[2] === "console.log('noesis-ok')"
	);
}

export async function executeCommandRunTask(
	payload: CommandRunPayload,
): Promise<CommandRunResult> {
	if (!isAllowedDistributionCommand(payload)) {
		throw createNoesisError(
			"COMMAND_NOT_ALLOWED",
			"Only the Noesis Distribution smoke command is allowed",
		);
	}

	return await new Promise<CommandRunResult>((resolve, reject) => {
		const child = spawn(process.execPath, ["-e", "console.log('noesis-ok')"], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
		child.on("error", reject);
		child.on("close", (exitCode) =>
			resolve({
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				exitCode: exitCode ?? 1,
			}),
		);
	});
}

export function createCommandExecutorShape(): CommandExecutorShape {
	return {
		describe() {
			return {
				taskType: "command.run",
				execution: "not-started",
			};
		},
	};
}
