import { protocolVersion } from "@noesis/shared";
import {
	Activity,
	Bot,
	CheckCircle2,
	Database,
	LogOut,
	Moon,
	Network,
	PanelLeftClose,
	PanelLeftOpen,
	Search,
	Server,
	Settings,
	ShieldCheck,
	Sun,
	type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
	HashRouter,
	Navigate,
	NavLink,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
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

type RouteItem = {
	path: string;
	label: string;
	description: string;
	icon: LucideIcon;
};

const routeItems: RouteItem[] = [
	{
		path: "/dashboard",
		label: "仪表盘",
		description: "P0 控制闭环概览",
		icon: Activity,
	},
	{
		path: "/machines",
		label: "机器",
		description: "Client Agent 接入状态",
		icon: Server,
	},
	{
		path: "/tasks",
		label: "任务",
		description: "Task 与 Task Event 状态",
		icon: Bot,
	},
	{
		path: "/settings",
		label: "设置",
		description: "本地门禁与主题",
		icon: Settings,
	},
];

const statusCards = [
	{
		title: "Gateway",
		value: "待接入",
		description: "等待真实 Gateway API 连接",
		icon: Network,
	},
	{
		title: "Machines",
		value: "0 台",
		description: "等待 Client Agent 注册心跳",
		icon: Server,
	},
	{
		title: "Tasks",
		value: "暂无",
		description: "等待创建第一个可观测 Task",
		icon: Bot,
	},
	{
		title: "Protocol",
		value: protocolVersion,
		description: "来自 @noesis/shared 的协议版本",
		icon: Database,
	},
] as const;

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

export function App() {
	const [ownerToken, setOwnerToken] = useState<string | null>(() =>
		readStoredOwnerToken(),
	);
	const [theme, setTheme] = useState<NoesisTheme>(() => readStoredTheme());
	const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() =>
		readStoredSidebarCollapsed(),
	);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.dataset.theme = theme;

		const storage = browserStorage();
		if (storage !== null) {
			saveTheme(storage, theme);
		}
	}, [theme]);

	function handleLogin(token: string): boolean {
		const storage = browserStorage();

		if (storage === null || !saveOwnerToken(storage, token)) {
			return false;
		}

		setOwnerToken(token.trim());
		return true;
	}

	function handleLogout() {
		const storage = browserStorage();

		if (storage !== null) {
			clearOwnerToken(storage);
		}

		setOwnerToken(null);
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
				{ownerToken === null ? (
					<LoginPage
						onLogin={handleLogin}
						onToggleTheme={toggleTheme}
						theme={theme}
					/>
				) : (
					<ConsoleShell
						onLogout={handleLogout}
						onToggleSidebarCollapsed={toggleSidebarCollapsed}
						onToggleTheme={toggleTheme}
						ownerToken={ownerToken}
						sidebarCollapsed={sidebarCollapsed}
						theme={theme}
					/>
				)}
			</div>
		</HashRouter>
	);
}

function LoginPage({
	onLogin,
	onToggleTheme,
	theme,
}: {
	onLogin: (token: string) => boolean;
	onToggleTheme: () => void;
	theme: NoesisTheme;
}) {
	const navigate = useNavigate();
	const [ownerToken, setOwnerToken] = useState("");
	const [error, setError] = useState<string | null>(null);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const normalized = ownerToken.trim();
		if (normalized.length === 0) {
			setError("请输入 Owner Token。");
			return;
		}

		if (!onLogin(normalized)) {
			setError("无法保存 Owner Token，请检查浏览器本地存储权限。");
			return;
		}

		setError(null);
		navigate("/dashboard", { replace: true });
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

							<Button className="w-full" type="submit">
								进入控制台
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}

function ConsoleShell({
	onLogout,
	onToggleSidebarCollapsed,
	onToggleTheme,
	ownerToken,
	sidebarCollapsed,
	theme,
}: {
	onLogout: () => void;
	onToggleSidebarCollapsed: () => void;
	onToggleTheme: () => void;
	ownerToken: string;
	sidebarCollapsed: boolean;
	theme: NoesisTheme;
}) {
	const location = useLocation();
	const navigate = useNavigate();
	const currentRoute = useMemo(
		() =>
			routeItems.find((item) => item.path === location.pathname) ??
			routeItems[0],
		[location.pathname],
	);

	function handleLogout() {
		onLogout();
		navigate("/dashboard", { replace: true });
	}

	return (
		<div
			className={
				sidebarCollapsed
					? "noesis-shell noesis-shell-collapsed"
					: "noesis-shell"
			}
		>
			<aside
				className={
					sidebarCollapsed
						? "noesis-sidebar noesis-sidebar-collapsed"
						: "noesis-sidebar"
				}
				data-collapsed={sidebarCollapsed}
			>
				<div className="mb-8 flex min-h-11 items-center gap-3 px-2">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10">
						<Network className="size-5" aria-hidden="true" />
					</div>
					<div className="noesis-sidebar-label min-w-0">
						<p className="truncate text-sm font-semibold leading-none">
							Noesis 灵识
						</p>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							Human-AI Workspace
						</p>
					</div>
				</div>

				<nav aria-label="主导航" className="space-y-2">
					{routeItems.map((item) => (
						<NavLink
							className="noesis-nav-link"
							key={item.path}
							title={item.label}
							to={item.path}
						>
							<item.icon className="size-4 shrink-0" aria-hidden="true" />
							<span className="noesis-sidebar-label">{item.label}</span>
						</NavLink>
					))}
				</nav>

				<div className="mt-auto pt-4">
					<Button
						aria-label={sidebarCollapsed ? "展开菜单" : "收起菜单"}
						className="noesis-sidebar-toggle"
						onClick={onToggleSidebarCollapsed}
						title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
						variant="outline"
					>
						{sidebarCollapsed ? (
							<PanelLeftOpen aria-hidden="true" />
						) : (
							<PanelLeftClose aria-hidden="true" />
						)}
						<span className="noesis-sidebar-label">收起菜单</span>
					</Button>
				</div>
			</aside>

			<div className="flex min-w-0 flex-col">
				<header className="sticky top-0 z-20 border-b border-border/70 bg-background/72 backdrop-blur-xl">
					<div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
						<div className="flex items-center gap-3 lg:hidden">
							<div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Network className="size-5" aria-hidden="true" />
							</div>
							<span className="text-sm font-semibold">Noesis</span>
						</div>

						<div className="hidden min-h-11 flex-1 items-center gap-3 rounded-full border border-border/70 bg-card/50 px-4 text-sm text-muted-foreground md:flex">
							<Search className="size-4" aria-hidden="true" />
							<span>搜索即将接入 Gateway / Machine / Task</span>
							<kbd className="ml-auto rounded border border-border/70 px-2 py-0.5 text-xs">
								⌘K
							</kbd>
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

						<Button onClick={handleLogout} variant="outline">
							<LogOut aria-hidden="true" />
							<span className="hidden sm:inline">退出</span>
						</Button>
					</div>

					<nav
						aria-label="移动端主导航"
						className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden"
					>
						{routeItems.map((item) => (
							<NavLink
								className="noesis-nav-link min-w-fit"
								key={item.path}
								to={item.path}
							>
								<item.icon className="size-4" aria-hidden="true" />
								<span>{item.label}</span>
							</NavLink>
						))}
					</nav>
				</header>

				<div className="border-b border-border/70 bg-card/25 px-4 py-3 text-sm text-muted-foreground lg:px-6">
					<span>面包屑：</span>
					<span className="font-medium text-foreground">
						{currentRoute.label}
					</span>
					<span className="mx-2 text-border">/</span>
					<span>{currentRoute.description}</span>
				</div>

				<main className="flex-1 px-4 py-6 lg:px-6">
					<Routes>
						<Route element={<Navigate replace to="/dashboard" />} index />
						<Route
							element={<DashboardPage ownerToken={ownerToken} />}
							path="/dashboard"
						/>
						<Route element={<MachinesPage />} path="/machines" />
						<Route element={<TasksPage />} path="/tasks" />
						<Route
							element={
								<SettingsPage onLogout={handleLogout} ownerToken={ownerToken} />
							}
							path="/settings"
						/>
						<Route element={<Navigate replace to="/dashboard" />} path="*" />
					</Routes>
				</main>
			</div>
		</div>
	);
}

function DashboardPage({ ownerToken }: { ownerToken: string }) {
	return (
		<div className="space-y-6">
			<PageHeading
				description="当前只展示 P0 控制闭环的真实边界：Gateway、Machine、Task 与协议版本。"
				title="仪表盘"
			/>

			<section
				className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
				aria-label="P0 控制闭环占位状态"
			>
				{statusCards.map((card) => (
					<Card className="noesis-panel noesis-card-hover" key={card.title}>
						<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
							<div>
								<CardDescription>{card.title}</CardDescription>
								<CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
							</div>
							<div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
								<card.icon className="size-5" aria-hidden="true" />
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{card.description}
							</p>
						</CardContent>
					</Card>
				))}
			</section>

			<Card className="noesis-panel">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
						本地门禁状态
					</CardTitle>
					<CardDescription>
						Owner Token 已保存在当前浏览器。本阶段不做服务端校验。
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<StatusChip
						icon={ShieldCheck}
						label="Owner Token"
						value={ownerToken.length > 0 ? "已保存" : "未保存"}
					/>
					<StatusChip icon={Network} label="Gateway API" value="待接入" />
					<StatusChip icon={Bot} label="Task Event" value="待创建" />
				</CardContent>
			</Card>
		</div>
	);
}

function MachinesPage() {
	return (
		<PlaceholderPage
			description="正式机器列表会在 Client Agent 注册、心跳和能力上报接入后补齐。"
			icon={Server}
			title="机器"
		>
			等待 Client Agent 接入 Gateway。
		</PlaceholderPage>
	);
}

function TasksPage() {
	return (
		<PlaceholderPage
			description="正式任务列表会聚合 command.run、文件操作和后续 Pi 任务。"
			icon={Bot}
			title="任务"
		>
			暂无 Task。创建第一个任务后，这里会显示 Task Event 证据链。
		</PlaceholderPage>
	);
}

function SettingsPage({
	onLogout,
	ownerToken,
}: {
	onLogout: () => void;
	ownerToken: string;
}) {
	return (
		<div className="space-y-6">
			<PageHeading
				description="本阶段只暴露本地门禁状态和退出入口。"
				title="设置"
			/>
			<Card className="noesis-panel max-w-2xl">
				<CardHeader>
					<CardTitle>Owner Token</CardTitle>
					<CardDescription>
						Token 已保存，但不会在界面显示明文。
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
						当前状态：
						<span className="font-medium text-foreground">
							{ownerToken.length > 0 ? "已保存" : "未保存"}
						</span>
					</div>
					<Separator />
					<Button onClick={onLogout} variant="destructive">
						<LogOut aria-hidden="true" />
						退出并清除本地 Token
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function PlaceholderPage({
	children,
	description,
	icon: Icon,
	title,
}: {
	children: string;
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<div className="space-y-6">
			<PageHeading description={description} title={title} />
			<Card className="noesis-panel max-w-3xl">
				<CardHeader>
					<div className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
						<Icon className="size-6" aria-hidden="true" />
					</div>
					<CardTitle className="pt-2">{children}</CardTitle>
					<CardDescription>
						这是诚实占位状态，不使用大规模 mock 数据。
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}

function PageHeading({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<section className="space-y-2">
			<p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
				Noesis Console
			</p>
			<h1 className="text-3xl font-semibold tracking-tight text-foreground">
				{title}
			</h1>
			<p className="max-w-3xl text-base leading-7 text-muted-foreground">
				{description}
			</p>
		</section>
	);
}

function StatusChip({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<div className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-card/55 px-4 py-3 backdrop-blur-xl">
			<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Icon className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm font-medium text-foreground">{value}</p>
			</div>
		</div>
	);
}
