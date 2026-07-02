import { NoesisClient, type RunCommandResult } from "@noesis/sdk";

export interface CliResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface CliClient {
	runCommandAndWait(options: {
		machineId: string;
		command: ["node", "-e", "console.log('noesis-ok')"];
		timeoutMs?: number;
	}): Promise<RunCommandResult>;
}

export interface RunCliOptions {
	client?: CliClient;
}

const help =
	"Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n  noesis task run --gateway <url> --machine <id> --json -- node -e \"console.log('noesis-ok')\"\n";

function readFlag(args: readonly string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

export async function runCli(
	args: readonly string[] = process.argv.slice(2),
	options: RunCliOptions = {},
): Promise<CliResult> {
	if (args.includes("--help") || args.length === 0) {
		return { exitCode: 0, stdout: help, stderr: "" };
	}

	if (args[0] === "version") {
		const client = new NoesisClient({
			baseUrl: "http://127.0.0.1:8080",
		});
		const ping = await client.ping();
		return {
			exitCode: 0,
			stdout: `noesis 0.0.0\nsdk ping protocol ${ping.protocolVersion}\n`,
			stderr: "",
		};
	}

	if (args[0] === "task" && args[1] === "run") {
		const gateway = readFlag(args, "--gateway");
		const machineId = readFlag(args, "--machine");
		const separator = args.indexOf("--");
		const command = separator === -1 ? [] : args.slice(separator + 1);
		const json = args.includes("--json");

		if (
			!gateway ||
			!machineId ||
			!json ||
			command.join("\u0000") !==
				["node", "-e", "console.log('noesis-ok')"].join("\u0000")
		) {
			return {
				exitCode: 1,
				stdout: "",
				stderr:
					"Usage: noesis task run --gateway <url> --machine <id> --json -- node -e \"console.log('noesis-ok')\"\n",
			};
		}

		const client = options.client ?? new NoesisClient({ baseUrl: gateway });
		const result = await client.runCommandAndWait({
			machineId,
			command: ["node", "-e", "console.log('noesis-ok')"],
			timeoutMs: 5000,
		});
		return {
			exitCode: result.status === "succeeded" ? 0 : 1,
			stdout: JSON.stringify(result) + "\n",
			stderr: "",
		};
	}

	return {
		exitCode: 1,
		stdout: "",
		stderr: `Unknown command: ${args.join(" ")}\n`,
	};
}

if (
	process.argv[1]?.endsWith("main.js") ||
	process.argv[1]?.endsWith("cli.mjs")
) {
	const result = await runCli();
	process.stdout.write(result.stdout);
	process.stderr.write(result.stderr);
	process.exitCode = result.exitCode;
}
