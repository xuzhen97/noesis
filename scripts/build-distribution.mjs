import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function posix(p) {
	return p.replace(/\\/g, "/");
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const releaseDir = join(root, "release", "noesis-distribution");
const stagingDir = join(releaseDir, ".staging");
const pkgRaw = await readFile(join(root, "package.json"), "utf8");
let pkg;
try {
	pkg = JSON.parse(pkgRaw);
} catch {
	throw new Error("root package.json is not valid JSON");
}
const version = pkg.version;

async function bundle(entry, outfile) {
	await build({
		entryPoints: [entry],
		outfile,
		bundle: true,
		platform: "node",
		format: "esm",
		target: "node24",
		sourcemap: false,
		external: ["ws"],
	});
}

function tarBin() {
	if (process.platform !== "win32") return "tar";
	// Windows built-in tar understands forward-slash paths
	const winTar = "C:\\Windows\\System32\\tar.exe";
	if (existsSync(winTar)) return winTar;
	return "tar";
}

function run(command, args, cwd) {
	const isTar = command === "tar";
	const cmd = isTar ? tarBin() : command;
	const result = spawnSync(cmd, args, {
		cwd: cwd ?? root,
		stdio: "inherit",
		shell: !isTar && process.platform === "win32",
	});
	if (result.status !== 0) {
		throw new Error(`${cmd} ${args.join(" ")} failed`);
	}
}

async function sha256(path) {
	const hash = createHash("sha256");
	hash.update(await readFile(path));
	return hash.digest("hex");
}

async function writeLauncher(dir, name, target) {
	await mkdir(join(dir, "bin"), { recursive: true });
	await writeFile(
		join(dir, "bin", `${name}.sh`),
		"#!/usr/bin/env bash\n" +
			"set -euo pipefail\n" +
			'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"' +
			"\n" +
			`node "$SCRIPT_DIR/../dist/${target}" "$@"\n`,
	);
	await writeFile(
		join(dir, "bin", `${name}.ps1`),
		"$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition" +
			"\n" +
			`node (Join-Path $ScriptDir "../dist/${target}") @args` +
			"\n",
	);
}

async function packTar(sourceDir, artifactName) {
	const artifact = posix(join(releaseDir, artifactName));
	run("tar", [
		"-czf",
		artifact,
		"-C",
		posix(stagingDir),
		basename(sourceDir),
	]);
	return artifactName;
}

async function vendorWs(targetDir) {
	const wsDir = join(root, "packages", "server", "node_modules", "ws");
	if (!existsSync(wsDir)) throw new Error("ws not found at " + wsDir);
	const nmDir = join(targetDir, "node_modules");
	await mkdir(nmDir, { recursive: true });
	run(process.platform === "win32" ? "xcopy" : "cp", [
		process.platform === "win32" ? wsDir + "\\*" : wsDir,
		join(nmDir, "ws"),
		process.platform === "win32" ? "/E /I /Q" : "-r",
	]);
}

async function packNpm(packageDir) {
	run(
		"npm",
		["pack", packageDir, "--pack-destination", releaseDir, "--ignore-scripts"],
		root,
	);
}

// Clean
await rm(releaseDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

// Gateway
const gatewayDir = join(stagingDir, `noesis-gateway-${version}`);
await mkdir(join(gatewayDir, "dist"), { recursive: true });
await bundle(
	join(root, "packages", "server", "src", "main.ts"),
	join(gatewayDir, "dist", "gateway.mjs"),
);
await vendorWs(gatewayDir);
await writeLauncher(gatewayDir, "noesis-gateway", "gateway.mjs");
await writeFile(
	join(gatewayDir, "package.json"),
	JSON.stringify({ name: "noesis-gateway", version, type: "module" }, null, 2) +
		"\n",
);
const gatewayArtifact = await packTar(
	gatewayDir,
	`noesis-gateway-${version}.tar.gz`,
);

// Client Agent
const clientDir = join(stagingDir, `noesis-client-agent-${version}`);
await mkdir(join(clientDir, "dist"), { recursive: true });
await bundle(
	join(root, "packages", "client", "src", "main.ts"),
	join(clientDir, "dist", "client-agent.mjs"),
);
await vendorWs(clientDir);
await writeLauncher(clientDir, "noesis-client-agent", "client-agent.mjs");
await writeFile(
	join(clientDir, "package.json"),
	JSON.stringify(
		{ name: "noesis-client-agent", version, type: "module" },
		null,
		2,
	) + "\n",
);
const clientArtifact = await packTar(
	clientDir,
	`noesis-client-agent-${version}.tar.gz`,
);

// SDK
const sdkPackageDir = join(stagingDir, "sdk-package");
await mkdir(join(sdkPackageDir, "dist"), { recursive: true });
await bundle(
	join(root, "packages", "sdk", "src", "index.ts"),
	join(sdkPackageDir, "dist", "index.js"),
);
const dtsPath = join(root, "packages", "sdk", "dist", "index.d.ts");
if (existsSync(dtsPath)) {
	const { cp } = await import("node:fs/promises");
	await cp(dtsPath, join(sdkPackageDir, "dist", "index.d.ts"));
}
await writeFile(
	join(sdkPackageDir, "package.json"),
	JSON.stringify(
		{
			name: "@noesis/sdk",
			version,
			type: "module",
			main: "dist/index.js",
			types: "dist/index.d.ts",
			exports: {
				".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
			},
		},
		null,
		2,
	) + "\n",
);
await packNpm(sdkPackageDir);

// CLI
const cliPackageDir = join(stagingDir, "cli-package");
await mkdir(join(cliPackageDir, "dist"), { recursive: true });
await bundle(
	join(root, "packages", "cli", "src", "main.ts"),
	join(cliPackageDir, "dist", "cli.mjs"),
);
await writeFile(
	join(cliPackageDir, "package.json"),
	JSON.stringify(
		{
			name: "@noesis/cli",
			version,
			type: "module",
			bin: { noesis: "dist/cli.mjs" },
			main: "dist/cli.mjs",
		},
		null,
		2,
	) + "\n",
);
await packNpm(cliPackageDir);

// Verify npm pack outputs exist
const sdkFile = `noesis-sdk-${version}.tgz`;
const cliFile = `noesis-cli-${version}.tgz`;
for (const file of [sdkFile, cliFile]) {
	const p = join(releaseDir, file);
	if (!existsSync(p)) {
		throw new Error(`Expected ${file} to exist at ${p}`);
	}
}

// Write manifest
const gatewayArtifactPath = posix(join(releaseDir, basename(gatewayArtifact)));
const clientArtifactPath = posix(join(releaseDir, basename(clientArtifact)));
const sdkPath = posix(join(releaseDir, sdkFile));
const cliPath = posix(join(releaseDir, cliFile));
const manifest = {
	version,
	artifacts: {
		gateway: {
			file: basename(gatewayArtifact),
			sha256: await sha256(gatewayArtifactPath),
		},
		clientAgent: {
			file: basename(clientArtifact),
			sha256: await sha256(clientArtifactPath),
		},
		sdk: {
			file: sdkFile,
			sha256: await sha256(sdkPath),
		},
		cli: {
			file: cliFile,
			sha256: await sha256(cliPath),
		},
	},
};

await writeFile(
	join(releaseDir, "manifest.json"),
	JSON.stringify(manifest, null, 2) + "\n",
);
await rm(stagingDir, { recursive: true, force: true });
console.log(`Noesis Distribution written to ${releaseDir}`);
