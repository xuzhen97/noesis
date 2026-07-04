import { startClientAgent } from "./ws-client/index.js";

function readRequired(args: readonly string[], name: string): string {
	const index = args.indexOf(name);
	const value = index === -1 ? undefined : args[index + 1];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

/** 读取 Owner Token：--owner-token 标志优先于 NOESIS_OWNER_TOKEN 环境变量 */
function readOwnerToken(args: readonly string[]): string {
	const flagIndex = args.indexOf("--owner-token");
	if (flagIndex !== -1) {
		const value = args[flagIndex + 1];
		if (value === undefined) throw new Error("--owner-token requires a value");
		return value.trim();
	}
	const env = process.env.NOESIS_OWNER_TOKEN?.trim();
	if (env && env.length > 0) return env;
	throw new Error(
		"Owner Token is required (--owner-token or NOESIS_OWNER_TOKEN)",
	);
}

/**
 * Client Agent 入口：解析 --gateway、--machine-id 和 --owner-token，连接到 Gateway 等待任务派发。
 */
export async function runClientAgentMain(
	args: readonly string[] = process.argv.slice(2),
): Promise<void> {
	const gatewayUrl = readRequired(args, "--gateway");
	const machineId = readRequired(args, "--machine-id");
	const ownerToken = readOwnerToken(args);
	await startClientAgent({ gatewayUrl, machineId, ownerToken });
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
