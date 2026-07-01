import { NoesisClient } from "@noesis/sdk";

export interface CliResult {
	exitCode: number;
	stdout: string;
}

export function runCli(
	args: readonly string[] = process.argv.slice(2),
): CliResult {
	if (args.includes("--help") || args.length === 0) {
		return {
			exitCode: 0,
			stdout: "Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n",
		};
	}

	if (args[0] === "version") {
		const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });
		void client;

		return {
			exitCode: 0,
			stdout: "noesis 0.0.0\nsdk ping protocol 0.1.0\n",
		};
	}

	return {
		exitCode: 1,
		stdout: `Unknown command: ${args.join(" ")}\n`,
	};
}
