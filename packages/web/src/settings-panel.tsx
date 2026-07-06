import type { GatewayInfo } from "@noesis/shared";
import { LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
	completeAliyunOAuth,
	formatApiError,
	getAliyunStatus,
	putAliyunConfig,
	startAliyunOAuth,
	testAliyun,
	type AliyunDriveStatus,
	type AliyunDriveTestResult,
} from "./gateway-api.js";
import { PageHeading } from "./ui-helpers.js";

type SettingsTab = "owner-token" | "aliyundrive";

/** 设置页：当前只展示真实可用的 Owner Token 与阿里云盘 Tab。 */
export function SettingsPage({
	gatewayInfo,
	onLogout,
	ownerToken,
}: {
	gatewayInfo: GatewayInfo;
	onLogout: () => void;
	ownerToken: string;
}) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("owner-token");
	const tabs: Array<{ key: SettingsTab; label: string }> = [
		{ key: "owner-token", label: "Owner Token" },
		{ key: "aliyundrive", label: "阿里云盘" },
	];
	const activeTabId = `settings-tab-${activeTab}`;
	const activePanelId = `settings-panel-${activeTab}`;

	return (
		<div className="space-y-5">
			<PageHeading
				description="管理 Owner Token 与阿里云盘授权。"
				title="设置"
			/>

			<div
				className="noesis-settings-tabs"
				role="tablist"
				aria-label="设置分类"
			>
				{tabs.map((tab) => {
					const selected = activeTab === tab.key;
					return (
						<button
							aria-controls={`settings-panel-${tab.key}`}
							aria-selected={selected}
							className={selected ? "active" : ""}
							id={`settings-tab-${tab.key}`}
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							role="tab"
							type="button"
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			<div aria-labelledby={activeTabId} id={activePanelId} role="tabpanel">
				{activeTab === "owner-token" ? (
					<Card className="noesis-panel max-w-2xl">
						<CardHeader>
							<CardTitle>Owner Token</CardTitle>
							<CardDescription>
								已认证，Token 不会在界面显示明文。
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
								当前状态：
								<span className="font-medium text-foreground">已认证</span>
							</div>
							<div className="grid gap-3 text-sm md:grid-cols-2">
								<div>
									<span className="text-muted-foreground">Gateway：</span>
									<span className="font-medium">{window.location.origin}</span>
								</div>
								<div>
									<span className="text-muted-foreground">协议版本：</span>
									<span className="font-medium">
										{gatewayInfo.protocolVersion}
									</span>
								</div>
								<div>
									<span className="text-muted-foreground">认证模式：</span>
									<span className="font-medium">{gatewayInfo.auth.mode}</span>
								</div>
								<div>
									<span className="text-muted-foreground">能力：</span>
									<span className="font-medium">
										{gatewayInfo.capabilities.join("，")}
									</span>
								</div>
							</div>
							<Separator />
							<Button onClick={onLogout} variant="destructive">
								<LogOut aria-hidden="true" />
								退出并清除本地 Token
							</Button>
						</CardContent>
					</Card>
				) : (
					<AliyunStorageSection ownerToken={ownerToken} />
				)}
			</div>
		</div>
	);
}

function formatTime(value?: number) {
	if (!value) return "—";
	return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status: AliyunDriveStatus | null) {
	if (status === null) return "加载中";
	if (status.mock) return "mock 模式";
	if (status.authorized) return "已授权";
	if (status.authorizationState === "expired") return "已过期";
	if (status.configured) return "待授权";
	return "未配置";
}

function validationLabel(
	status: AliyunDriveStatus | null,
	lastTest: AliyunDriveTestResult | null,
) {
	if (lastTest) return lastTest.state === "valid" ? "有效" : lastTest.message;
	if (status?.authorized || status?.mock) return "有效";
	return "未校验";
}

function AliyunStatusItem({
	label,
	value,
	variant = "plain",
}: {
	label: string;
	value: string;
	variant?: "plain" | "neutral" | "success";
}) {
	return (
		<div className="grid grid-cols-[9rem_1fr] border-b border-r border-border/60 bg-card/40 last:border-b-0 md:last:border-b">
			<div className="bg-secondary/35 px-3 py-3 text-muted-foreground">
				{label}
			</div>
			<div className="min-w-0 px-3 py-3 font-medium text-foreground">
				{variant === "plain" ? (
					<span className="break-all">{value}</span>
				) : (
					<span
						className={
							variant === "success"
								? "rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400"
								: "rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary"
						}
					>
						{value}
					</span>
				)}
			</div>
		</div>
	);
}

function AliyunStorageSection({ ownerToken }: { ownerToken: string }) {
	const [status, setStatus] = useState<AliyunDriveStatus | null>(null);
	const [lastTest, setLastTest] = useState<AliyunDriveTestResult | null>(null);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [clientId, setClientId] = useState("");
	const [clientSecret, setClientSecret] = useState("");
	const [transferFolder, setTransferFolder] = useState("NoesisTransfers");
	const [oauthCode, setOauthCode] = useState("");
	const [oauthState, setOauthState] = useState("");

	const refresh = useCallback(async () => {
		const r = await getAliyunStatus(ownerToken);
		if ("kind" in r) {
			setMessage(formatApiError(r));
			return;
		}
		setStatus(r);
		if (!clientId && r.clientId) setClientId(r.clientId);
		if (r.transferFolder) setTransferFolder(r.transferFolder);
	}, [ownerToken, clientId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const aliyunReady = status?.authorized || status?.mock === true;

	return (
		<Card className="noesis-panel max-w-5xl">
			<CardHeader>
				<CardTitle>阿里云盘状态</CardTitle>
				<CardDescription>
					{status === null
						? "加载中…"
						: aliyunReady
							? "已授权，Web 中转按钮可用。"
							: "未授权，请先配置 client_id 并完成 OAuth。"}
					{status?.mock && "（mock 模式）"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="overflow-hidden rounded-xl border border-border/75 text-sm">
					<div className="grid md:grid-cols-2">
						<AliyunStatusItem
							label="配置状态"
							value={status?.configured ? "已配置" : "未配置"}
							variant={status?.configured ? "success" : "neutral"}
						/>
						<AliyunStatusItem
							label="授权记录状态"
							value={statusLabel(status)}
							variant={aliyunReady ? "success" : "neutral"}
						/>
						<AliyunStatusItem
							label="远程校验状态"
							value={validationLabel(status, lastTest)}
							variant={
								validationLabel(status, lastTest) === "有效"
									? "success"
									: "neutral"
							}
						/>
						<AliyunStatusItem
							label="校验说明"
							value={lastTest?.message ?? (aliyunReady ? "授权有效" : "—")}
						/>
						<AliyunStatusItem
							label="账户名"
							value={
								lastTest?.authorizedAccountName ??
								status?.authorizedAccountName ??
								"—"
							}
						/>
						<AliyunStatusItem
							label="Drive ID"
							value={lastTest?.driveId ?? status?.driveId ?? "—"}
						/>
						<AliyunStatusItem
							label="过期时间"
							value={formatTime(status?.expiresAt)}
						/>
						<AliyunStatusItem
							label="最近检测时间"
							value={formatTime(lastTest?.checkedAt ?? status?.checkedAt)}
						/>
					</div>
				</div>

				<Separator />

				<div className="grid gap-3">
					<div>
						<Label htmlFor="ali-client-id">client_id · client_secret</Label>
						<Input
							id="ali-client-id"
							onChange={(e) => setClientId(e.target.value)}
							placeholder="AppID / AppKey"
							value={clientId}
						/>
					</div>
					<div>
						<Label htmlFor="ali-client-secret">client_secret（可选）</Label>
						<Input
							id="ali-client-secret"
							onChange={(e) => setClientSecret(e.target.value)}
							value={clientSecret}
							type="password"
						/>
					</div>
					<div>
						<Label htmlFor="ali-transfer-folder">中转目录</Label>
						<Input
							id="ali-transfer-folder"
							onChange={(e) => setTransferFolder(e.target.value)}
							value={transferFolder}
						/>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={busy || clientId.trim().length === 0}
						onClick={async () => {
							setBusy(true);
							setMessage(null);
							const r = await putAliyunConfig(ownerToken, {
								clientId,
								clientSecret: clientSecret || undefined,
								transferFolder,
							});
							setBusy(false);
							if ("kind" in r) {
								setMessage(formatApiError(r));
								return;
							}
							void refresh();
						}}
					>
						保存配置
					</Button>
					<Button
						disabled={busy || clientId.trim().length === 0}
						onClick={async () => {
							setBusy(true);
							setMessage(null);
							const r = await startAliyunOAuth(ownerToken);
							setBusy(false);
							if ("kind" in r) {
								setMessage(formatApiError(r));
								return;
							}
							setOauthState(r.state);
							window.open(r.authorizationUrl, "_blank", "noopener,noreferrer");
						}}
						variant="secondary"
					>
						开始授权
					</Button>
				</div>

				<div className="flex flex-wrap items-end gap-2">
					<div>
						<Label htmlFor="ali-oauth-code">OAuth code</Label>
						<Input
							id="ali-oauth-code"
							onChange={(e) => setOauthCode(e.target.value)}
							placeholder="粘贴浏览器回调 code（oob 模式）"
							value={oauthCode}
						/>
					</div>
					<Button
						disabled={busy || oauthCode.trim().length === 0}
						onClick={async () => {
							setBusy(true);
							setMessage(null);
							const r = await completeAliyunOAuth(ownerToken, {
								state: oauthState,
								code: oauthCode,
							});
							setBusy(false);
							if ("kind" in r) {
								setMessage(formatApiError(r));
								return;
							}
							setStatus(r);
						}}
						variant="outline"
					>
						完成授权
					</Button>
				</div>

				<Button
					disabled={busy}
					onClick={async () => {
						setBusy(true);
						setMessage(null);
						const r = await testAliyun(ownerToken);
						setBusy(false);
						if ("kind" in r) {
							setMessage(formatApiError(r));
							return;
						}
						setLastTest(r);
						setMessage(r.message);
						void refresh();
					}}
					size="sm"
					variant="ghost"
				>
					测试授权
				</Button>

				{message && <p className="text-sm text-muted-foreground">{message}</p>}
			</CardContent>
		</Card>
	);
}
