import type { Machine } from "@noesis/shared";
import { Folder, HardDrive, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	createTransferImport,
	fileList,
	fileWrite,
	formatApiError,
	getAliyunStatus,
	getMachine,
	type FileListEntry,
	type GatewayApiError,
} from "./gateway-api.js";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_WRITE = 10 * 1024 * 1024;

function isErr<T>(v: T | GatewayApiError): v is GatewayApiError {
	return typeof v === "object" && v !== null && "kind" in v;
}

export function MachineFilesPage({
	machineId,
	ownerToken,
}: {
	machineId: string;
	ownerToken: string;
}) {
	const [machine, setMachine] = useState<Machine | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [currentPath, setCurrentPath] = useState(".");
	const [entries, setEntries] = useState<FileListEntry[]>([]);
	const [listError, setListError] = useState<string | null>(null);
	const [aliyunOk, setAliyunOk] = useState(false);
	const [importBusy, setImportBusy] = useState(false);
	const [uploadBusy, setUploadBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const refreshList = useCallback(async () => {
		setListError(null);
		const result = await fileList(ownerToken, {
			machineId,
			path: currentPath,
		});
		if (isErr(result)) {
			setListError(formatApiError(result));
			setEntries([]);
			return;
		}
		setEntries(result.entries);
	}, [ownerToken, machineId, currentPath]);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const m = await getMachine(ownerToken, machineId);
			if (cancelled) return;
			if (isErr(m)) {
				setLoadError(formatApiError(m));
				return;
			}
			setMachine(m);
		})();
		const st = getAliyunStatus(ownerToken);
		void st.then((r) => {
			if (!cancelled && !isErr(r)) {
				setAliyunOk(r.authorized || r.mock === true);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [ownerToken, machineId]);

	useEffect(() => {
		void refreshList();
	}, [refreshList]);

	async function handleImport(file: File) {
		if (!aliyunOk) return;
		setImportBusy(true);
		setMessage(null);
		try {
			const created = await createTransferImport(ownerToken, {
				machineId,
				path: currentPath,
				filename: file.name,
				size: file.size,
			});
			if (isErr(created)) {
				setMessage(formatApiError(created));
				return;
			}
			if (created.mode !== "aliyundrive") {
				setMessage("未返回阿里云上传计划");
				return;
			}
			const transferId = created.transferId;
			let offset = 0;
			for (const part of created.uploadParts) {
				const chunk = file.slice(offset, offset + part.size);
				if (!part.uploadUrl.startsWith("mock://")) {
					const put = await fetch(part.uploadUrl, {
						method: "PUT",
						body: chunk,
					});
					if (!put.ok) throw new Error(`分片上传失败 HTTP ${put.status}`);
				}
				offset += part.size;
			}
			await fetch(
				`/api/transfers/${encodeURIComponent(transferId)}/web-upload-complete`,
				{
					method: "POST",
					headers: {
						authorization: `Bearer ${ownerToken}`,
						"content-type": "application/json",
					},
					body: "{}",
				},
			);
			setMessage(`已提交导入：${transferId}`);
			await refreshList();
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "导入失败");
		} finally {
			setImportBusy(false);
		}
	}

	async function handleSmallUpload(file: File) {
		if (file.size > MAX_WRITE) {
			setMessage("小文件上传限制 10MB，请用存储中转");
			return;
		}
		setUploadBusy(true);
		setMessage(null);
		const buf = await file.arrayBuffer();
		const bytes = new Uint8Array(buf);
		let binary = "";
		const chunk = 0x8000;
		for (let i = 0; i < bytes.length; i += chunk) {
			binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
		}
		const b64 = btoa(binary);
		const targetPath =
			currentPath === "."
				? file.name
				: `${currentPath.replace(/\\/g, "/")}/${file.name}`;
		const result = await fileWrite(ownerToken, {
			machineId,
			path: targetPath,
			content: b64,
			encoding: "base64",
		});
		setUploadBusy(false);
		if (isErr(result)) {
			setMessage(formatApiError(result));
			return;
		}
		setMessage(`已写入 ${result.path}`);
		await refreshList();
	}

	if (loadError) {
		return (
			<Card className="noesis-panel max-w-xl">
				<CardHeader>
					<CardTitle>无法加载机器</CardTitle>
					<CardDescription>{loadError}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild variant="outline">
						<Link to="/machines">返回列表</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3">
				<Button asChild size="sm" variant="outline">
					<Link to="/machines">← 机器列表</Link>
				</Button>
				<h1 className="text-2xl font-semibold">{machine?.name ?? machineId}</h1>
				<span className="text-sm text-muted-foreground">
					{machine?.status ?? "…"}
				</span>
			</div>

			{machine?.disks && machine.disks.length > 0 && (
				<section className="flex flex-wrap gap-2" aria-label="磁盘">
					{machine.disks.map((d) => (
						<div
							key={d.id}
							className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/55 px-3 py-2 text-sm"
						>
							<HardDrive className="size-4 text-primary" aria-hidden />
							<span className="font-medium">{d.label}</span>
							<span className="text-muted-foreground truncate max-w-[12rem]">
								{d.path}
							</span>
						</div>
					))}
				</section>
			)}

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
				<Card className="noesis-panel">
					<CardHeader>
						<CardTitle className="text-base">目录</CardTitle>
						<CardDescription>路径：{currentPath}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{currentPath !== "." && (
							<Button
								className="w-full justify-start"
								onClick={() => {
									const parts = currentPath.split("/").filter(Boolean);
									parts.pop();
									setCurrentPath(parts.length ? parts.join("/") : ".");
								}}
								size="sm"
								variant="ghost"
							>
								..
							</Button>
						)}
						{entries
							.filter((e) => e.kind === "directory")
							.map((e) => (
								<Button
									className="w-full justify-start"
									key={e.path}
									onClick={() => setCurrentPath(e.path)}
									size="sm"
									variant="ghost"
								>
									<Folder className="mr-2 size-4" aria-hidden />
									{e.name}
								</Button>
							))}
					</CardContent>
				</Card>

				<Card className="noesis-panel">
					<CardHeader>
						<CardTitle className="text-base">文件</CardTitle>
						{listError && (
							<CardDescription className="text-destructive">
								{listError}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent>
						<ul className="divide-y divide-border/60 text-sm">
							{entries
								.filter((e) => e.kind === "file")
								.map((e) => (
									<li className="flex justify-between py-2" key={e.path}>
										<span>{e.name}</span>
										<span className="text-muted-foreground">
											{e.size ?? "—"} B
										</span>
									</li>
								))}
						</ul>
					</CardContent>
				</Card>
			</div>

			<Card className="noesis-panel max-w-2xl">
				<CardHeader>
					<CardTitle className="text-base">上传</CardTitle>
					<CardDescription>
						≤10MB 直写机器；更大文件请用存储中转（需阿里云授权）。
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-3">
						<Label className="sr-only">选择文件</Label>
						<Input
							accept="*/*"
							disabled={uploadBusy}
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) void handleSmallUpload(f);
								e.target.value = "";
							}}
							type="file"
						/>
						<Button
							disabled={!aliyunOk || importBusy}
							onClick={() => {
								const input = document.createElement("input");
								input.type = "file";
								input.onchange = () => {
									const f = input.files?.[0];
									if (f) void handleImport(f);
								};
								input.click();
							}}
							title={
								aliyunOk
									? "经阿里云盘中转到本机目录"
									: "请先在设置中完成阿里云盘授权"
							}
							variant="secondary"
						>
							<Upload className="mr-2 size-4" aria-hidden />
							存储中转导入
						</Button>
					</div>
					{message && (
						<p className="text-sm text-muted-foreground">{message}</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
