import { useMemo, useState } from "react";
import { machines, tasks, type Route } from "./mockData";
import {
	DashboardPage,
	MachineDetailPage,
	TasksListPage,
	TaskDetailPage,
	ReleasesPage,
	InstallPage,
	StoragePage,
	AuditPage,
	SettingsPage,
	MachinesListPage,
	RunbookLibraryPage,
	AutomationAssetsPage,
	ApprovalsPage,
	TodosPage,
	ContextsPage,
} from "./pages";

type NavKey =
	| "dashboard"
	| "machines"
	| "tasks"
	| "todos"
	| "contexts"
	| "releases"
	| "install"
	| "storage"
	| "audit"
	| "runbooks"
	| "automation"
	| "approvals"
	| "settings";

type NavSection = {
	title: string;
	items: { key: NavKey; label: string; icon: string }[];
};

const navSections: NavSection[] = [
	{
		title: "运行",
		items: [
			{ key: "dashboard", label: "仪表盘", icon: "⌂" },
			{ key: "machines", label: "机器", icon: "▦" },
			{ key: "tasks", label: "任务", icon: "▣" },
		],
	},
	{
		title: "协作",
		items: [
			{ key: "todos", label: "待办", icon: "☑" },
			{ key: "contexts", label: "上下文", icon: "◫" },
		],
	},
	{
		title: "自动化",
		items: [
			{ key: "runbooks", label: "Runbook 库", icon: "❏" },
			{ key: "automation", label: "自动化资产", icon: "◈" },
			{ key: "releases", label: "发布中心", icon: "◉" },
			{ key: "install", label: "安装中心", icon: "⇩" },
		],
	},
	{
		title: "资源",
		items: [{ key: "storage", label: "云盘", icon: "☁" }],
	},
	{
		title: "治理",
		items: [
			{ key: "approvals", label: "审批中心", icon: "☑" },
			{ key: "audit", label: "审计日志", icon: "☷" },
			{ key: "settings", label: "设置", icon: "⚙" },
		],
	},
];

function activeNav(route: Route): NavKey {
	switch (route.page) {
		case "machine-detail":
			return "machines";
		case "task-detail":
			return "tasks";
		default:
			return route.page as NavKey;
	}
}

function Logo({ collapsed }: { collapsed?: boolean }) {
	return (
		<div className="brand">
			<div className="brand-mark">灵</div>
			{!collapsed && <span>Noesis 灵识</span>}
		</div>
	);
}

function Sidebar({ route, nav }: { route: Route; nav: (r: Route) => void }) {
	const active = activeNav(route);
	const [collapsed, setCollapsed] = useState(false);
	return (
		<aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
			<div className="sidebar-top">
				<Logo collapsed={collapsed} />
			</div>
			<nav className="nav">
				{navSections.map((sec) => (
					<div className="nav-section" key={sec.title}>
						{!collapsed && <div className="nav-section-title">{sec.title}</div>}
						{sec.items.map((item) => (
							<button
								key={item.key}
								onClick={() => nav({ page: item.key } as Route)}
								className={`nav-item ${active === item.key ? "active" : ""}`}
								title={collapsed ? item.label : undefined}
							>
								<span className="nav-icon">{item.icon}</span>
								{!collapsed && <span>{item.label}</span>}
							</button>
						))}
					</div>
				))}
			</nav>
			<div className="sidebar-footer">
				<button
					className="sidebar-toggle"
					onClick={() => setCollapsed(!collapsed)}
					title={collapsed ? "展开菜单" : "收起菜单"}
				>
					<span className="sidebar-toggle-icon">{collapsed ? "▶" : "◀"}</span>
					{!collapsed && <span>收起菜单</span>}
				</button>
			</div>
		</aside>
	);
}

type Theme = "dark" | "light";

function Topbar({
	nav,
	pendingCount,
	theme,
	onToggleTheme,
}: {
	nav: (r: Route) => void;
	pendingCount: number;
	theme: Theme;
	onToggleTheme: () => void;
}) {
	return (
		<header className="topbar">
			<div className="search">
				<span>⌕</span>
				<input placeholder="全局搜索  ⌘K" />
				<kbd>⌘K</kbd>
			</div>
			<div className="topbar-right">
				<button
					className="icon-btn with-badge"
					title="审批中心"
					onClick={() => nav({ page: "approvals" })}
				>
					🔔
					{pendingCount > 0 && (
						<span className="badge-count">{pendingCount}</span>
					)}
				</button>
				<button
					className="icon-btn theme-btn"
					title={theme === "dark" ? "切换到明亮主题" : "切换到夜间主题"}
					onClick={onToggleTheme}
				>
					{theme === "dark" ? "☀️" : "🌙"}
				</button>
				<button className="icon-btn">⚙</button>
			</div>
		</header>
	);
}

function Breadcrumb({ route, nav }: { route: Route; nav: (r: Route) => void }) {
	let crumbs: { label: string; onClick?: () => void }[] = [];
	let statusBadge: React.ReactNode = null;

	if (route.page === "dashboard") crumbs = [{ label: "仪表盘" }];
	else if (route.page === "machines") crumbs = [{ label: "机器" }];
	else if (route.page === "machine-detail") {
		const m = machines.find((x) => x.id === route.machineId);
		const tabLabel =
			{
				overview: "概览",
				terminal: "终端",
				session: "会话",
				files: "文件",
				logs: "日志",
				frp: "FRP 映射",
				computer: "Computer Use",
				config: "配置",
			}[route.tab] || "概览";
		crumbs = [
			{ label: "机器", onClick: () => nav({ page: "machines" }) },
			{
				label: route.machineId,
				onClick: () =>
					nav({
						page: "machine-detail",
						machineId: route.machineId,
						tab: "overview",
					}),
			},
			{ label: tabLabel },
		];
		if (m)
			statusBadge = (
				<>
					<span className="bc-status">
						●{m.status === "在线" ? "在线" : "离线"} {m.version}
					</span>
				</>
			);
	} else if (route.page === "tasks") crumbs = [{ label: "任务" }];
	else if (route.page === "todos") crumbs = [{ label: "待办" }];
	else if (route.page === "contexts") crumbs = [{ label: "上下文" }];
	else if (route.page === "task-detail") {
		crumbs = [
			{ label: "任务", onClick: () => nav({ page: "tasks" }) },
			{ label: route.taskId },
		];
	} else if (route.page === "releases") crumbs = [{ label: "发布中心" }];
	else if (route.page === "install") crumbs = [{ label: "安装中心" }];
	else if (route.page === "storage") crumbs = [{ label: "云盘" }];
	else if (route.page === "audit") crumbs = [{ label: "审计日志" }];
	else if (route.page === "runbooks") crumbs = [{ label: "Runbook 库" }];
	else if (route.page === "automation") crumbs = [{ label: "自动化资产" }];
	else if (route.page === "approvals") crumbs = [{ label: "审批中心" }];
	else if (route.page === "settings") crumbs = [{ label: "设置" }];

	return (
		<div className="breadcrumb-bar">
			<div className="crumbs">
				{crumbs.map((c, i) => (
					<span
						key={i}
						className={c.onClick ? "clickable" : ""}
						onClick={c.onClick}
					>
						{i > 0 && <em className="sep">/</em>}
						{c.label}
					</span>
				))}
			</div>
			{statusBadge}
		</div>
	);
}

function App() {
	const [route, setRoute] = useState<Route>({ page: "dashboard" });
	const [theme, setTheme] = useState<Theme>(() =>
		localStorage.getItem("agent-gateway-theme") === "light" ? "light" : "dark",
	);
	const nav = (r: Route) => {
		setRoute(r);
		document.querySelector(".content")?.scrollTo(0, 0);
	};

	// 审批处理状态提升到 App 层：Topbar 角标与审批中心联动
	const [resolved, setResolved] = useState<
		Record<string, "approved" | "rejected">
	>({});
	const pendingCount = tasks.filter(
		(t) => t.status === "待确认" && !(t.id in resolved),
	).length;

	const page = useMemo(() => {
		switch (route.page) {
			case "dashboard":
				return <DashboardPage />;
			case "machines":
				return <MachinesListPage nav={nav} />;
			case "machine-detail":
				return (
					<MachineDetailPage
						machineId={route.machineId}
						tab={route.tab}
						nav={nav}
					/>
				);
			case "tasks":
				return <TasksListPage nav={nav} />;
			case "todos":
				return <TodosPage nav={nav} />;
			case "contexts":
				return <ContextsPage />;
			case "task-detail":
				return <TaskDetailPage taskId={route.taskId} nav={nav} />;
			case "releases":
				return <ReleasesPage />;
			case "install":
				return <InstallPage />;
			case "storage":
				return <StoragePage />;
			case "audit":
				return <AuditPage />;
			case "runbooks":
				return <RunbookLibraryPage nav={nav} />;
			case "automation":
				return <AutomationAssetsPage nav={nav} />;
			case "approvals":
				return (
					<ApprovalsPage
						nav={nav}
						resolved={resolved}
						onResolve={(id, action) =>
							setResolved({ ...resolved, [id]: action })
						}
					/>
				);
			case "settings":
				return <SettingsPage />;
			default:
				return <DashboardPage />;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [route, resolved, nav]);

	function toggleTheme() {
		setTheme((current) => {
			const next = current === "dark" ? "light" : "dark";
			localStorage.setItem("agent-gateway-theme", next);
			return next;
		});
	}

	return (
		<div className="app-shell" data-theme={theme}>
			<Sidebar route={route} nav={nav} />
			<main className="main">
				<Topbar
					nav={nav}
					pendingCount={pendingCount}
					theme={theme}
					onToggleTheme={toggleTheme}
				/>
				<Breadcrumb route={route} nav={nav} />
				<div className="content">{page}</div>
			</main>
		</div>
	);
}

export default App;
