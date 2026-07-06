import {
	Activity,
	Bot,
	Moon,
	Network,
	Server,
	ShieldCheck,
	Sun,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { HashRouter, useNavigate } from "react-router-dom";
import type { GatewayInfo } from "@noesis/shared";
import { getGatewayInfo, type GatewayApiError } from "./gateway-api.js";
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
import { ConsoleShell } from "./console-shell.js";
import {
	clearOwnerToken,
	readOwnerToken,
	readSidebarCollapsed,
	readTheme,
	saveOwnerToken,
	saveSidebarCollapsed,
	saveTheme,
	type BrowserStorage,
	type NoesisTheme,
} from "./session.js";
import { StatusChip } from "./ui-helpers.js";

function browserStorage(): BrowserStorage | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage;
}

function readStoredOwnerToken(): string | null {
	const storage = browserStorage();
	return storage === null ? null : readOwnerToken(storage);
}

function readStoredTheme(): NoesisTheme {
	const storage = browserStorage();
	return storage === null ? "dark" : readTheme(storage);
}

function readStoredSidebarCollapsed(): boolean {
	const storage = browserStorage();
	return storage === null ? false : readSidebarCollapsed(storage);
}

type AuthState =
	| { phase: "checking" }
	| { phase: "login" }
	| { phase: "authenticated"; token: string; info: GatewayInfo };

export function App() {
	const [auth, setAuth] = useState<AuthState>(() => {
		const stored = readStoredOwnerToken();
		return stored !== null ? { phase: "checking" } : { phase: "login" };
	});
	const [theme, setTheme] = useState<NoesisTheme>(() => readStoredTheme());
	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
		readStoredSidebarCollapsed(),
	);

	// 验证存储的 token
	useEffect(() => {
		if (auth.phase !== "checking") return;
		const stored = readStoredOwnerToken();
		if (stored === null) {
			setAuth({ phase: "login" });
			return;
		}
		let cancelled = false;
		getGatewayInfo(stored).then((result) => {
			if (cancelled) return;
			if ("kind" in result) {
				const storage = browserStorage();
				if (storage !== null) clearOwnerToken(storage);
				setAuth({ phase: "login" });
				return;
			}
			setAuth({ phase: "authenticated", token: stored, info: result });
		});
		return () => {
			cancelled = true;
		};
	}, [auth.phase]);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.dataset.theme = theme;

		const storage = browserStorage();
		if (storage !== null) {
			saveTheme(storage, theme);
		}
	}, [theme]);

	async function handleLogin(token: string): Promise<GatewayApiError | null> {
		const result = await getGatewayInfo(token);
		if ("kind" in result) return result;
		const storage = browserStorage();
		if (storage === null) {
			return { kind: "server-error", message: "本地存储不可用" };
		}
		if (!saveOwnerToken(storage, token)) {
			return { kind: "server-error", message: "无法保存 Owner Token" };
		}
		setAuth({ phase: "authenticated", token: token.trim(), info: result });
		return null;
	}

	function handleLogout() {
		const storage = browserStorage();

		if (storage !== null) {
			clearOwnerToken(storage);
		}

		setAuth({ phase: "login" });
	}

	function toggleTheme() {
		setTheme((current) => (current === "dark" ? "light" : "dark"));
	}

	function toggleSidebarCollapsed() {
		setSidebarCollapsed((current) => {
			const next = !current;
			const storage = browserStorage();

			if (storage !== null) {
				saveSidebarCollapsed(storage, next);
			}

			return next;
		});
	}

	return (
		<HashRouter>
			<div className="noesis-background">
				{auth.phase === "checking" ? (
					<CheckingPage />
				) : auth.phase === "login" ? (
					<LoginPage
						onLogin={handleLogin}
						onToggleTheme={toggleTheme}
						theme={theme}
					/>
				) : (
					<ConsoleShell
						gatewayInfo={auth.info}
						onLogout={handleLogout}
						ownerToken={auth.token}
						onToggleSidebarCollapsed={toggleSidebarCollapsed}
						onToggleTheme={toggleTheme}
						sidebarCollapsed={sidebarCollapsed}
						theme={theme}
					/>
				)}
			</div>
		</HashRouter>
	);
}

function CheckingPage() {
	return (
		<main className="flex min-h-dvh items-center justify-center px-4 py-10">
			<Card className="noesis-panel max-w-md text-center">
				<CardHeader>
					<Activity
						aria-hidden="true"
						className="mx-auto size-8 animate-spin text-primary"
					/>
					<CardTitle className="pt-4">正在连接 Gateway…</CardTitle>
					<CardDescription>正在验证本地保存的 Owner Token。</CardDescription>
				</CardHeader>
			</Card>
		</main>
	);
}

function LoginPage({
	onLogin,
	onToggleTheme,
	theme,
}: {
	onLogin: (token: string) => Promise<GatewayApiError | null>;
	onToggleTheme: () => void;
	theme: NoesisTheme;
}) {
	const navigate = useNavigate();
	const [ownerToken, setOwnerToken] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const normalized = ownerToken.trim();
		if (normalized.length === 0) {
			setError("请输入 Owner Token。");
			return;
		}

		setSubmitting(true);
		setError(null);
		const result = await onLogin(normalized);
		setSubmitting(false);

		if (result === null) {
			navigate("/dashboard", { replace: true });
			return;
		}
		if (result.kind === "unauthorized") {
			setError("Owner Token 无效。");
		} else if (result.kind === "unreachable") {
			setError("无法连接 Gateway。");
		} else {
			setError("Gateway 暂时不可用。");
		}
	}

	return (
		<main className="flex min-h-dvh items-center justify-center px-4 py-10">
			<div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
				<section className="space-y-6">
					<div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 text-sm text-muted-foreground backdrop-blur-xl">
						<ShieldCheck className="size-4 text-primary" aria-hidden="true" />
						个人 Gateway 控制台门禁
					</div>

					<div className="space-y-4">
						<p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
							Noesis 灵识
						</p>
						<h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
							连接 Gateway、Machine 与 Task Event 的 AI 控制台
						</h1>
						<p className="max-w-xl text-base leading-8 text-muted-foreground">
							使用 Owner Token
							进入个人工作台。本阶段只做本地门禁，不创建多账号体系，也不暴露长期凭证明文。
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-3">
						<StatusChip icon={Network} label="Gateway" value="Ready shell" />
						<StatusChip icon={Server} label="Machine" value="Await agent" />
						<StatusChip icon={Bot} label="Task Event" value="Append-only" />
					</div>
				</section>

				<Card className="noesis-panel noesis-card-hover mx-auto w-full max-w-md overflow-hidden">
					<div className="noesis-tech-line" />
					<CardHeader className="space-y-2">
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardTitle className="text-2xl">登录 Noesis</CardTitle>
								<CardDescription className="mt-2">
									输入 Owner Token 进入控制台。
								</CardDescription>
							</div>
							<Button
								aria-label={
									theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"
								}
								onClick={onToggleTheme}
								size="icon"
								variant="outline"
							>
								{theme === "dark" ? (
									<Sun aria-hidden="true" />
								) : (
									<Moon aria-hidden="true" />
								)}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<form className="space-y-5" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<Label htmlFor="owner-token">Owner Token</Label>
								<Input
									aria-describedby={
										error === null ? "owner-token-help" : "owner-token-error"
									}
									aria-invalid={error !== null}
									autoComplete="current-password"
									autoFocus
									id="owner-token"
									onChange={(event) => setOwnerToken(event.target.value)}
									placeholder="粘贴 Gateway Owner Token"
									type="password"
									value={ownerToken}
								/>
								{error === null ? (
									<p
										className="text-sm text-muted-foreground"
										id="owner-token-help"
									>
										Token 只保存在当前浏览器本地。
									</p>
								) : (
									<p
										className="text-sm font-medium text-destructive"
										id="owner-token-error"
									>
										{error}
									</p>
								)}
							</div>

							<Button className="w-full" disabled={submitting} type="submit">
								{submitting ? "正在验证…" : "进入控制台"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
