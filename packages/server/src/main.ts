import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startGateway } from "./gateway-runtime.js";

function readFlag(args: readonly string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

function readPort(args: readonly string[]): number {
	const value = readFlag(args, "--port");
	if (value === undefined) return 8080;
	const port = Number(value);
	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		throw new Error("--port must be an integer between 0 and 65535");
	}
	return port;
}

/** 读取 Owner Token：--owner-token 标志优先于 NOESIS_OWNER_TOKEN 环境变量 */
function readOwnerToken(args: readonly string[]): string {
	const flag = readFlag(args, "--owner-token");
	if (flag !== undefined) return flag.trim();
	const env = process.env.NOESIS_OWNER_TOKEN?.trim();
	if (env && env.length > 0) return env;
	throw new Error(
		"Owner Token is required (--owner-token or NOESIS_OWNER_TOKEN)",
	);
}

/** 读取 Web 目录：--web-dir 标志优先于 dist 目录旁的默认 ../web */
function readWebDir(args: readonly string[]): string | undefined {
	const flag = readFlag(args, "--web-dir");
	if (flag !== undefined) return flag;
	const distDir = dirname(fileURLToPath(import.meta.url));
	const candidate = join(distDir, "..", "web");
	return existsSync(candidate) ? candidate : undefined;
}

/**
 * Gateway 入口：解析命令行参数 --port、--owner-token、--web-dir，启动 Gateway，输出 JSON 就绪消息到 stdout。
 */
export async function runGatewayMain(
	args: readonly string[] = process.argv.slice(2),
): Promise<void> {
	const gateway = await startGateway({
		port: readPort(args),
		ownerToken: readOwnerToken(args),
		webDir: readWebDir(args),
	});
	console.log(
		JSON.stringify({
			type: "NOESIS_GATEWAY_READY",
			httpUrl: gateway.httpUrl,
			wsUrl: gateway.wsUrl,
			port: gateway.port,
		}),
	);
}

if (
	process.argv[1]?.endsWith("main.js") ||
	process.argv[1]?.endsWith("gateway.mjs")
) {
	runGatewayMain().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
