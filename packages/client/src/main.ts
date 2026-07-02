import { startClientAgent } from "./ws-client/index.js";

function readRequired(args: readonly string[], name: string): string {
	const index = args.indexOf(name);
	const value = index === -1 ? undefined : args[index + 1];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

export async function runClientAgentMain(
	args: readonly string[] = process.argv.slice(2),
): Promise<void> {
	const gatewayUrl = readRequired(args, "--gateway");
	const machineId = readRequired(args, "--machine-id");
	await startClientAgent({ gatewayUrl, machineId });
	console.log(
		JSON.stringify({
			type: "NOESIS_CLIENT_AGENT_READY",
			gatewayUrl,
			machineId,
		}),
	);
}

if (
	process.argv[1]?.endsWith("main.js") ||
	process.argv[1]?.endsWith("client-agent.mjs")
) {
	runClientAgentMain().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
