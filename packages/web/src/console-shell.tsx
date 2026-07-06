import type { GatewayInfo } from "@noesis/shared";
import {
	Activity,
	Bot,
	LogOut,
	Moon,
	Network,
	PanelLeftClose,
	PanelLeftOpen,
	Search,
	Server,
	Settings,
	Sun,
	type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import {
	Navigate,
	NavLink,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardPage } from "./dashboard-panel.js";
import { MachineFilesRoute, MachinesPage } from "./machines-panel.js";
import { SettingsPage } from "./settings-panel.js";
import { PlaceholderPage } from "./ui-helpers.js";
import type { NoesisTheme } from "./session.js";

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

/** 登录后的控制台框架。 */
export function ConsoleShell({
	gatewayInfo,
	onLogout,
	ownerToken,
	onToggleSidebarCollapsed,
	onToggleTheme,
	sidebarCollapsed,
	theme,
}: {
	gatewayInfo: GatewayInfo;
	onLogout: () => void;
	ownerToken: string;
	onToggleSidebarCollapsed: () => void;
	onToggleTheme: () => void;
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

			<div className="noesis-main-column flex min-w-0 flex-col">
				<header className="z-20 border-b border-border/70 bg-background/72 backdrop-blur-xl">
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

				<main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-6">
					<Routes>
						<Route element={<Navigate replace to="/dashboard" />} index />
						<Route
							element={<DashboardPage gatewayInfo={gatewayInfo} />}
							path="/dashboard"
						/>
						<Route
							element={<MachinesPage ownerToken={ownerToken} />}
							path="/machines"
						/>
						<Route
							element={<MachineFilesRoute ownerToken={ownerToken} />}
							path="/machines/:machineId"
						/>
						<Route element={<TasksPage />} path="/tasks" />
						<Route
							element={
								<SettingsPage
									gatewayInfo={gatewayInfo}
									onLogout={handleLogout}
									ownerToken={ownerToken}
								/>
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
