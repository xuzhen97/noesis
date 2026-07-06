import { NoesisClient } from "@noesis/sdk";
import type { CliResult } from "./main.js";
import { ownerTokenError, readFlag, readOwnerToken } from "./cli-args.js";

export async function runTransferUpload(
	args: readonly string[],
): Promise<CliResult> {
	const gateway = readFlag(args, "--gateway");
	const machineId = readFlag(args, "--machine");
	const file = readFlag(args, "--file");
	const targetPath = readFlag(args, "--path") ?? ".";
	const json = args.includes("--json");
	if (!gateway || !machineId || !file || !json) {
		return {
			exitCode: 1,
			stdout: "",
			stderr:
				"Usage: noesis transfer upload --gateway <url> --machine <id> --file <path> [--path <dir>] --json [--owner-token <token>]\n",
		};
	}
	let ownerToken: string;
	try {
		ownerToken = readOwnerToken(args);
	} catch (error) {
		return ownerTokenError(error);
	}
	const { stat } = await import("node:fs/promises");
	const { basename } = await import("node:path");
	const st = await stat(file);
	const client = new NoesisClient({ baseUrl: gateway, ownerToken });
	const transferId = await client.transfers.uploadLocalFile({
		filePath: file,
		machineId,
		path: targetPath,
		filename: basename(file),
		size: st.size,
	});
	const job = await client.transfers.waitTransfer(transferId);
	return {
		exitCode: job.status === "completed" ? 0 : 1,
		stdout: JSON.stringify({ transferId, status: job.status }) + "\n",
		stderr: "",
	};
}

export async function runTransferDownload(
	args: readonly string[],
): Promise<CliResult> {
	const gateway = readFlag(args, "--gateway");
	const transferId = readFlag(args, "--transfer");
	const out = readFlag(args, "--out");
	const json = args.includes("--json");
	if (!gateway || !transferId || !out || !json) {
		return {
			exitCode: 1,
			stdout: "",
			stderr:
				"Usage: noesis transfer download --gateway <url> --transfer <id> --out <path> --json [--owner-token <token>]\n",
		};
	}
	let ownerToken: string;
	try {
		ownerToken = readOwnerToken(args);
	} catch (error) {
		return ownerTokenError(error);
	}
	const client = new NoesisClient({ baseUrl: gateway, ownerToken });
	await client.transfers.downloadToFile(transferId, out);
	return {
		exitCode: 0,
		stdout: JSON.stringify({ transferId, out }) + "\n",
		stderr: "",
	};
}
