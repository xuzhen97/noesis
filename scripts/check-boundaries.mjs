import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const packagesDir = join(root, "packages");

const allowedPackages = new Set([
	"shared",
	"server",
	"client",
	"web",
	"sdk",
	"cli",
]);
const packageDeps = {
	shared: [],
	server: ["@noesis/shared"],
	client: ["@noesis/shared"],
	web: ["@noesis/shared"],
	sdk: ["@noesis/shared"],
	cli: ["@noesis/sdk"],
};

const forbiddenDirs = [
	"packages/server/src/controllers",
	"packages/server/src/services",
	"packages/server/src/repositories",
	"packages/server/src/middlewares",
	"packages/server/src/utils",
	"packages/client/src/file-operator",
	"packages/client/src/pi-agent-manager",
	"packages/client/src/pi-terminal-manager",
	"packages/client/src/frpc-manager",
	"packages/client/src/updater",
	"packages/client/src/storage-client",
	"packages/client/src/policy-engine",
	"packages/web/src/pages",
	"packages/web/src/features",
	"packages/web/src/components",
	"packages/web/src/store",
	"packages/web/src/api",
	"packages/web/src/routes",
];

function fail(message) {
	console.error(message);
	process.exitCode = 1;
}

for (const name of readdirSync(packagesDir)) {
	if (!allowedPackages.has(name)) {
		fail(`Unexpected Noesis package: ${name}`);
	}
}

for (const [name, allowedNoesisDeps] of Object.entries(packageDeps)) {
	const manifestPath = join(packagesDir, name, "package.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const deps = {
		...manifest.dependencies,
		...manifest.peerDependencies,
		...manifest.optionalDependencies,
	};
	const actualNoesisDeps = Object.keys(deps).filter((dep) =>
		dep.startsWith("@noesis/"),
	);
	const unexpected = actualNoesisDeps.filter(
		(dep) => !allowedNoesisDeps.includes(dep),
	);
	const missing = allowedNoesisDeps.filter(
		(dep) => !actualNoesisDeps.includes(dep),
	);

	if (unexpected.length > 0) {
		fail(
			`${manifest.name} has unexpected Noesis deps: ${unexpected.join(", ")}`,
		);
	}

	if (missing.length > 0) {
		fail(
			`${manifest.name} is missing expected Noesis deps: ${missing.join(", ")}`,
		);
	}
}

for (const relativeDir of forbiddenDirs) {
	if (existsSync(join(root, relativeDir))) {
		fail(`Forbidden initialization directory exists: ${relativeDir}`);
	}
}

if (process.exitCode === undefined) {
	console.log("Noesis initialization boundaries OK");
}
