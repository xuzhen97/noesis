import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

function posix(p) { return p.replace(/\\/g, "/"); }

function tarBin() {
	if (process.platform !== "win32") return "tar";
	const winTar = "C:\\Windows\\System32\\tar.exe";
	if (existsSync(winTar)) return winTar;
	return "tar";
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const releaseDir = join(root, "release", "noesis-distribution");

function run(command, args, options) {
	const isTar = command === "tar";
	const cmd = isTar ? tarBin() : command;
	const result = spawnSync(cmd, args, {
		cwd: root,
		stdio: "inherit",
		shell: !isTar && process.platform === "win32",
		...options,
	});
	if (result.status !== 0) {
		throw new Error(`${cmd} ${args.join(" ")} failed`);
	}
}

function runCapture(command, args, options) {
	const result = spawnSync(command, args, {
		cwd: root,
		encoding: "utf8",
		shell: process.platform === "win32",
		...options,
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
		);
	}
	return result.stdout;
}

async function sha256(path) {
	const hash = createHash("sha256");
	hash.update(await readFile(path));
	return hash.digest("hex");
}

async function verifyHash(file, expected) {
	const actual = await sha256(file);
	if (actual !== expected) {
		throw new Error(`sha256 mismatch for ${file}`);
	}
}

function waitForLine(child, marker) {
	return new Promise((resolve, reject) => {
		let buffer = "";
		const timer = setTimeout(
			() => reject(new Error(`Timed out waiting for ${marker}`)),
			5000,
		);
		child.stdout.on("data", (chunk) => {
			buffer += String(chunk);
			const lines = buffer.split(/\r?\n/);
			for (const line of lines) {
				if (!line.includes(marker)) continue;
				clearTimeout(timer);
				try {
					resolve(JSON.parse(line));
				} catch {
					reject(new Error(`Invalid JSON from ${marker}: ${line}`));
				}
				return;
			}
		});
		child.stderr.on("data", (chunk) => process.stderr.write(chunk));
		child.on("exit", (code) => {
			reject(new Error(`${marker} process exited early with ${code}`));
		});
	});
}

function startNode(script, args) {
	return spawn(process.execPath, [script, ...args], {
		stdio: ["ignore", "pipe", "pipe"],
	});
}

const tempDir = await mkdtemp(join(tmpdir(), "noesis-distribution-"));
const children = [];

try {
	run("pnpm", ["build:distribution"]);
	const manifest = JSON.parse(
		await readFile(join(releaseDir, "manifest.json"), "utf8"),
	);

	// Verify hashes
	for (const artifact of Object.values(manifest.artifacts)) {
		await verifyHash(join(releaseDir, artifact.file), artifact.sha256);
	}

	// Extract tar.gz artifacts
	run("tar", [
		"-xzf",
		posix(join(releaseDir, manifest.artifacts.gateway.file)),
		"-C",
		posix(tempDir),
	]);
	run("tar", [
		"-xzf",
		posix(join(releaseDir, manifest.artifacts.clientAgent.file)),
		"-C",
		posix(tempDir),
	]);

	const gatewayDir = join(tempDir, `noesis-gateway-${manifest.version}`);
	const clientDir = join(tempDir, `noesis-client-agent-${manifest.version}`);
	const prefix = join(tempDir, "npm-prefix");

	// Install CLI via npm
	run("npm", [
		"install",
		"--prefix",
		prefix,
		join(releaseDir, manifest.artifacts.cli.file),
		"--ignore-scripts",
		"--no-audit",
		"--fund=false",
		"--offline",
	]);

	// Start Gateway
	const gateway = startNode(join(gatewayDir, "dist", "gateway.mjs"), [
		"--port",
		"0",
	]);
	children.push(gateway);
	const ready = await waitForLine(gateway, "NOESIS_GATEWAY_READY");

	// Start Client Agent
	const client = startNode(join(clientDir, "dist", "client-agent.mjs"), [
		"--gateway",
		ready.httpUrl,
		"--machine-id",
		"local-dev-machine",
	]);
	children.push(client);
	await waitForLine(client, "NOESIS_CLIENT_AGENT_READY");

	// Run CLI task via the bundled cli.mjs
	// Find the CLI cli.mjs in the installed package
	const { readdirSync } = await import("node:fs");
	let cliScript = join(
		prefix,
		"node_modules",
		"@noesis",
		"cli",
		"dist",
		"cli.mjs",
	);
	if (!existsSync(cliScript)) {
		cliScript = null;
		const nm = join(prefix, "node_modules");
		if (existsSync(nm)) {
			for (const f of readdirSync(nm)) {
				const p = join(nm, f, "dist", "cli.mjs");
				if (existsSync(p)) {
					cliScript = p;
					break;
				}
			}
		}
		if (!cliScript)
			throw new Error("CLI cli.mjs not found in installed package");
	}

	const stdout = runCapture(process.execPath, [
		cliScript,
		"task",
		"run",
		"--gateway",
		ready.httpUrl,
		"--machine",
		"local-dev-machine",
		"--json",
		"--",
		"node",
		"-e",
		"console.log('noesis-ok')",
	]);
	const result = JSON.parse(stdout);
	if (result.status !== "succeeded") {
		throw new Error(`Expected succeeded, got ${result.status}`);
	}
	if (result.stdout !== "noesis-ok\n") {
		throw new Error(
			`Expected noesis-ok stdout, got ${JSON.stringify(result.stdout)}`,
		);
	}

	console.log("Noesis Distribution verification OK");
} finally {
	for (const child of children.reverse()) {
		try {
			child.kill();
		} catch {
			/* ignore cleanup failures */
		}
	}
	await rm(tempDir, { recursive: true, force: true });
}
