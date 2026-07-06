export const help =
	"Noesis CLI\n\nCommands:\n  noesis --help\n  noesis version\n  noesis task run --gateway <url> --machine <id> --json [--owner-token <token>] -- node -e \"console.log('noesis-ok')\"\n  noesis transfer upload --gateway <url> --machine <id> --file <path> [--path <dir>] [--json] [--owner-token <token>]\n  noesis transfer download --gateway <url> --transfer <id> --out <path> [--json] [--owner-token <token>]\n";

export function readOwnerToken(args: readonly string[]): string {
	const flagIndex = args.indexOf("--owner-token");
	if (flagIndex !== -1) {
		const value = args[flagIndex + 1];
		if (value === undefined) throw new Error("--owner-token requires a value");
		return value.trim();
	}
	const env = process.env.NOESIS_OWNER_TOKEN?.trim();
	if (env && env.length > 0) return env;
	throw new Error(
		"Owner Token is required for task run (--owner-token or NOESIS_OWNER_TOKEN)",
	);
}

export function readFlag(
	args: readonly string[],
	name: string,
): string | undefined {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

export function ownerTokenError(error: unknown) {
	return { exitCode: 1, stdout: "", stderr: (error as Error).message + "\n" };
}
