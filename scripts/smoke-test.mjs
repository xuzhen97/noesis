// 本地源码冒烟测试：启动 Gateway → 启动 Client Agent → 执行 CLI → 验证输出 → 清理。
// 跨平台 (Windows/Linux/macOS)，用法：pnpm test:smoke 或 node scripts/smoke-test.mjs
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const gatewayScript = join(root, "packages", "server", "dist", "main.js");
const clientScript = join(root, "packages", "client", "dist", "main.js");
const cliScript = join(root, "packages", "cli", "dist", "main.js");

const token = process.env.NOESIS_OWNER_TOKEN ?? "dev-owner-token";
const machineId = "smoke-machine";

const children = [];

function cleanup() {
	for (const child of children.reverse()) {
		try {
			child.kill();
		} catch {
			/* ignore */
		}
	}
}

function waitForLine(child, marker, label) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`${label} 启动超时 (${marker})`)),
			15000,
		);
		let buffer = "";
		child.stdout.on("data", (chunk) => {
			buffer += String(chunk);
			if (buffer.includes(marker)) {
				clearTimeout(timer);
				resolve(buffer);
			}
		});
		child.on("exit", (code) => {
			clearTimeout(timer);
			if (code !== 0) reject(new Error(`${label} 异常退出 (${code})`));
		});
	});
}

try {
	console.log("===== Noesis Smoke Test =====\n");

	// 1. Build
	console.log("1. 构建...");
	const build = spawnSync("pnpm", ["build"], {
		cwd: root,
		shell: true,
		stdio: "inherit",
	});
	if (build.status !== 0) throw new Error("构建失败");
	console.log("");

	// 2. Start Gateway
	console.log("2. 启动 Gateway...");
	const gateway = spawn(
		process.execPath,
		[gatewayScript, "--port", "0", "--owner-token", token],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	children.push(gateway);

	gateway.stderr.on("data", (d) => process.stderr.write(d));

	const raw = await waitForLine(gateway, "NOESIS_GATEWAY_READY", "Gateway");
	const ready = JSON.parse(
		raw.split("\n").find((l) => l.includes("NOESIS_GATEWAY_READY")),
	);
	console.log(`   Gateway → ${ready.httpUrl}\n`);

	// 3. Start Client Agent
	console.log("3. 启动 Client Agent...");
	const client = spawn(
		process.execPath,
		[
			clientScript,
			"--gateway",
			ready.httpUrl,
			"--machine-id",
			machineId,
			"--owner-token",
			token,
		],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	children.push(client);

	client.stderr.on("data", (d) => process.stderr.write(d));
	await waitForLine(client, "NOESIS_CLIENT_AGENT_READY", "Client Agent");
	console.log(`   Client Agent → ${machineId}\n`);

	// 4. Run CLI
	console.log("4. 执行 CLI...");
	const cli = spawnSync(
		process.execPath,
		[
			cliScript,
			"task",
			"run",
			"--gateway",
			ready.httpUrl,
			"--machine",
			machineId,
			"--owner-token",
			token,
			"--json",
			"--",
			"node",
			"-e",
			"console.log('noesis-ok')",
		],
		{ cwd: root, stdio: "pipe", encoding: "utf8" },
	);

	if (cli.status !== 0) {
		console.error(cli.stderr);
		throw new Error(`CLI 失败 (exit ${cli.status})`);
	}

	const result = JSON.parse(cli.stdout.trim());
	if (result.status !== "succeeded" || result.stdout !== "noesis-ok\n") {
		throw new Error(`CLI 未返回预期结果: ${cli.stdout}`);
	}
	console.log(`   stdout: ${result.stdout.trim()}`);
	console.log(`   status: ${result.status}\n`);

	// 5. Test bad token
	console.log("5. 错误 token → 预期返回 exitCode 1...");
	const badToken = spawnSync(
		process.execPath,
		[
			cliScript,
			"task",
			"run",
			"--gateway",
			ready.httpUrl,
			"--machine",
			machineId,
			"--owner-token",
			"wrong-token",
			"--json",
			"--",
			"node",
			"-e",
			"console.log('noesis-ok')",
		],
		{ cwd: root, stdio: "pipe", encoding: "utf8" },
	);
	// 预期 SDK 收到 401, 抛出错误, CLI 退出码非 0
	if (badToken.status === 0) {
		throw new Error("错误 token 应返回非零退出码");
	}
	console.log(`   exitCode: ${badToken.status}\n`);

	console.log("===== Smoke Test 通过 =====");
} catch (e) {
	console.error("\n" + e.message);
	process.exitCode = 1;
} finally {
	cleanup();
}
