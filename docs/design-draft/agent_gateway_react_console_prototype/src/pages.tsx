import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import {
	type DiskInfo,
	type FileNode,
	type TaskStatus,
	type RiskLevel,
	type Task,
	type Route,
	type Runbook,
	type RunbookParam,
	runbookMachines,
	runbookCapabilities,
	type TransferStatus,
	automationMacroCandidates,
	automationMacros,
	automationReports,
	activities,
	aliyunDriveStatus,
	apiTypeLabels,
	auditRows,
	buildFileTree,
	installTokens,
	machineLogs,
	machines,
	metrics,
	piConversation,
	piRunEvents,
	piRunTasks,
	piSessions,
	providerProfiles,
	releases,
	runbooks,
	tasks,
	todoContexts,
	todos,
	todoTags,
	transferJobs,
	type TodoMock,
} from "./mockData";
import { FrpMappingPage } from "./FrpMappingPage";
import {
	Badge,
	Button,
	EmptyState,
	Field,
	InfoRows,
	osIcon,
	PageTitle,
	Panel,
	Pagination,
	RiskBadge,
	Sparkline,
	StatusBadge,
	ToggleRow,
} from "./components";

// ============ 仪表盘 ============
export function DashboardPage() {
	return (
		<>
			<PageTitle
				title="仪表盘"
				actions={
					<>
						<Button>刷新</Button>
						<Button>最近 7 天 ▾</Button>
					</>
				}
			/>
			<div className="metric-grid">
				{metrics.map((m) => (
					<div className={`metric-card ${m.tone}`} key={m.label}>
						<div className="metric-icon">{m.icon}</div>
						<div className="metric-content">
							<span>{m.label}</span>
							<strong>{m.value}</strong>
							<small className={m.delta.startsWith("-") ? "down" : "up"}>
								{m.delta} 较昨日
							</small>
						</div>
						<Sparkline values={m.line} tone={m.tone} />
					</div>
				))}
			</div>
			<div className="dash-row">
				<Panel title="机器状态分布" action={<span>●在线 12 ●离线 2</span>}>
					<div className="donut-block">
						<div className="donut" />
						<strong>85.7%</strong>
						<small>在线率</small>
					</div>
				</Panel>
				<Panel title="Client 版本分布">
					<div className="bar-chart">
						{[
							["v1.2.0", 8, "green"],
							["v1.1.5", 3, "blue"],
							["v1.1.0", 2, "gray"],
							["v1.0.0", 1, "gray"],
						].map(([l, v, t]) => (
							<div key={l as string} className="bar-row">
								<span>{l}</span>
								<div className="bar-track">
									<i
										className={t as string}
										style={{ width: `${(v as number) * 10}%` }}
									/>
								</div>
								<strong>{v}</strong>
							</div>
						))}
					</div>
				</Panel>
			</div>
			<div className="dash-bottom-grid">
				<Panel title="最近失败任务">
					<table className="data-table dashboard-fail-table">
						<thead>
							<tr>
								<th>任务</th>
								<th>机器</th>
								<th>原因</th>
								<th>时间</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>task_088</td>
								<td>win-dev-01</td>
								<td>命令超时</td>
								<td>3 分钟前</td>
							</tr>
							<tr>
								<td>task_081</td>
								<td>linux-db-02</td>
								<td>Pi 执行失败</td>
								<td>12 分钟前</td>
							</tr>
						</tbody>
					</table>
				</Panel>
				<Panel title="最近活动" action={<a>查看全部</a>}>
					<div className="timeline compact-timeline">
						{activities.map((a, i) => (
							<div className="timeline-item" key={i}>
								<span className="timeline-time">{a.time}</span>
								<span className={`timeline-dot ${a.tone}`}>{a.icon}</span>
								<div>
									<strong>{a.title}</strong>
									<p>{a.desc}</p>
								</div>
								<Badge tone={a.tone as any}>{a.tag}</Badge>
							</div>
						))}
					</div>
				</Panel>
				<Panel title="数据面状态">
					<InfoRows
						rows={[
							["阿里云盘", "已授权 · 运维云盘"],
							["FRP 活跃映射", "4"],
							["Client 上线率", "85.7%"],
						]}
					/>
				</Panel>
			</div>
		</>
	);
}

// ============ 机器列表 ============
export function MachinesListPage({ nav }: { nav: (r: Route) => void }) {
	const [search, setSearch] = useState("");
	const [tagFilter, setTagFilter] = useState<string>("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// 全部可用标签（从数据派生）
	const allTags = useMemo(
		() => Array.from(new Set(machines.flatMap((m) => m.tags))).sort(),
		[],
	);

	// 筛选 → 分页
	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return machines.filter((m) => {
			const matchSearch =
				!q ||
				m.id.toLowerCase().includes(q) ||
				m.host.toLowerCase().includes(q) ||
				m.ip.includes(q) ||
				m.os.toLowerCase().includes(q);
			const matchTag = !tagFilter || m.tags.includes(tagFilter);
			return matchSearch && matchTag;
		});
	}, [search, tagFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const safePage = Math.min(page, totalPages);
	const startIdx = (safePage - 1) * pageSize;
	const pageItems = filtered.slice(startIdx, startIdx + pageSize);

	// 筛选/页大小变化时重置页码
	useEffect(() => {
		setPage(1);
	}, [search, tagFilter, pageSize]);

	const pageNumbers = useMemo(() => {
		const max = 7;
		if (totalPages <= max)
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		const left = Math.max(1, safePage - 2);
		const right = Math.min(totalPages, safePage + 2);
		const nums: (number | "...")[] = [];
		if (left > 1) {
			nums.push(1);
			if (left > 2) nums.push("...");
		}
		for (let i = left; i <= right; i++) nums.push(i);
		if (right < totalPages) {
			if (right < totalPages - 1) nums.push("...");
			nums.push(totalPages);
		}
		return nums;
	}, [safePage, totalPages]);

	return (
		<>
			<PageTitle
				title="机器"
				actions={
					<>
						<input
							className="wide-input"
							placeholder="搜索机器名 / Hostname / IP / OS…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<select
							className="select-sm"
							value={tagFilter}
							onChange={(e) => setTagFilter(e.target.value)}
						>
							<option value="">按标签（全部）</option>
							{allTags.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
						<Button tone="primary" onClick={() => nav({ page: "install" })}>
							+ 添加机器
						</Button>
					</>
				}
			/>
			<Panel>
				<table className="data-table">
					<thead>
						<tr>
							<th>名称</th>
							<th>OS</th>
							<th>状态</th>
							<th>Hostname</th>
							<th>版本</th>
							<th>Pi 状态</th>
							<th>心跳</th>
							<th>标签</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{pageItems.length === 0 ? (
							<tr className="empty-row">
								<td colSpan={9}>
									<EmptyState
										text="没有符合条件的机器"
										sub="试试清空搜索或切换标签筛选"
									/>
								</td>
							</tr>
						) : (
							pageItems.map((m) => (
								<tr
									key={m.id}
									onClick={() =>
										nav({
											page: "machine-detail",
											machineId: m.id,
											tab: "overview",
										})
									}
									className="clickable"
								>
									<td>
										<strong>{m.id}</strong>
										<small>{m.ip}</small>
									</td>
									<td>
										{osIcon(m.os)} {m.os}
									</td>
									<td>
										<StatusBadge status={m.status} />
									</td>
									<td>{m.host}</td>
									<td>{m.version}</td>
									<td>
										<Badge tone={m.pi === "已就绪" ? "purple" : "gray"}>
											{m.pi}
										</Badge>
									</td>
									<td>{m.heartbeat}</td>
									<td>
										<div className="tag-row">
											{m.tags.map((t) => (
												<Badge key={t}>{t}</Badge>
											))}
										</div>
									</td>
									<td>
										<div
											className="row-actions"
											onClick={(e) => e.stopPropagation()}
										>
											<button
												className="btn btn-sm"
												onClick={() =>
													nav({
														page: "machine-detail",
														machineId: m.id,
														tab: "files",
													})
												}
											>
												文件
											</button>
											<button
												className="btn btn-sm"
												onClick={() =>
													nav({
														page: "machine-detail",
														machineId: m.id,
														tab: "terminal",
													})
												}
											>
												终端
											</button>
											<button
												className="btn btn-sm"
												onClick={() =>
													nav({
														page: "machine-detail",
														machineId: m.id,
														tab: "config",
													})
												}
											>
												配置
											</button>
											<button className="btn btn-sm btn-ghost">⋮</button>
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>

				{/* ── 分页栏 ── */}
				<div className="pager">
					<div className="pager-info">
						{filtered.length > 0 ? (
							<>
								第 {startIdx + 1}–
								{Math.min(startIdx + pageSize, filtered.length)} 条 / 共{" "}
								{filtered.length} 条{search || tagFilter ? ` · 已筛选` : ""}
							</>
						) : (
							"共 0 条"
						)}
					</div>
					<div className="pager-controls">
						<label className="pager-size">
							每页
							<select
								value={pageSize}
								onChange={(e) => setPageSize(Number(e.target.value))}
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
							</select>
						</label>
						<button
							className="btn btn-sm"
							disabled={safePage <= 1}
							onClick={() => setPage(safePage - 1)}
						>
							‹ 上一页
						</button>
						{pageNumbers.map((n, i) =>
							n === "..." ? (
								<span key={`gap-${i}`} className="pager-gap">
									…
								</span>
							) : (
								<button
									key={n}
									className={`btn btn-sm ${n === safePage ? "btn-primary" : ""}`}
									onClick={() => setPage(n)}
								>
									{n}
								</button>
							),
						)}
						<button
							className="btn btn-sm"
							disabled={safePage >= totalPages}
							onClick={() => setPage(safePage + 1)}
						>
							下一页 ›
						</button>
					</div>
				</div>
			</Panel>
		</>
	);
}

// ============ 机器详情（Tab 容器） ============
const machineTabs: { key: string; label: string }[] = [
	{ key: "overview", label: "概览" },
	{ key: "terminal", label: "终端" },
	{ key: "session", label: "会话" },
	{ key: "files", label: "文件" },
	{ key: "logs", label: "日志" },
	{ key: "frp", label: "FRP 映射" },
	{ key: "computer", label: "Computer Use" },
	{ key: "config", label: "配置" },
];

export function MachineDetailPage({
	machineId,
	tab,
	nav,
}: {
	machineId: string;
	tab: string;
	nav: (r: Route) => void;
}) {
	const m = machines.find((x) => x.id === machineId) || machines[0];
	return (
		<>
			<div className="machine-head">
				<div className="machine-head-left">
					<span className="os-big">{osIcon(m.os)}</span>
					<div>
						<h2>{m.id}</h2>
						<small>
							{m.host} · {m.ip}
						</small>
					</div>
				</div>
				<div className="machine-head-right">
					<StatusBadge status={m.status} />
					<Badge tone="blue">{m.version}</Badge>
					<Button>操作 ▾</Button>
				</div>
			</div>
			<div className="tab-bar">
				{machineTabs.map((t) => {
					const active = t.key === tab;
					return (
						<button
							key={t.key}
							className={active ? "active" : ""}
							onClick={() =>
								nav({ page: "machine-detail", machineId: m.id, tab: t.key })
							}
						>
							{t.label}
						</button>
					);
				})}
			</div>
			<div className="tab-content">
				{tab === "overview" && <MachineOverview m={m} />}
				{tab === "terminal" && <TerminalPage m={m} />}
				{tab === "session" && <PiSessionPage m={m} />}
				{tab === "files" && <FilesPage m={m} />}
				{tab === "logs" && <MachineLogsPage m={m} />}
				{tab === "frp" && <FrpMappingPage />}
				{tab === "computer" && <ComputerUsePage m={m} nav={nav} />}
				{tab === "config" && <MachineConfigPage m={m} nav={nav} />}
			</div>
		</>
	);
}

function MachineOverview({ m }: { m: (typeof machines)[number] }) {
	const cpuPct = Number.parseInt(m.cpu, 10) || 0;
	return (
		<>
			{/* ── 能力条：位于 Tab 栏下方，紧凑显示 5 项能力 ── */}
			<div className="capability-strip">
				<span className="caps-item">
					<span className="caps-dot green" /> ⌘ 命令
					<span className="caps-val">PowerShell</span>
				</span>
				<span className="caps-item">
					<span className="caps-dot green" /> ▤ 文件
					<span className="caps-val">可用</span>
				</span>
				<span className="caps-item">
					<span className={`caps-dot ${m.pi === "已就绪" ? "green" : "red"}`} />{" "}
					π Pi<span className="caps-val">{m.piVersion}</span>
				</span>
				<span className="caps-item">
					<span
						className={`caps-dot ${m.frp === "运行中" ? "green" : "orange"}`}
					/>{" "}
					🔗 FRP<span className="caps-val">{m.frp}</span>
				</span>
				<span className="caps-item">
					<span className="caps-dot blue" /> ☁ 云盘
					<span className="caps-val">已连</span>
				</span>
				<span className="caps-item">
					<span
						className={`caps-dot ${m.os.includes("Windows") ? "green" : "orange"}`}
					/>{" "}
					🌐 Browser
					<span className="caps-val">
						{m.os.includes("Windows") ? "CDP" : "待配置"}
					</span>
				</span>
				<span className="caps-item">
					<span
						className={`caps-dot ${m.os.includes("Windows") && m.status === "在线" ? "green" : "red"}`}
					/>{" "}
					🖥 Computer
					<span className="caps-val">
						{m.os.includes("Windows") && m.status === "在线"
							? "已启用"
							: "不可用"}
					</span>
				</span>
			</div>

			{/* ── 运行时指标卡片：全宽一行，4 个 + 磁盘卡可展开 ── */}
			<div className="runtime-cards runtime-cards-4">
				<div className="runtime-card">
					<span className="rc-label">CPU</span>
					<strong className="rc-val">{m.cpu}</strong>
					<div className="rc-bar">
						<i style={{ width: `${cpuPct}%` }} />
					</div>
				</div>
				<div className="runtime-card">
					<span className="rc-label">内存</span>
					<strong className="rc-val">{m.mem}</strong>
				</div>
				<DiskOverviewCard disks={m.disks} />
				<div className="runtime-card">
					<span className="rc-label">系统负载</span>
					<strong className="rc-val">{m.load}</strong>
				</div>
				<div className="runtime-card">
					<span className="rc-label">心跳</span>
					<strong className="rc-val">{m.heartbeat}</strong>
				</div>
			</div>

			{/* ── 磁盘详情：多盘表格（全宽） ── */}
			<DiskDetailPanel disks={m.disks} />

			{/* ── 近期任务（全宽） ── */}
			<Panel title="近期任务" action={<Button size="sm">查看全部</Button>}>
				<table className="data-table">
					<thead>
						<tr>
							<th>任务</th>
							<th>类型</th>
							<th>状态</th>
							<th>时间</th>
						</tr>
					</thead>
					<tbody>
						{tasks.slice(0, 8).map((t) => (
							<tr key={t.id}>
								<td>{t.id}</td>
								<td>{t.type}</td>
								<td>
									<StatusBadge status={t.status} />
								</td>
								<td>{t.time}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

// ── 磁盘概览卡片（运行时卡片之一，可点击展开） ──
function DiskOverviewCard({ disks }: { disks: DiskInfo[] }) {
	const [expanded, setExpanded] = useState(false);
	if (!disks || disks.length === 0) {
		return (
			<div className="runtime-card runtime-card-empty">
				<span className="rc-label">磁盘</span>
				<strong className="rc-val">—</strong>
				<small className="rc-sub">机器离线，无数据</small>
			</div>
		);
	}
	const totalGb = disks.reduce((s, d) => s + d.totalGb, 0);
	const usedGb = disks.reduce((s, d) => s + d.usedGb, 0);
	const usagePct = totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0;
	// 最紧张的盘（使用率最高）
	const tense = disks.reduce((a, b) => (b.usagePct > a.usagePct ? b : a));
	const tenseTone =
		tense.usagePct >= 85 ? "red" : tense.usagePct >= 70 ? "orange" : "green";
	return (
		<div
			className={`runtime-card runtime-card-disk ${expanded ? "expanded" : ""}`}
			onClick={() => setExpanded((v) => !v)}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v);
			}}
		>
			<span className="rc-label">
				磁盘 · {disks.length} 个盘{" "}
				<i className={`rc-expand ${expanded ? "open" : ""}`}>▾</i>
			</span>
			<strong className="rc-val">
				{usedGb}G / {totalGb}G
			</strong>
			<div className="rc-disk-warn">
				<span className={`dot ${tenseTone}`} /> 最紧张：{tense.name}{" "}
				{tense.usagePct}%
			</div>
			<div className="rc-bar">
				<i className={tenseTone} style={{ width: `${usagePct}%` }} />
			</div>
		</div>
	);
}

// ── 磁盘详情面板（全宽，多盘表格） ──
function DiskDetailPanel({ disks }: { disks: DiskInfo[] }) {
	if (!disks || disks.length === 0) return null;
	return (
		<Panel title="磁盘详情" action={<Badge>{disks.length} 个分区</Badge>}>
			<div className="disk-grid">
				{disks.map((d) => {
					const tone =
						d.usagePct >= 85 ? "red" : d.usagePct >= 70 ? "orange" : "green";
					return (
						<div className={`disk-card ${tone}`} key={d.mount}>
							<div className="disk-card-head">
								<strong>
									{d.name}
									{d.label && <em className="disk-label">{d.label}</em>}
								</strong>
								<div className="disk-tags">
									{d.system && <Badge tone="blue">系统</Badge>}
									{d.readonly && <Badge tone="gray">只读</Badge>}
									<Badge tone="gray">{d.fsType}</Badge>
								</div>
							</div>
							<div className="disk-usage">
								<div className="disk-usage-bar">
									<i className={tone} style={{ width: `${d.usagePct}%` }} />
								</div>
								<span className={`disk-usage-pct ${tone}`}>{d.usagePct}%</span>
							</div>
							<div className="disk-stats">
								<div>
									<span>总量</span>
									<strong>{d.totalGb}G</strong>
								</div>
								<div>
									<span>已用</span>
									<strong>{d.usedGb}G</strong>
								</div>
								<div>
									<span>可用</span>
									<strong>{d.freeGb}G</strong>
								</div>
								<div>
									<span>挂载点</span>
									<code>{d.mount}</code>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}

// ============ 文件管理（多磁盘浏览） ============

function diskUsageTone(pct: number): "ok" | "warn" | "danger" {
	if (pct >= 85) return "danger";
	if (pct >= 70) return "warn";
	return "ok";
}
function diskUsageColor(pct: number): string {
	const t = diskUsageTone(pct);
	return t === "danger"
		? "var(--red)"
		: t === "warn"
			? "var(--orange)"
			: "var(--green)";
}
function diskRootPath(disk: DiskInfo, os: string): string {
	if (os.includes("Windows")) return disk.mount + "\\";
	return disk.mount === "/" ? "/" : disk.mount + "/";
}
function findInTree(level: FileNode[], segs: string[]): FileNode | null {
	let cur: FileNode | null = null;
	let l = level;
	for (const s of segs) {
		const hit = l.find((n) => n.name === s);
		if (!hit) return null;
		cur = hit;
		l = hit.children ?? [];
	}
	return cur;
}

function DiskSwitcherCard({
	disk,
	os,
	active,
	onClick,
}: {
	disk: DiskInfo;
	os: string;
	active: boolean;
	onClick: () => void;
}) {
	const tone = diskUsageTone(disk.usagePct);
	return (
		<button
			type="button"
			className={`disk-switch-card ${active ? "active" : ""} tone-${tone}`}
			onClick={onClick}
		>
			<div className="disk-switch-head">
				<span className="disk-switch-name">{disk.name}</span>
				{disk.system && <Badge tone="blue">系统</Badge>}
				{disk.readonly && <Badge tone="gray">只读</Badge>}
			</div>
			{disk.label && <div className="disk-switch-label">{disk.label}</div>}
			<div className="disk-switch-bar">
				<span
					className="disk-switch-fill"
					style={{
						width: `${disk.usagePct}%`,
						background: diskUsageColor(disk.usagePct),
					}}
				/>
			</div>
			<div className="disk-switch-meta">
				<span>
					{disk.usedGb}G / {disk.totalGb}G
				</span>
				<span className={`pct-${tone}`}>{disk.usagePct}%</span>
			</div>
			<div className="disk-switch-mount">
				{diskRootPath(disk, os)} · {disk.fsType}
			</div>
		</button>
	);
}

function FilesPage({ m }: { m: Machine }) {
	const os = m.os;
	const offline = m.status === "离线";
	const disks = m.disks ?? [];
	const [diskIdx, setDiskIdx] = useState(0);
	const [pathSegs, setPathSegs] = useState<string[]>([]);
	const [selected, setSelected] = useState<string | null>(null);

	const safeDiskIdx = Math.min(diskIdx, Math.max(0, disks.length - 1));
	const disk = disks[safeDiskIdx];
	const tree = useMemo(() => (disk ? buildFileTree(disk, os) : []), [disk, os]);
	const sep = os.includes("Windows") ? "\\" : "/";
	const cwdPath = disk ? diskRootPath(disk, os) + pathSegs.join(sep) : "";
	const curNode = pathSegs.length === 0 ? null : findInTree(tree, pathSegs);
	const curEntries: FileNode[] =
		pathSegs.length === 0 ? tree : (curNode?.children ?? []);
	const selNode =
		selected != null
			? (curEntries.find((n) => n.name === selected) ?? null)
			: null;

	// 切换磁盘 / 机器时重置路径
	useEffect(() => {
		setDiskIdx(0);
		setPathSegs([]);
		setSelected(null);
	}, [m.id]);
	useEffect(() => {
		setPathSegs([]);
		setSelected(null);
	}, [safeDiskIdx]);

	function enterFolder(name: string) {
		setPathSegs((s) => [...s, name]);
		setSelected(null);
	}
	function gotoSeg(idx: number) {
		setPathSegs((s) => s.slice(0, idx + 1));
		setSelected(null);
	}
	function gotoRoot() {
		setPathSegs([]);
		setSelected(null);
	}

	if (offline || disks.length === 0) {
		return (
			<Panel>
				<EmptyState
					icon="💽"
					text={offline ? "机器离线，无法浏览文件" : "该机器暂无磁盘信息"}
					sub={
						offline
							? "机器上线后可查看与传输文件"
							: "请检查客户端上报的磁盘数据"
					}
				/>
			</Panel>
		);
	}

	const spaceWarn = disk && disk.freeGb < 5;
	const spaceBlock = disk && disk.usagePct >= 98;

	return (
		<>
			<div className="notice-bar">
				ℹ 小文件走控制通道，大文件走阿里云盘中转 · 当前盘{" "}
				<code>{diskRootPath(disk, os)}</code>
				可用{" "}
				<strong style={{ color: diskUsageColor(disk.usagePct) }}>
					{disk.freeGb}G
				</strong>
			</div>

			{/* 磁盘切换条 */}
			<div className="disk-switcher">
				{disks.map((d, i) => (
					<DiskSwitcherCard
						key={d.name}
						disk={d}
						os={os}
						active={i === safeDiskIdx}
						onClick={() => setDiskIdx(i)}
					/>
				))}
			</div>

			<Panel>
				<div className="breadcrumb">
					<span className="crumb-root" onClick={gotoRoot}>
						{diskRootPath(disk, os)}
					</span>
					{pathSegs.map((s, i) => (
						<span key={s + i} className="crumb-seg">
							<span className="crumb-sep">{sep}</span>
							<span
								className={i === pathSegs.length - 1 ? "crumb-cur" : ""}
								onClick={() => gotoSeg(i)}
							>
								{s}
							</span>
						</span>
					))}
					<div className="breadcrumb-actions">
						<Button size="sm">新建</Button>
						{spaceBlock ? (
							<button className="btn btn-sm" disabled>
								上传小文件
							</button>
						) : (
							<Button size="sm">上传小文件</Button>
						)}
						{aliyunDriveStatus.authorized ? (
							<Button size="sm">云盘中转导入</Button>
						) : (
							<button
								className="btn btn-sm"
								disabled
								title="请先在云盘页面完成阿里云盘授权"
							>
								☁ 云盘中转导入
							</button>
						)}
					</div>
				</div>
			</Panel>

			{(spaceWarn || spaceBlock) && (
				<div className={`disk-space-warn ${spaceBlock ? "block" : "warn"}`}>
					{spaceBlock
						? `⛔ 当前盘 ${disk.name} 已满（${disk.usagePct}%），无法写入。请先清理或选择其他磁盘。`
						: `⚠ 当前盘 ${disk.name} 剩余空间不足（${disk.freeGb}G / ${disk.totalGb}G，${disk.usagePct}%），上传大文件可能失败。`}
				</div>
			)}

			<div className="file-layout">
				<Panel title="目录树" className="tree-panel">
					<FileTreeView
						tree={tree}
						pathSegs={pathSegs}
						onNavigate={(segs) => {
							setPathSegs(segs);
							setSelected(null);
						}}
					/>
				</Panel>

				<Panel className="file-table-panel">
					<table className="data-table">
						<thead>
							<tr>
								<th>名称</th>
								<th>大小</th>
								<th>修改时间</th>
								<th>权限</th>
							</tr>
						</thead>
						<tbody>
							{curEntries.length === 0 && (
								<tr>
									<td colSpan={4} className="empty-cell">
										空目录
									</td>
								</tr>
							)}
							{curEntries.map((f) => (
								<tr
									key={f.name}
									className={selected === f.name ? "selected" : ""}
									onClick={() => setSelected(f.name)}
									onDoubleClick={() =>
										f.kind === "folder" ? enterFolder(f.name) : undefined
									}
								>
									<td>
										{f.kind === "folder" ? "📁" : "📄"}{" "}
										<strong>{f.name}</strong>{" "}
										{f.cloud && <Badge tone="orange">云盘</Badge>}
									</td>
									<td>{f.kind === "folder" ? "-" : f.size}</td>
									<td>{f.time}</td>
									<td>
										<code>{f.perm}</code>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Panel>

				<aside className="side-stack">
					<Panel title="预览">
						{selNode ? (
							<>
								<div className="file-preview-title">
									{selNode.kind === "folder" ? "📁" : "📄"} {selNode.name}
								</div>
								{selNode.kind === "file" ? (
									<pre className="code-preview">{previewText(selNode)}</pre>
								) : (
									<div className="folder-preview-meta">
										<div>类型：文件夹</div>
										<div>子项：{selNode.children?.length ?? 0} 个</div>
										<div>路径：{cwdPath}</div>
									</div>
								)}
								<div className="button-row">
									<Button size="sm">编辑</Button>
									<Button size="sm" tone="danger">
										删除
									</Button>
									{selNode.kind === "file" && aliyunDriveStatus.authorized && (
										<Button size="sm">☁ 云盘中转导出</Button>
									)}
									{selNode.kind === "file" && !aliyunDriveStatus.authorized && (
										<button
											className="btn btn-sm"
											disabled
											title="请先在云盘页面完成阿里云盘授权"
										>
											☁ 云盘中转导出
										</button>
									)}
								</div>
							</>
						) : (
							<EmptyState
								icon="📄"
								text="未选择文件"
								sub="点击右侧表格中的文件以预览"
							/>
						)}
					</Panel>
				</aside>
			</div>
		</>
	);
}

function previewText(f: FileNode): string {
	switch (f.fileType) {
		case "TypeScript":
			return `import { tool } from "./util";\nexport const x = tool();\n`;
		case "JSON":
			return `{\n  "name": "app",\n  "version": "1.0.0"\n}\n`;
		case "Markdown":
			return `# ${f.name}\n\n原型文件预览。\n`;
		case "日志":
			return `[${new Date().toISOString()}] INFO service started\n[${new Date().toISOString()}] WARN cache miss\n`;
		case "配置":
			return `# ${f.name}\nhost = 0.0.0.0\nport = 8080\n`;
		case "压缩包":
			return `（二进制文件，无法预览）\n${f.size} · ${f.fileType}`;
		default:
			return `（${f.fileType ?? "未知"} · ${f.size ?? "-"}）\n原型终端，文件内容为模拟数据。`;
	}
}

function FileTreeView({
	tree,
	pathSegs,
	onNavigate,
}: {
	tree: FileNode[];
	pathSegs: string[];
	onNavigate: (segs: string[]) => void;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(new Set(["__root__"]));
	function toggle(key: string) {
		setExpanded((s) => {
			const n = new Set(s);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});
	}
	function render(
		nodes: FileNode[],
		depth: number,
		parentSegs: string[],
	): React.ReactNode {
		return nodes
			.filter((n) => n.kind === "folder")
			.map((n) => {
				const segs = [...parentSegs, n.name];
				const key = segs.join("/");
				const isOpen = expanded.has(key);
				const isActive =
					pathSegs.length === segs.length &&
					segs.every((s, i) => pathSegs[i] === s);
				const hasSub = n.children?.some((c) => c.kind === "folder");
				return (
					<div key={key}>
						<div
							className={`tree-node ${isActive ? "active" : ""}`}
							style={{ paddingLeft: 8 + depth * 14 }}
							onClick={() => onNavigate(segs)}
						>
							<span
								className="tree-caret"
								onClick={(e) => {
									e.stopPropagation();
									toggle(key);
								}}
							>
								{hasSub ? (isOpen ? "▾" : "▸") : "•"}
							</span>
							<span className="tree-icon">📁</span>
							<span className="tree-name">{n.name}</span>
						</div>
						{isOpen && n.children && <>{render(n.children, depth + 1, segs)}</>}
					</div>
				);
			});
	}
	return <div className="tree">{render(tree, 0, [])}</div>;
}

// ============ 终端（纯命令终端） ============
function TerminalPage({ m }: { m: (typeof machines)[number] }) {
	return (
		<>
			<div className="terminal-bar">
				<div className="terminal-mode-tabs">
					<button className="active">⌘ 命令终端</button>
				</div>
				<div className="terminal-bar-right">
					<span className="dot green" /> {m.id} · {m.os}
				</div>
			</div>
			<CommandTerminal m={m} />
		</>
	);
}

// ---------- 命令终端（交互式模拟） ----------
type Shell = "bash" | "powershell";
type TermLine =
	| { id: number; kind: "cmd"; cwd: string; text: string }
	| {
			id: number;
			kind: "out";
			text: string;
			tone?: "err" | "warn" | "ok" | "dim";
	  }
	| { id: number; kind: "banner"; text: string };
type SessionState = "idle" | "connecting" | "connected";
type Machine = (typeof machines)[number];

type CmdCtx = { shell: Shell; cwd: string; home: string; m: Machine };
type CmdResult = {
	out: { text: string; tone?: "err" | "warn" | "ok" | "dim" }[];
	cwd?: string;
	clear?: boolean;
	exit?: boolean;
};

function defaultHome(shell: Shell): string {
	return shell === "powershell" ? "C:\\Users\\admin" : "/home/admin";
}
function sepChar(shell: Shell): string {
	return shell === "powershell" ? "\\" : "/";
}
function shortCwd(cwd: string, home: string, shell: Shell): string {
	if (cwd === home) return "~";
	const s = sepChar(shell);
	if (cwd.startsWith(home + s)) return "~" + cwd.slice(home.length);
	return cwd;
}
function promptPrefix(
	shell: Shell,
	host: string,
	cwd: string,
	home: string,
): string {
	if (shell === "bash") {
		return `admin@${host.toLowerCase()}:${shortCwd(cwd, home, shell)}$`;
	}
	return `PS ${cwd}>`;
}
function resolvePath(
	cwd: string,
	target: string,
	home: string,
	shell: Shell,
): string {
	const s = sepChar(shell);
	if (!target || target === "~") return home;
	if (target === ".") return cwd;
	if (target.startsWith("~" + s)) return home + target.slice(1);
	const isAbs =
		shell === "bash" ? target.startsWith("/") : /^[A-Za-z]:[\\/]/.test(target);
	let base = isAbs ? "" : cwd;
	for (const p of target.split(/[\\/]/)) {
		if (!p || p === ".") continue;
		if (p === "..") {
			const idx = base.lastIndexOf(s);
			if (idx > 0) base = base.slice(0, idx);
			else base = "";
			if (shell === "powershell" && /^[A-Za-z]:$/.test(base)) base = base + s;
		} else {
			base = base ? base + s + p : p;
		}
	}
	return base || (shell === "powershell" ? cwd : s);
}
function listEntries(cwd: string, home: string, shell: Shell) {
	const inHome = cwd === home;
	const inProj = /projects?$/i.test(cwd);
	if (inHome) {
		return [
			{ name: "Desktop", dir: true },
			{ name: "Documents", dir: true },
			{ name: "Downloads", dir: true },
			{ name: "Projects", dir: true },
			{ name: shell === "powershell" ? "profile.ps1" : ".bashrc", dir: false },
			{ name: "package.json", dir: false },
		];
	}
	if (inProj) {
		return [
			{ name: "src", dir: true },
			{ name: "dist", dir: true },
			{ name: "node_modules", dir: true },
			{ name: "tests", dir: true },
			{ name: "package.json", dir: false },
			{ name: "README.md", dir: false },
			{ name: "tsconfig.json", dir: false },
		];
	}
	return [
		{ name: "src", dir: true },
		{ name: "lib", dir: true },
		{ name: "config.json", dir: false },
		{ name: "notes.txt", dir: false },
	];
}
function runCommand(raw: string, ctx: CmdCtx): CmdResult {
	const { shell, cwd, home, m } = ctx;
	const trimmed = raw.trim();
	if (!trimmed) return { out: [] };
	const sp = trimmed.indexOf(" ");
	const cmd = (sp < 0 ? trimmed : trimmed.slice(0, sp)).toLowerCase();
	const args = sp < 0 ? "" : trimmed.slice(sp + 1).trim();
	const node = m.runtime?.node ?? "v24.15.0";
	const npm = m.runtime?.npm ?? "10.7.0";
	const notFound =
		shell === "bash"
			? `bash: ${cmd}: command not found`
			: `${cmd} : 无法将"${cmd}"项识别为 cmdlet、函数、脚本文件或可运行程序的名称。`;
	const o = (
		text: string,
		tone?: "err" | "warn" | "ok" | "dim",
	): { text: string; tone?: "err" | "warn" | "ok" | "dim" } => ({ text, tone });
	switch (cmd) {
		case "help":
		case "?":
			return {
				out: [
					o(
						"可用命令: help · pwd · cd <path> · ls/dir · echo · whoami · date · cat <f> · node -v · npm i · git status · clear/cls · exit",
						"dim",
					),
				],
			};
		case "pwd":
		case "get-location":
			return { out: [o(cwd)] };
		case "cd":
			if (!args) return { out: [], cwd: home };
			return { out: [], cwd: resolvePath(cwd, args, home, shell) };
		case "ls":
		case "dir": {
			const ents = listEntries(cwd, home, shell);
			const names = ents.map((e) => (e.dir ? e.name + "/" : e.name));
			return { out: [o(names.join("  "))] };
		}
		case "echo":
			return { out: [o(args)] };
		case "whoami":
			return { out: [o("admin")] };
		case "date":
			return { out: [o(new Date().toString())] };
		case "cat":
		case "get-content":
			if (!args)
				return {
					out: [
						o(
							shell === "bash" ? "cat: 缺少文件操作数" : "cat : 缺少参数",
							"err",
						),
					],
				};
			return {
				out: [
					o(
						`# ${args}\n（模拟文件内容）这是原型终端，cat 输出为模拟数据。`,
						"dim",
					),
				],
			};
		case "node":
			return { out: [o(node, "ok")] };
		case "npm": {
			if (/^-v|--version|-version$/.test(args)) return { out: [o(npm, "ok")] };
			if (/^(install|i|ci)$/.test(args.split(" ")[0] || "")) {
				const n = 200 + Math.floor(Math.random() * 200);
				const sec = 6 + Math.floor(Math.random() * 10);
				const fund = Math.floor(Math.random() * 5);
				return {
					out: [
						o(
							`\nadded ${n} packages, and audited ${n + 12} packages in ${sec}s\n\n${fund} packages are looking for funding\n  run 'npm fund' for details\n\nfound 0 vulnerabilities`,
							"ok",
						),
					],
				};
			}
			return { out: [o(`npm ${args}`, "dim")] };
		}
		case "git": {
			const sub = args.split(" ")[0] || "";
			if (sub === "status")
				return {
					out: [
						o(
							"On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean",
						),
					],
				};
			if (sub === "log")
				return {
					out: [
						o(
							"commit a1b2c3d (HEAD -> main, origin/main)\nAuthor: Admin <admin@local>\nDate:   " +
								new Date().toDateString() +
								"\n\n    prototype: refine interactive terminal",
						),
					],
				};
			return {
				out: [o(`git: '${sub}' 不是一个 git 命令。参见 'git --help'。`, "err")],
			};
		}
		case "clear":
		case "cls":
			return { out: [], clear: true };
		case "exit":
		case "logout":
			return { out: [], exit: true };
		case "mkdir":
		case "touch":
		case "new-item":
			return { out: [] };
		default:
			return { out: [o(notFound, "err")] };
	}
}

function bannerLines(
	shell: Shell,
	m: Machine,
	nextId: () => number,
): TermLine[] {
	const ts = new Date().toString();
	if (shell === "powershell") {
		return [
			{ id: nextId(), kind: "banner", text: "Windows PowerShell" },
			{
				id: nextId(),
				kind: "banner",
				text: "版权所有 (C) Microsoft Corporation。保留所有权利。",
			},
			{
				id: nextId(),
				kind: "banner",
				text: `尝试新的跨平台 PowerShell https://aka.ms/pscore6  ·  ${ts}`,
			},
			{ id: nextId(), kind: "out", text: "", tone: "dim" },
		];
	}
	return [
		{
			id: nextId(),
			kind: "banner",
			text: "Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-91-generic x86_64)",
		},
		{
			id: nextId(),
			kind: "banner",
			text: " * Documentation:  https://help.ubuntu.com",
		},
		{ id: nextId(), kind: "banner", text: `Last login: ${ts} from ${m.ip}` },
		{ id: nextId(), kind: "out", text: "", tone: "dim" },
	];
}

function TermLineView({
	line,
	shell,
	host,
	home,
}: {
	line: TermLine;
	shell: Shell;
	host: string;
	home: string;
}) {
	if (line.kind === "cmd") {
		return (
			<div className="term-line term-line-cmd">
				<span className="term-prompt">
					{promptPrefix(shell, host, line.cwd, home)}
				</span>
				<span className="term-cmd-text">{line.text}</span>
			</div>
		);
	}
	const cls =
		line.kind === "banner"
			? "term-line term-line-banner"
			: `term-line term-line-out ${line.tone ? `tone-${line.tone}` : ""}`;
	return <div className={cls}>{line.text}</div>;
}

function CommandTerminal({ m }: { m: Machine }) {
	const defaultShell: Shell = m.os.includes("Windows") ? "powershell" : "bash";
	const [session, setSession] = useState<SessionState>("idle");
	const [shell, setShell] = useState<Shell>(defaultShell);
	const [lines, setLines] = useState<TermLine[]>([]);
	const [cwd, setCwd] = useState<string>(defaultHome(defaultShell));
	const [input, setInput] = useState("");
	const [hist, setHist] = useState<string[]>([]);
	const [histIdx, setHistIdx] = useState(-1);
	const idRef = useRef(0);
	const bodyRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const offline = m.status === "离线";
	const home = defaultHome(shell);

	const nextId = () => {
		idRef.current += 1;
		return idRef.current;
	};

	useEffect(() => {
		if (bodyRef.current)
			bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
	}, [lines, session]);

	useEffect(() => {
		setSession("idle");
		setLines([]);
		setInput("");
		setHist([]);
		setHistIdx(-1);
		setShell(defaultShell);
		setCwd(defaultHome(defaultShell));
		idRef.current = 0;
	}, [m.id, m.os, defaultShell]);

	function connect() {
		if (offline) return;
		setSession("connecting");
		setLines([]);
		setInput("");
		setCwd(home);
		idRef.current = 0;
		window.setTimeout(() => {
			setLines(bannerLines(shell, m, nextId));
			setSession("connected");
		}, 700);
	}

	function disconnect() {
		setSession("idle");
		setLines([]);
		setInput("");
		setHist([]);
		setHistIdx(-1);
	}

	function submit() {
		const raw = input;
		setLines((ls) => [...ls, { id: nextId(), kind: "cmd", cwd, text: raw }]);
		if (raw.trim()) setHist((h) => [...h, raw]);
		setHistIdx(-1);
		setInput("");
		const r = runCommand(raw, { shell, cwd, home, m });
		if (r.clear) {
			setLines([]);
			return;
		}
		if (r.exit) {
			disconnect();
			return;
		}
		if (r.cwd !== undefined) setCwd(r.cwd);
		const outs: TermLine[] = r.out.map((x) => ({
			id: nextId(),
			kind: "out",
			text: x.text,
			tone: x.tone,
		}));
		if (outs.length) setLines((ls) => [...ls, ...outs]);
	}

	function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			submit();
			return;
		}
		if (e.ctrlKey && e.key === "l") {
			e.preventDefault();
			setLines([]);
			return;
		}
		if (e.key === "ArrowUp") {
			if (!hist.length) return;
			e.preventDefault();
			const ni = histIdx < 0 ? hist.length - 1 : Math.max(0, histIdx - 1);
			setHistIdx(ni);
			setInput(hist[ni]);
		} else if (e.key === "ArrowDown") {
			if (!hist.length || histIdx < 0) return;
			e.preventDefault();
			const ni = histIdx + 1;
			if (ni >= hist.length) {
				setHistIdx(-1);
				setInput("");
			} else {
				setHistIdx(ni);
				setInput(hist[ni]);
			}
		}
	}

	// ── 未连接 / 连接中 ──
	if (session !== "connected") {
		return (
			<div className="term-session-card">
				<div
					className={`term-session-icon ${session === "connecting" ? "spin" : ""}`}
				>
					{session === "connecting" ? "◐" : "⌘"}
				</div>
				<h3>
					{session === "connecting" ? "正在建立控制通道…" : "打开终端会话"}
				</h3>
				<p className="term-session-sub">
					{session === "connecting"
						? `连接到 ${m.id}（${m.host} · ${m.os}）`
						: offline
							? "该机器当前离线，无法建立终端会话"
							: `将在 ${m.host}（${m.ip}）上启动一个交互式 shell`}
				</p>
				{session === "idle" && !offline && (
					<div className="term-session-actions">
						<label className="term-shell-pick">
							<span>Shell</span>
							<select
								value={shell}
								onChange={(e) => {
									const s = e.target.value as Shell;
									setShell(s);
									setCwd(defaultHome(s));
								}}
							>
								<option value="powershell">PowerShell</option>
								<option value="bash">bash</option>
							</select>
						</label>
						<Button tone="primary" onClick={connect}>
							⏎ 连接终端
						</Button>
					</div>
				)}
			</div>
		);
	}

	// ── 已连接：交互式终端 ──
	return (
		<div className="command-terminal-layout term-connected">
			<div className="term-toolbar">
				<span className="term-shell-badge">
					{shell === "powershell" ? "PS" : "bash"}
				</span>
				<span className="term-toolbar-host">
					<span className="dot green" /> {m.id} · {m.host}
				</span>
				<span className="term-toolbar-cwd">{shortCwd(cwd, home, shell)}</span>
				<div className="term-toolbar-actions">
					<button
						type="button"
						className="term-tool-btn"
						onClick={() => setLines([])}
					>
						清屏
					</button>
					<button type="button" className="term-tool-btn" onClick={disconnect}>
						断开
					</button>
				</div>
			</div>
			<div
				className="cmd-output-area"
				ref={bodyRef}
				onClick={() => inputRef.current?.focus()}
			>
				{lines.map((l) => (
					<TermLineView
						key={l.id}
						line={l}
						shell={shell}
						host={m.host}
						home={home}
					/>
				))}
				<div className="term-input-row">
					<span className="term-prompt">
						{promptPrefix(shell, m.host, cwd, home)}
					</span>
					<input
						ref={inputRef}
						className="term-input"
						autoFocus
						spellCheck={false}
						autoComplete="off"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={onKeyDown}
					/>
				</div>
			</div>
		</div>
	);
}

// ============ 会话 Tab（Pi 交互终端） ============
export function PiSessionPage({ m }: { m: (typeof machines)[number] }) {
	return (
		<div className="pi-page" style={{ height: "calc(100vh - 128px)" }}>
			<Panel
				title="Pi 会话"
				action={
					<Button size="sm" tone="primary">
						+ 新会话
					</Button>
				}
				className="pi-session-panel"
			>
				<div className="pi-terminal-embed">
					<div className="pi-subtopbar">
						<div className="pi-subtopbar-left">
							<span className="machine-badge">
								{m.id} · {m.os}
							</span>
							<select
								className="select-input compact-select"
								defaultValue="claude-sonnet-4"
							>
								<option value="claude-sonnet-4">Sonnet 4</option>
								<option value="gpt-4o">GPT-4o</option>
								<option value="deepseek-chat">DeepSeek Chat</option>
							</select>
							<button className="dropdown-btn">thinking 高 ▾</button>
							<Button size="sm" tone="danger">
								abort ▾
							</Button>
						</div>
						<div className="pi-subtopbar-right">
							<span className="token-readout">⚡ 12.3k · $0.42</span>
						</div>
					</div>
					<div className="pi-terminal-main">
						<aside className="pi-subsidebar pi-session-sidebar">
							<input className="session-search" placeholder="搜索会话…" />
							<div className="session-items">
								{piSessions.map((s, i) => (
									<div
										key={s.id}
										className={`session-item ${i === 0 ? "active" : ""}`}
									>
										<div className="session-name">{s.name}</div>
										<div className="session-preview">{s.preview}</div>
										<div className="session-meta">
											<small>{s.time}</small>
											<button className="dots">⋯</button>
										</div>
									</div>
								))}
							</div>
						</aside>
						<div className="pi-conversation-wrap">
							<div className="pi-status-corner">
								<span className="dot green" /> 已连接
							</div>
							<div className="pi-conversation">
								{piConversation.map((msg, i) => (
									<PiMessageView key={i} msg={msg} />
								))}
								<div className="pi-input-bar">
									<textarea placeholder="输入消息，/ 触发命令…" />
									<div className="pi-input-actions">
										<Button tone="warning" size="sm">
											steer
										</Button>
										<Button tone="primary" size="sm">
											发送 ↵
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Panel>
		</div>
	);
}

function PiMessageView({ msg }: { msg: (typeof piConversation)[number] }) {
	if (msg.kind === "user") return <div className="msg user">{msg.text}</div>;
	if (msg.kind === "assistant")
		return <div className="msg assistant">{msg.text}</div>;
	if (msg.kind === "thinking")
		return (
			<div className="msg thinking-card">
				<span className="thinking-head">▾ 思考过程</span>
				<p className="muted mono">{msg.preview}</p>
			</div>
		);
	if (msg.kind === "tool")
		return (
			<div className="msg tool-card">
				<div className="tool-head">
					<span>🔧 {msg.tool}</span>
					<small>{msg.dur}</small>
					<span className="collapse">▸</span>
				</div>
				<pre className="tool-cmd mono">{msg.cmd}</pre>
				<pre className="tool-out mono">{msg.out}</pre>
			</div>
		);
	if (msg.kind === "markdown")
		return (
			<div className="msg assistant">
				{msg.text}
				{msg.list && (
					<ul className="md-list">
						{msg.list.map((li) => (
							<li key={li}>{li}</li>
						))}
					</ul>
				)}
			</div>
		);
	if (msg.kind === "turnend")
		return (
			<div className="turn-end">
				── turn 收口 ── <span>{msg.summary}</span>
			</div>
		);
	return null;
}

function ComputerUsePage({
	m,
	nav,
}: {
	m: (typeof machines)[number];
	nav: (r: Route) => void;
}) {
	const isWindows = m.os.includes("Windows");
	const reports = automationReports.filter((r) => r.machineId === m.id);
	return (
		<>
			<div className="automation-status-grid">
				<Panel
					title="能力状态"
					action={
						<Badge tone={isWindows ? "green" : "orange"}>
							{isWindows ? "可用" : "待适配"}
						</Badge>
					}
				>
					<InfoRows
						rows={[
							["Browser Use", isWindows ? "CDP · Chrome/Edge" : "未检测浏览器"],
							[
								"Computer Use Pack",
								isWindows ? "enikk v1.2.0 · 已安装" : "未安装",
							],
							["策略", isWindows ? "已启用 · macroFirst" : "未启用"],
							["Vision Profile", "公司代理 · 支持图片"],
						]}
					/>
				</Panel>
				<Panel title="自检" action={<Button size="sm">重新自检</Button>}>
					<div className="check-list">
						<span>✅ enikk runtime</span>
						<span>✅ 截图 / OCR / 输入 dry-run</span>
						<span>✅ 可交互桌面 session</span>
						<span>✅ VLM Provider Profile</span>
						<span>⚠ TURN 未配置，WebRTC 跨网可能 fallback 关键帧</span>
					</div>
				</Panel>
			</div>
			<div className="automation-actions-grid">
				<Panel title="环境操作">
					<div className="button-row wrap">
						<Button>安装 / 更新能力包</Button>
						<Button tone="primary">启用 Computer Use</Button>
						<Button>修复环境</Button>
						<Button tone="danger">停用</Button>
					</div>
					<p className="hint-text">
						修复涉及管理员权限时，会先在 Web 请求确认，再由目标电脑弹出系统
						UAC。
					</p>
				</Panel>
				<Panel
					title="新建自动化任务"
					action={<Badge tone="purple">macroFirst</Badge>}
				>
					<label className="field">
						<span>任务说明</span>
						<textarea defaultValue="导出今天日报，并保存到下载目录" />
					</label>
					<div className="button-row wrap">
						<Button tone="primary">优先 Browser Use 运行</Button>
						<Button>直接 Computer Use</Button>
						<Button>observeOnly</Button>
					</div>
				</Panel>
			</div>
			<div className="automation-actions-grid">
				<Panel
					title="最近自动化报告"
					action={
						<Button size="sm" onClick={() => nav({ page: "automation" })}>
							查看资产库
						</Button>
					}
				>
					<table className="data-table compact">
						<thead>
							<tr>
								<th>任务</th>
								<th>类型</th>
								<th>结果</th>
								<th>摘要</th>
							</tr>
						</thead>
						<tbody>
							{reports.map((r) => (
								<tr
									key={r.taskId}
									className="clickable"
									onClick={() => nav({ page: "task-detail", taskId: r.taskId })}
								>
									<td className="mono">{r.taskId}</td>
									<td>
										<Badge tone={r.kind === "browser" ? "cyan" : "purple"}>
											{r.kind}
										</Badge>
									</td>
									<td>
										<StatusBadge
											status={r.outcome === "success" ? "成功" : "需复核"}
										/>
									</td>
									<td>{r.summary}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Panel>
				<Panel title="WebRTC 旁观 / 接管">
					<div className="remote-card">
						<div className="remote-screen">
							实时屏幕预览
							<br />
							<small>AI_CONTROL · P2P-first</small>
						</div>
						<div className="button-row wrap">
							<Button>打开旁观</Button>
							<Button tone="warning">接管并暂停 AI</Button>
							<Button>关键帧模式</Button>
						</div>
					</div>
				</Panel>
			</div>
		</>
	);
}

// ============ 机器配置（Pi 工作台策略）============
function MachineConfigPage({
	m: _m,
	nav: _nav,
}: {
	m: (typeof machines)[number];
	nav: (r: Route) => void;
}) {
	return (
		<div className="config-page">
			<Panel title="Pi 策略" action={<Badge tone="gray">机器级策略</Badge>}>
				<p className="hint-text">
					此处的策略为该机器的 Pi 默认行为。单次任务的约束在「任务」Tab
					发起任务时指定。
				</p>
				<div className="pi-policy-grid">
					<div className="policy-section">
						<h4>Provider Profile</h4>
						<label className="field">
							<span>默认 Profile</span>
							<select className="select-input" defaultValue="profile_001">
								{providerProfiles.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
										{p.scope === "machine" ? "（机器级）" : ""}
									</option>
								))}
							</select>
						</label>
						<div className="button-row">
							<Button size="sm">复制为机器 Profile</Button>
						</div>
					</div>
					<div className="policy-section">
						<h4>运行时策略</h4>
						<label className="field">
							<span>Key 注入</span>
							<select className="select-input" defaultValue="managed">
								<option value="managed">managed（集中管控）</option>
								<option value="fallback">fallback（本地优先）</option>
								<option value="local_only">local_only（仅本地）</option>
							</select>
						</label>
						<label className="field">
							<span>项目信任</span>
							<select className="select-input" defaultValue="always">
								<option value="always">always（--approve）</option>
								<option value="never">never（--no-approve）</option>
							</select>
						</label>
						<Field label="默认超时（秒）" value="3600" />
					</div>
					<div className="policy-section">
						<h4>工具权限默认</h4>
						<label className="field">
							<span>工具模式</span>
							<select className="select-input" defaultValue="full">
								<option value="full">完全权限</option>
								<option value="readonly">只读分析</option>
								<option value="custom">自定义</option>
							</select>
						</label>
						<h4 style={{ marginTop: 12 }}>危险操作拦截</h4>
						<ToggleRow title="启用拦截" desc="命中规则时暂停执行" on />
						<div className="tag-input-list">
							<Badge tone="red">rm -rf</Badge>
							<Badge tone="red">git push</Badge>
							<Badge tone="red">drop table</Badge>
							<Button size="sm">+ 添加规则</Button>
						</div>
						<small className="hint-text">
							仅 pi.terminal 交互有效，pi.run 自动拒绝
						</small>
					</div>
				</div>
				<div className="button-row">
					<Button tone="primary">保存策略</Button>
				</div>
			</Panel>
			<div className="config-hint">
				ℹ Pi 会话在「会话」Tab，Pi 批处理任务在「任务」Tab，Pi 策略在本页上方。
			</div>
		</div>
	);
}

// ============ 机器日志 ============
function MachineLogsPage({ m: _m }: { m: (typeof machines)[number] }) {
	return (
		<Panel
			title="机器日志"
			action={
				<>
					<select className="select-sm">
						<option>全部级别</option>
						<option>INFO</option>
						<option>WARN</option>
						<option>ERROR</option>
					</select>
					<Button size="sm">刷新</Button>
					<Button size="sm">导出到云盘</Button>
				</>
			}
		>
			<pre className="terminal mono">
				{machineLogs.map((l, i) => (
					<span
						key={i}
						className={
							l.includes("ERROR") ? "err" : l.includes("WARN") ? "warn" : ""
						}
					>
						{l}
						{"\n"}
					</span>
				))}
			</pre>
		</Panel>
	);
}

// ============ 全局任务列表（合并常规任务 + Pi 批处理）============
const taskTypeTone: Record<
	string,
	"cyan" | "purple" | "orange" | "gray" | "blue"
> = {
	command: "cyan",
	file: "gray",
	install: "orange",
	"pi.run": "purple",
	"browser.run": "cyan",
	"computer.run": "blue",
	pi_batch: "purple",
};
const taskTypeLabel: Record<string, string> = {
	command: "命令",
	file: "文件",
	install: "安装",
	"pi.run": "Pi 批处理",
	"browser.run": "Browser Use",
	"computer.run": "Computer Use",
	pi_batch: "Pi 批处理",
};
const piStatusMap: Record<string, TaskStatus> = {
	running: "运行中",
	completed: "成功",
	failed: "失败",
	canceled: "待确认",
};

function UnifiedTaskRow({
	id,
	type,
	content,
	target,
	status,
	risk,
	time,
	dur,
	onClick,
	rightAction,
}: {
	id: string;
	type: string;
	content: string;
	target?: string;
	status: TaskStatus;
	risk?: RiskLevel;
	time: string;
	dur: string;
	onClick?: () => void;
	rightAction?: React.ReactNode;
}) {
	return (
		<tr className={onClick ? "clickable" : ""} onClick={onClick}>
			<td className="mono">{id}</td>
			<td>
				<Badge tone={taskTypeTone[type] || "gray"}>
					{taskTypeLabel[type] || type}
				</Badge>
			</td>
			<td>{content}</td>
			<td>{target || "—"}</td>
			<td>
				<StatusBadge status={status} />
			</td>
			<td>{risk ? <RiskBadge risk={risk} /> : "—"}</td>
			<td>{time}</td>
			<td>{dur}</td>
			<td>
				{rightAction || (
					<>
						<Button size="sm">详情</Button>
						{status === "待确认" && (
							<Button size="sm" tone="primary">
								确认
							</Button>
						)}
					</>
				)}
			</td>
		</tr>
	);
}

// ============ Todo / Context 协作 ============
const todoStatusText = {
	todo: "待办",
	doing: "进行中",
	awaiting_confirmation: "待确认",
	done: "完成",
	failed: "失败",
} as const;

function TodoStatusBadge({ status }: { status: TodoMock["status"] }) {
	const tone =
		status === "done"
			? "green"
			: status === "failed"
				? "red"
				: status === "doing" || status === "awaiting_confirmation"
					? "orange"
					: "blue";
	return <Badge tone={tone}>{todoStatusText[status]}</Badge>;
}

function assigneeLabel(a: TodoMock["assignee"]) {
	if (!a) return "未分配";
	if (a === "me") return "我";
	return a;
}

function TodoContextBadge({ todo }: { todo: TodoMock }) {
	const parent = todos.find((t) => t.id === todo.parentId);
	const contextId = todo.contextId ?? parent?.contextId;
	const ctx = todoContexts.find((c) => c.id === contextId);
	if (!ctx) return <Badge tone="gray">无 Context</Badge>;
	return <Badge tone={ctx.archived ? "red" : "purple"}>{ctx.name}</Badge>;
}

export function TodosPage({ nav }: { nav: (r: Route) => void }) {
	const [selectedId, setSelectedId] = useState(todos[0]?.id || "");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");
	const [ready, setReady] = useState("");
	const [tagId, setTagId] = useState("");
	const [contextId, setContextId] = useState("");
	const [assignee, setAssignee] = useState("");
	const [archived, setArchived] = useState("active");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	const childMap = useMemo(() => {
		const map: Record<string, TodoMock[]> = {};
		for (const t of todos) {
			if (!t.parentId) continue;
			map[t.parentId] = [...(map[t.parentId] || []), t];
		}
		return map;
	}, []);

	function effectiveContextId(t: TodoMock) {
		const parent = todos.find((x) => x.id === t.parentId);
		return t.contextId ?? parent?.contextId ?? "";
	}

	function matches(t: TodoMock) {
		const q = search.trim().toLowerCase();
		const ctx = todoContexts.find((c) => c.id === effectiveContextId(t));
		const text =
			`${t.id} ${t.title} ${t.description} ${ctx?.name || ""}`.toLowerCase();
		return (
			(!q || text.includes(q)) &&
			(!status || t.status === status) &&
			(!ready || String(t.ready === true) === ready) &&
			(!tagId || t.tagIds.includes(tagId)) &&
			(!contextId || effectiveContextId(t) === contextId) &&
			(!assignee ||
				(assignee === "unassigned"
					? !t.assignee
					: t.assignee?.startsWith(assignee))) &&
			(archived === "all" ||
				(archived === "archived" ? t.archived : !t.archived))
		);
	}

	const rows = useMemo(() => {
		const dueRank = (due?: string | null) =>
			due === "今日" ? 0 : due === "明日" ? 1 : due === "本周" ? 2 : 9;
		return todos
			.filter(matches)
			.sort(
				(a, b) =>
					b.priority - a.priority ||
					dueRank(a.due) - dueRank(b.due) ||
					a.id.localeCompare(b.id),
			);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, status, ready, tagId, contextId, assignee, archived]);

	const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
	const safePage = Math.min(page, totalPages);
	const startIdx = (safePage - 1) * pageSize;
	const pageRows = rows.slice(startIdx, startIdx + pageSize);
	const pageNumbers = useMemo(() => {
		const max = 7;
		if (totalPages <= max)
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		const left = Math.max(1, safePage - 2);
		const right = Math.min(totalPages, safePage + 2);
		const nums: (number | "...")[] = [];
		if (left > 1) {
			nums.push(1);
			if (left > 2) nums.push("...");
		}
		for (let i = left; i <= right; i++) nums.push(i);
		if (right < totalPages) {
			if (right < totalPages - 1) nums.push("...");
			nums.push(totalPages);
		}
		return nums;
	}, [safePage, totalPages]);

	useEffect(() => {
		setPage(1);
	}, [search, status, ready, tagId, contextId, assignee, archived, pageSize]);

	const selected =
		todos.find((t) => t.id === selectedId) || rows[0] || todos[0];
	const selectedChildren = selected ? childMap[selected.id] || [] : [];
	const selectedParent = selected?.parentId
		? todos.find((t) => t.id === selected.parentId)
		: undefined;
	const selectedCtx = selected
		? todoContexts.find(
				(c) => c.id === (selected.contextId ?? selectedParent?.contextId),
			)
		: undefined;
	const selectedTags = selected
		? todoTags.filter((tag) => selected.tagIds.includes(tag.id))
		: [];
	const isLeaf = selected ? (childMap[selected.id] || []).length === 0 : false;
	const canClaim =
		!!selected &&
		isLeaf &&
		selected.status === "todo" &&
		selected.ready === true &&
		!selected.assignee &&
		!selected.archived &&
		!selectedCtx?.archived;

	return (
		<>
			<PageTitle
				title="Todo 协作"
				desc="两层 Todo、ready 叶子领取、VCP report、用户终判。"
				actions={
					<>
						<input
							className="wide-input"
							placeholder="搜索 Todo / Context…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<Button tone="primary">+ 新建 Todo</Button>
					</>
				}
			/>
			<div className="collab-filters">
				<select
					className="select-sm"
					value={status}
					onChange={(e) => setStatus(e.target.value)}
				>
					<option value="">状态（全部）</option>
					{Object.entries(todoStatusText).map(([k, v]) => (
						<option key={k} value={k}>
							{v}
						</option>
					))}
				</select>
				<select
					className="select-sm"
					value={ready}
					onChange={(e) => setReady(e.target.value)}
				>
					<option value="">ready（全部）</option>
					<option value="true">ready=true</option>
					<option value="false">ready=false</option>
				</select>
				<select
					className="select-sm"
					value={tagId}
					onChange={(e) => setTagId(e.target.value)}
				>
					<option value="">Tag（全部）</option>
					{todoTags.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</select>
				<select
					className="select-sm"
					value={contextId}
					onChange={(e) => setContextId(e.target.value)}
				>
					<option value="">Context（全部）</option>
					{todoContexts.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
				<select
					className="select-sm"
					value={assignee}
					onChange={(e) => setAssignee(e.target.value)}
				>
					<option value="">领取人（全部）</option>
					<option value="unassigned">未分配</option>
					<option value="vcp">VCP</option>
					<option value="me">我</option>
				</select>
				<select
					className="select-sm"
					value={archived}
					onChange={(e) => setArchived(e.target.value)}
				>
					<option value="active">未归档</option>
					<option value="archived">已归档</option>
					<option value="all">全部</option>
				</select>
			</div>
			<div className="collab-layout">
				<Panel
					title="Todo 队列"
					action={
						<span>
							{rows.length} 条 · 每页 {pageSize}
						</span>
					}
				>
					<div className="todo-list">
						{rows.length === 0 && <EmptyState text="没有匹配的 Todo" />}
						{pageRows.map((todo) => {
							const children = childMap[todo.id] || [];
							const parent = todo.parentId
								? todos.find((t) => t.id === todo.parentId)
								: undefined;
							const leaf = children.length === 0;
							return (
								<button
									key={todo.id}
									className={`todo-row ${selected?.id === todo.id ? "active" : ""}`}
									onClick={() => setSelectedId(todo.id)}
								>
									<div className="todo-row-main">
										<strong>{todo.title}</strong>
										<small>
											{parent
												? `子任务 · 父：${parent.title}`
												: leaf
													? "顶层 leaf"
													: `父容器 · ${children.length} 个子任务`}{" "}
											· P{todo.priority} · {todo.due || "无截止"}
										</small>
									</div>
									<div className="todo-row-meta">
										<TodoStatusBadge status={todo.status} />
										<Badge tone={todo.ready ? "green" : "gray"}>
											{todo.ready ? "ready" : "not ready"}
										</Badge>
										<Badge tone={todo.assignee ? "cyan" : "gray"}>
											{assigneeLabel(todo.assignee)}
										</Badge>
										<TodoContextBadge todo={todo} />
									</div>
								</button>
							);
						})}
					</div>
					<div className="pager">
						<div className="pager-info">
							{rows.length > 0 ? (
								<>
									第 {startIdx + 1}–{Math.min(startIdx + pageSize, rows.length)}{" "}
									条 / 共 {rows.length} 条
								</>
							) : (
								"共 0 条"
							)}
						</div>
						<div className="pager-controls">
							<label className="pager-size">
								每页
								<select
									value={pageSize}
									onChange={(e) => setPageSize(Number(e.target.value))}
								>
									<option value={20}>20</option>
									<option value={50}>50</option>
									<option value={100}>100</option>
								</select>
							</label>
							<button
								className="btn btn-sm"
								disabled={safePage <= 1}
								onClick={() => setPage(safePage - 1)}
							>
								‹ 上一页
							</button>
							{pageNumbers.map((n, i) =>
								n === "..." ? (
									<span key={`gap-${i}`} className="pager-gap">
										…
									</span>
								) : (
									<button
										key={n}
										className={`btn btn-sm ${n === safePage ? "btn-primary" : ""}`}
										onClick={() => setPage(n)}
									>
										{n}
									</button>
								),
							)}
							<button
								className="btn btn-sm"
								disabled={safePage >= totalPages}
								onClick={() => setPage(safePage + 1)}
							>
								下一页 ›
							</button>
						</div>
					</div>
				</Panel>
				<Panel
					title={selected?.title || "Todo 详情"}
					action={selected && <TodoStatusBadge status={selected.status} />}
				>
					{!selected ? (
						<EmptyState text="选择左侧 Todo 查看详情" />
					) : (
						<div className="todo-detail">
							<div className="tag-row">
								{selectedTags.map((t) => (
									<Badge key={t.id} tone={t.archived ? "red" : "blue"}>
										{t.name}
									</Badge>
								))}
								<TodoContextBadge todo={selected} />
								<Badge tone={isLeaf ? "green" : "gray"}>
									{isLeaf ? "leaf 可领取" : "父容器不可领取"}
								</Badge>
							</div>
							<InfoRows
								rows={[
									[
										"父 Todo",
										selectedParent?.title ||
											(isLeaf ? "无（顶层 leaf）" : "无（顶层容器）"),
									],
									["Assignee", assigneeLabel(selected.assignee)],
									[
										"Ready",
										selected.status === "todo"
											? String(selected.ready === true)
											: `${String(selected.ready === true)}（冻结）`,
									],
									[
										"Due / Priority",
										`${selected.due || "无"} / P${selected.priority}`,
									],
									[
										"Context 状态",
										selectedCtx?.archived
											? "已归档：不可 claim"
											: selectedCtx?.name || "无",
									],
								]}
							/>
							<div className="markdown-box">{selected.description}</div>
							{selectedChildren.length > 0 && (
								<div>
									<small className="hint-text">子任务进度</small>
									<div className="subtask-grid">
										{selectedChildren.map((c) => (
											<span key={c.id}>
												<TodoStatusBadge status={c.status} /> {c.title}
											</span>
										))}
									</div>
								</div>
							)}
							<Panel title="VCP 回写 / 证据" className="inner-panel">
								<p>{selected.resultSummary || "暂无 resultSummary。"}</p>
								<div className="tag-row">
									{selected.taskIds.map((id) => (
										<Button
											key={id}
											size="sm"
											onClick={() => nav({ page: "task-detail", taskId: id })}
										>
											{id}
										</Button>
									))}
									{selected.taskIds.length === 0 && (
										<Badge tone="gray">无 linked tasks</Badge>
									)}
								</div>
							</Panel>
							<Panel title="审计摘要" className="inner-panel">
								<ul className="compact-list">
									{selected.audit.map((a) => (
										<li key={a}>{a}</li>
									))}
								</ul>
							</Panel>
							<div className="button-row">
								<Button tone={canClaim ? "primary" : "ghost"}>Claim</Button>
								<Button
									tone={selected.status === "doing" ? "primary" : "ghost"}
								>
									Report done/failed
								</Button>
								<Button
									tone={
										selected.status === "awaiting_confirmation"
											? "warning"
											: "ghost"
									}
								>
									Confirm
								</Button>
								<Button tone="danger">Archive</Button>
							</div>
							{!canClaim && (
								<p className="hint-text">
									Claim
									禁用条件：必须是未归档、status=todo、ready=true、未分配、Context
									未归档的叶子 Todo。
								</p>
							)}
						</div>
					)}
				</Panel>
			</div>
		</>
	);
}

export function ContextsPage() {
	const [selectedId, setSelectedId] = useState(todoContexts[0]?.id || "");
	const [search, setSearch] = useState("");
	const [archived, setArchived] = useState("active");
	const selected =
		todoContexts.find((c) => c.id === selectedId) || todoContexts[0];
	const filtered = todoContexts.filter((c) => {
		const q = search.trim().toLowerCase();
		return (
			(!q || `${c.name} ${c.markdown}`.toLowerCase().includes(q)) &&
			(archived === "all" ||
				(archived === "archived" ? c.archived : !c.archived))
		);
	});
	const refs = selected ? todos.filter((t) => t.contextId === selected.id) : [];
	return (
		<>
			<PageTitle
				title="Context 管理"
				desc="给 VCP / Agent 读取的执行信息包；机器结构化绑定，说明写 Markdown。"
				actions={
					<>
						<input
							className="wide-input"
							placeholder="搜索 Context…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<select
							className="select-sm"
							value={archived}
							onChange={(e) => setArchived(e.target.value)}
						>
							<option value="active">未归档</option>
							<option value="archived">已归档</option>
							<option value="all">全部</option>
						</select>
						<Button tone="primary">+ 新建 Context</Button>
					</>
				}
			/>
			<div className="collab-layout contexts-layout">
				<Panel title="Context 列表" action={<span>{filtered.length} 个</span>}>
					<div className="context-list">
						{filtered.map((c) => (
							<button
								key={c.id}
								className={`context-row ${selected?.id === c.id ? "active" : ""}`}
								onClick={() => setSelectedId(c.id)}
							>
								<strong>{c.name}</strong>
								<small>
									{c.machineIds.length || "可空"} 台机器 · {c.todoCount} 个 Todo
									· {c.updatedAt}
								</small>
								{c.archived && <Badge tone="red">archived</Badge>}
							</button>
						))}
						{filtered.length === 0 && <EmptyState text="没有匹配的 Context" />}
					</div>
				</Panel>
				<Panel
					title={selected?.name || "Context 详情"}
					action={
						selected?.archived ? (
							<Badge tone="red">已归档</Badge>
						) : (
							<Badge tone="green">可用于新 Todo</Badge>
						)
					}
				>
					{!selected ? (
						<EmptyState text="选择左侧 Context 查看详情" />
					) : (
						<div className="context-editor">
							<div className="form-row">
								<Field label="名称" value={selected.name} />
								<label className="field">
									<span>机器</span>
									<div className="tag-row">
										{selected.machineIds.length ? (
											selected.machineIds.map((id) => (
												<Badge key={id} tone="cyan">
													{id}
												</Badge>
											))
										) : (
											<Badge tone="gray">未绑定机器</Badge>
										)}
									</div>
								</label>
							</div>
							<div className="context-markdown-grid">
								<Field label="Markdown" value={selected.markdown} textarea />
								<label className="field">
									<span>Preview（原型轻量预览）</span>
									<pre className="markdown-preview">{selected.markdown}</pre>
								</label>
							</div>
							<Panel title="引用 Todo" className="inner-panel">
								<div className="subtask-grid">
									{refs.map((t) => (
										<span key={t.id}>
											<TodoStatusBadge status={t.status} /> {t.title}
										</span>
									))}
									{refs.length === 0 && <Badge tone="gray">暂无引用</Badge>}
								</div>
							</Panel>
							<div className="button-row">
								<Button tone="primary">保存</Button>
								<Button tone={selected.archived ? "primary" : "danger"}>
									{selected.archived ? "恢复" : "归档"}
								</Button>
							</div>
							<p className="hint-text">
								Context markdown 不做模板渲染；归档后历史 Todo 可见，新 Todo
								不可选择。
							</p>
						</div>
					)}
				</Panel>
			</div>
		</>
	);
}

export function TasksListPage({ nav }: { nav: (r: Route) => void }) {
	const [typeFilter, setTypeFilter] = useState<string>("");
	const allRows = useMemo(() => {
		const regular = tasks.map((t) => ({
			id: t.id,
			type: t.type,
			content: `${t.type} 任务`,
			target: t.target,
			status: t.status,
			risk: t.risk,
			time: t.time,
			dur: t.dur,
			navTarget: { page: "task-detail", taskId: t.id } as Route,
		}));
		const piBatch = piRunTasks.map((t) => ({
			id: t.id,
			type: "pi_batch",
			content: t.goal,
			target: "—",
			status: piStatusMap[t.status] || "待确认",
			risk: undefined as RiskLevel | undefined,
			time: t.startedAt,
			dur: t.durationSec > 0 ? `${t.durationSec}s` : "—",
			navTarget: { page: "task-detail", taskId: t.id } as Route,
		}));
		return [...regular, ...piBatch];
	}, []);
	const filtered = allRows.filter((r) => !typeFilter || r.type === typeFilter);
	return (
		<>
			<PageTitle
				title="任务"
				actions={
					<>
						<select
							className="select-sm"
							value={typeFilter}
							onChange={(e) => setTypeFilter(e.target.value)}
						>
							<option value="">类型（全部）</option>
							<option value="command">命令</option>
							<option value="file">文件</option>
							<option value="install">安装</option>
							<option value="pi.run">Pi 批处理</option>
							<option value="browser.run">Browser Use</option>
							<option value="computer.run">Computer Use</option>
							<option value="pi_batch">Pi 批处理</option>
						</select>
						<Button size="sm">状态 ▾</Button>
						<Button size="sm">机器 ▾</Button>
						<Button size="sm" tone="primary">
							+ 发起任务
						</Button>
					</>
				}
			/>
			<Panel>
				<table className="data-table">
					<thead>
						<tr>
							<th>任务 ID</th>
							<th>类型</th>
							<th>内容 / Goal</th>
							<th>机器</th>
							<th>状态</th>
							<th>风险</th>
							<th>创建</th>
							<th>耗时</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((r) => (
							<UnifiedTaskRow
								key={r.id}
								{...r}
								onClick={() => nav(r.navTarget)}
							/>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

function AutomationReportPanel({
	report,
}: {
	report: (typeof automationReports)[number];
}) {
	return (
		<Panel
			title="自动化报告"
			action={
				<>
					<Badge
						tone={
							report.kind === "browser"
								? "cyan"
								: report.kind === "computer"
									? "purple"
									: "blue"
						}
					>
						{report.kind}
					</Badge>
					<Badge tone={report.outcome === "success" ? "green" : "orange"}>
						{report.outcome === "success" ? "成功" : "需要复核"}
					</Badge>
				</>
			}
		>
			<div className="automation-report-grid">
				<div>
					<h4>{report.summary}</h4>
					<InfoRows
						rows={[
							["置信度", report.confidence],
							["Macro", report.macro || "未使用"],
							[
								"Fallback",
								report.fallbacks.length ? report.fallbacks.join(" / ") : "无",
							],
						]}
					/>
				</div>
				<div>
					<small className="hint-text">证据</small>
					<ul className="compact-list">
						{report.evidence.map((e) => (
							<li key={e}>✓ {e}</li>
						))}
					</ul>
					<small className="hint-text">产物</small>
					<ul className="compact-list">
						{report.artifacts.map((a) => (
							<li key={a} className="mono">
								{a}
							</li>
						))}
					</ul>
				</div>
			</div>
			<table className="data-table compact">
				<thead>
					<tr>
						<th>引擎</th>
						<th>动作</th>
						<th>目标</th>
						<th>结果</th>
					</tr>
				</thead>
				<tbody>
					{report.steps.map((s, i) => (
						<tr key={i}>
							<td>{s.engine}</td>
							<td>{s.action}</td>
							<td>{s.target}</td>
							<td>{s.result}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Panel>
	);
}

// ============ 任务详情 ============
// 审批面板：审批中心和任务详情共用
function ApprovalPanel({
	t,
	onResolved,
}: {
	t: Task;
	onResolved?: (action: "approved" | "rejected") => void;
}) {
	const a = t.approval!;
	return (
		<div className="approval-panel">
			<div className="approval-head">
				<strong>⚠ 审批请求</strong>
				<Badge tone={a.source === "runbook_gate" ? "purple" : "cyan"}>
					{a.source === "runbook_gate" ? "编排流确认门" : "命令选项级确认"}
				</Badge>
				{a.runbookName && <Badge tone="blue">来自 {a.runbookName}</Badge>}
			</div>
			<div className="approval-message">{a.message}</div>
			{a.nodeName && (
				<small className="hint-text" style={{ display: "block", marginTop: 6 }}>
					触发点：{a.nodeName} @ {t.target}
				</small>
			)}
			<div className="approval-ctx">
				<div>
					<small className="hint-text">已完成步骤</small>
					<ul className="approval-steps done">
						{a.doneSteps.map((s, i) => (
							<li key={i}>✓ {s}</li>
						))}
					</ul>
				</div>
				<div>
					<small className="hint-text">确认后将执行</small>
					<ul className="approval-steps next">
						{a.nextSteps.map((s, i) => (
							<li key={i}>→ {s}</li>
						))}
					</ul>
				</div>
			</div>
			<div className="approval-actions">
				<Button tone="primary" onClick={() => onResolved?.("approved")}>
					✓ 确认执行
				</Button>
				<Button tone="danger" onClick={() => onResolved?.("rejected")}>
					✕ 拒绝（中止流）
				</Button>
			</div>
		</div>
	);
}

export function TaskDetailPage({
	taskId,
	nav,
}: {
	taskId: string;
	nav: (r: Route) => void;
}) {
	const t = tasks.find((x) => x.id === taskId) || tasks[0];
	const automationReport = automationReports.find((r) => r.taskId === t.id);
	return (
		<>
			<div className="task-head">
				<div>
					<h2>{t.id}</h2>
					<small>
						{t.type} · {t.target} · {t.time}
					</small>
				</div>
				<div className="task-head-right">
					<StatusBadge status={t.status} />
					<Button size="sm">⋮ 取消/重试/转终端</Button>
				</div>
			</div>
			{t.status === "待确认" && t.approval && (
				<Panel title="人工审批">
					<ApprovalPanel t={t} onResolved={() => nav({ page: "approvals" })} />
				</Panel>
			)}
			{automationReport && <AutomationReportPanel report={automationReport} />}
			<div className="task-detail-layout">
				<Panel title="事件流（pi.run 回放）">
					<div className="pi-events">
						{piRunEvents.map((e, i) => (
							<div className="pi-event" key={i}>
								<span className="pi-time">{e.time}</span>
								<span className={`pi-icon ${e.tone}`}>{e.icon}</span>
								<div>
									<strong>{e.title}</strong>
									{e.detail && <p>{e.detail}</p>}
								</div>
							</div>
						))}
					</div>
				</Panel>
				<aside className="side-stack">
					<Panel title="审计关联">
						<InfoRows
							rows={[
								["aud_203", "10:03 命中确认门 已通过"],
								["aud_204", "10:04 file_edit a.ts"],
							]}
						/>
						<Button size="sm">查看审计详情</Button>
					</Panel>
					<Panel title="session_stats">
						<InfoRows
							rows={[
								["token", "840"],
								["cost", "$0.04"],
							]}
						/>
					</Panel>
				</aside>
			</div>
		</>
	);
}

// ============ 发布中心 ============
export function ReleasesPage() {
	return (
		<>
			<PageTitle
				title="发布中心"
				actions={
					<>
						<Button>上传 manifest</Button>
						<Button>上传 artifact</Button>
					</>
				}
			/>
			<div className="release-layout">
				<Panel title="版本列表">
					<table className="data-table">
						<thead>
							<tr>
								<th>版本</th>
								<th>类型</th>
								<th>状态</th>
								<th>发布时间</th>
							</tr>
						</thead>
						<tbody>
							{releases.map((r) => (
								<tr
									key={r.version}
									className={r.version === "v1.2.0" ? "selected" : ""}
								>
									<td>
										<strong>{r.version}</strong>
									</td>
									<td>{r.type}</td>
									<td>
										<StatusBadge status={r.status} />
									</td>
									<td>{r.time}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Panel>
				<Panel title="v1.2.0 · client · 已发布">
					<InfoRows
						rows={[
							["manifest", "sha256 …"],
							["artifacts", "3"],
						]}
					/>
					<div className="form-row">
						<Field label="目标机器" value="✓win-dev-01 ✓linux-db-02" />
						<Field label="按标签" value="dev prod" />
					</div>
					<div className="slider-row">
						<span>灰度比例</span>
						<div className="slider">
							<i style={{ width: "50%" }} />
							<span>50%</span>
						</div>
					</div>
					<div className="rollout-progress">
						<strong>滚动进度</strong>
						<div className="rollout-steps">
							{["发布", "分发", "下载", "安装", "验证", "完成"].map((s, i) => (
								<div
									key={s}
									className={`rollout-step ${i < 3 ? "done" : i === 3 ? "active" : ""}`}
								>
									<span className="rs-dot">●</span>
									<small>{s}</small>
									<em>{i < 2 ? "2/2" : i === 2 ? "1/2" : "0/2"}</em>
								</div>
							))}
						</div>
					</div>
					<div className="button-row">
						<Button tone="primary">开始发布</Button>
						<Button tone="danger">⚠ 回滚</Button>
					</div>
				</Panel>
			</div>
		</>
	);
}

// ============ 安装中心 ============
export function InstallPage() {
	return (
		<>
			<PageTitle title="安装中心" />
			<div className="install-layout">
				<div>
					<div className="two-col">
						<Panel title="创建安装令牌">
							<Field label="OS" value="Windows" />
							<ToggleRow
								title="启用 Pi Agent"
								desc="安装的 Client 具备 Pi 能力"
								on
							/>
							<Field label="标签" value="dev" />
							<div className="form-row">
								<Field label="过期时间" value="24h" />
								<Field label="最大次数" value="10" />
							</div>
							<Button tone="primary">创建令牌</Button>
						</Panel>
						<Panel title="安装命令">
							<div className="tab-toggle">
								<button className="active">PowerShell</button>
								<button>Bash</button>
							</div>
							<pre className="code-preview mono">{`irm https://gw.example.com/i.ps1 \n  -Token AGT-7f9d8c3b`}</pre>
							<Button size="sm">复制</Button>
							<InfoRows
								rows={[
									["有效期", "24h"],
									["已用", "2 / 10"],
								]}
							/>
						</Panel>
					</div>
					<Panel title="令牌列表">
						<table className="data-table">
							<thead>
								<tr>
									<th>令牌</th>
									<th>OS</th>
									<th>已用/上限</th>
									<th>过期</th>
									<th>状态</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{installTokens.map((t) => (
									<tr key={t.name}>
										<td>{t.name}</td>
										<td>{t.os}</td>
										<td>{t.usage}</td>
										<td>{t.expire}</td>
										<td>
											<StatusBadge status={t.status} />
										</td>
										<td>
											<Button size="sm">吊销</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</Panel>
				</div>
				<aside className="side-stack">
					<Panel title="安装审计">
						<InfoRows
							rows={[
								["win-dev-01", "成功 10:00"],
								["mac-air", "失败 09:30"],
							]}
						/>
					</Panel>
				</aside>
			</div>
		</>
	);
}

// ============ 云盘 ============
function formatBytes(n: number): string {
	if (n < 1024) return n + " B";
	if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
	if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
	return (n / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function TransferStatusBadge({ status }: { status: TransferStatus }) {
	const map: Record<
		TransferStatus,
		{ tone: "blue" | "green" | "red" | "orange" | "gray"; label: string }
	> = {
		created: { tone: "gray", label: "已创建" },
		waiting_cli_upload: { tone: "orange", label: "等待上传" },
		cli_uploading: { tone: "blue", label: "上传中" },
		aliyun_uploaded: { tone: "blue", label: "已上传" },
		waiting_client_download: { tone: "orange", label: "等待下载" },
		client_downloading: { tone: "blue", label: "下载中" },
		completed: { tone: "green", label: "已完成" },
		failed: { tone: "red", label: "失败" },
		cancelled: { tone: "gray", label: "已取消" },
	};
	const { tone, label } = map[status] || { tone: "gray", label: status };
	return <Badge tone={tone}>{label}</Badge>;
}

export function StoragePage() {
	const status = aliyunDriveStatus;
	const jobs = transferJobs;
	const activeCount = jobs.filter(
		(j) => !["completed", "failed", "cancelled"].includes(j.status),
	).length;
	const completedCount = jobs.filter((j) => j.status === "completed").length;
	const failedCount = jobs.filter((j) => j.status === "failed").length;
	const expiresText = status.expiresAt
		? new Date(status.expiresAt).toLocaleString("zh-CN", {
				month: "numeric",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—";

	return (
		<>
			<PageTitle
				title="云盘（阿里云盘）"
				actions={
					status.authorized ? (
						<>
							<Button>测试授权</Button>
							<Button tone="danger">撤销授权</Button>
						</>
					) : (
						<Button tone="primary">开始授权</Button>
					)
				}
			/>
			<div className="storage-top">
				<Panel title="认证状态">
					{!status.configured ? (
						<EmptyState
							icon="☁️"
							text="未配置阿里云盘"
							sub="请在设置页面配置 clientId / clientSecret"
						/>
					) : status.authorizationState === "authorized" ? (
						<InfoRows
							rows={[
								["状态", "✓ 已授权"],
								["授权账号", status.authorizedAccountName || "—"],
								["Drive ID", status.driveId || "—"],
								["Token 过期", expiresText],
								["中转目录", status.transferFolder || "—"],
								[
									"清理策略",
									status.cleanupTtlMs
										? `${status.cleanupTtlMs / 3600000} 小时后删除`
										: "—",
								],
							]}
						/>
					) : status.authorizationState === "expired" ? (
						<div className="auth-expired">
							<p className="warn-text">⚠ 授权已过期</p>
							<Button tone="primary">重新授权</Button>
						</div>
					) : (
						<div className="auth-missing">
							<p className="muted-text">尚未授权阿里云盘</p>
							<Button tone="primary">开始授权</Button>
						</div>
					)}
				</Panel>
				<Panel title="传输概览">
					<div className="storage-stats">
						<div className="stat-card">
							<span className="stat-value">{activeCount}</span>
							<span className="stat-label">进行中</span>
						</div>
						<div className="stat-card">
							<span className="stat-value">{completedCount}</span>
							<span className="stat-label">已完成</span>
						</div>
						<div className="stat-card">
							<span className="stat-value">{failedCount}</span>
							<span className="stat-label">失败</span>
						</div>
					</div>
				</Panel>
			</div>
			<Panel title="传输任务">
				<table className="data-table">
					<thead>
						<tr>
							<th>任务ID</th>
							<th>文件名</th>
							<th>方向</th>
							<th>目标机器</th>
							<th>模式</th>
							<th>状态</th>
							<th>进度</th>
							<th>大小</th>
							<th>创建时间</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{jobs.map((job) => {
							const progress =
								job.direction === "import"
									? job.downloadedBytes
									: job.uploadedBytes;
							const pct =
								job.totalBytes > 0
									? Math.round((progress / job.totalBytes) * 100)
									: 0;
							const isActive = !["completed", "failed", "cancelled"].includes(
								job.status,
							);
							return (
								<tr key={job.id}>
									<td>
										<code>{job.id}</code>
									</td>
									<td>{job.filename}</td>
									<td>{job.direction === "import" ? "↓ 导入" : "↑ 导出"}</td>
									<td>{job.clientHost}</td>
									<td>{job.mode === "aliyundrive" ? "阿里云盘" : "FRP直传"}</td>
									<td>
										<TransferStatusBadge status={job.status} />
									</td>
									<td>
										<div className="progress-cell">
											<div className="progress-bar">
												<div
													className="progress-fill"
													style={{ width: pct + "%" }}
												/>
											</div>
											<span className="progress-text">{pct}%</span>
										</div>
									</td>
									<td>{formatBytes(job.size)}</td>
									<td>
										{new Date(job.createdAt).toLocaleString("zh-CN", {
											month: "numeric",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</td>
									<td>
										{isActive && (
											<Button size="sm" tone="danger">
												取消
											</Button>
										)}
										{job.status === "completed" &&
											job.direction === "export" && (
												<Button size="sm">下载</Button>
											)}
										{job.status === "failed" && <Button size="sm">重试</Button>}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

// ============ 审计日志 ============
export function AuditPage() {
	return (
		<>
			<PageTitle
				title="审计日志"
				actions={
					<>
						<Button size="sm">高级筛选 ▾</Button>
						<Button size="sm">时间 ▾</Button>
						<Button size="sm">来源 ▾</Button>
						<Button size="sm">风险 ▾</Button>
						<Button size="sm">导出</Button>
					</>
				}
			/>
			<Panel>
				<table className="data-table">
					<thead>
						<tr>
							<th>时间</th>
							<th>来源</th>
							<th>操作</th>
							<th>目标</th>
							<th>风险</th>
							<th>结果</th>
						</tr>
					</thead>
					<tbody>
						{auditRows.concat(auditRows).map((r, i) => (
							<tr key={i}>
								<td>{r.time}</td>
								<td>
									<Badge>{r.source}</Badge>
								</td>
								<td>{r.action}</td>
								<td>{r.object}</td>
								<td>
									<RiskBadge risk={r.risk} />
								</td>
								<td>
									<Badge tone={r.result === "通过" ? "green" : "orange"}>
										{r.result}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<Pagination total="156" />
			</Panel>
		</>
	);
}

// ============ Pi Provider Profile 管理 ============
function PiProviderProfilePanel() {
	const [selectedId, setSelectedId] = useState<string>(
		providerProfiles[0]?.id || "",
	);
	const selected = providerProfiles.find((p) => p.id === selectedId);
	return (
		<div className="profile-split">
			<Panel
				title="Provider Profile"
				action={
					<Button size="sm" tone="primary">
						+ 新建 Profile
					</Button>
				}
				className="profile-list-panel"
			>
				<div className="hint-text">
					全局 Profile 对所有机器可见，机器级覆盖在机器详情配置 Tab 中管理。
				</div>
				<table className="data-table">
					<thead>
						<tr>
							<th>名称</th>
							<th>消息类型</th>
							<th>模型</th>
							<th>默认</th>
						</tr>
					</thead>
					<tbody>
						{providerProfiles.map((p) => (
							<tr
								key={p.id}
								className={selectedId === p.id ? "selected" : ""}
								onClick={() => setSelectedId(p.id)}
							>
								<td>
									<strong>{p.name}</strong>
									{p.scope === "machine" && <Badge tone="purple">机器级</Badge>}
								</td>
								<td>
									<Badge tone="cyan">{apiTypeLabels[p.apiType]}</Badge>
								</td>
								<td>{p.models.length} 个</td>
								<td>{p.isDefault ? <Badge tone="green">默认</Badge> : "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
			{selected && (
				<Panel
					title={`编辑 Profile: ${selected.name}`}
					action={
						<div className="button-row">
							<Button size="sm">删除</Button>
							<Button size="sm" tone="primary">
								保存 Profile
							</Button>
						</div>
					}
					className="profile-edit-panel"
				>
					<div className="profile-edit-form">
						<div className="form-row">
							<Field label="名称" value={selected.name} />
							<Field label="Provider Key" value={selected.providerKey} />
						</div>
						<div className="form-row">
							<label className="field">
								<span>消息类型</span>
								<select
									className="select-input"
									defaultValue={selected.apiType}
								>
									<option value="openai-completions">OpenAI Completions</option>
									<option value="openai-responses">OpenAI Responses</option>
									<option value="anthropic-messages">Anthropic Messages</option>
									<option value="google-generative-ai">
										Google Generative AI
									</option>
								</select>
							</label>
							<Field
								label="Base URL"
								value={selected.baseUrl || "（留空使用内置默认）"}
							/>
						</div>
						<div className="policy-section">
							<h4>API Key</h4>
							<div className="key-source-row">
								<label className="radio-row">
									<input
										type="radio"
										name="key-source"
										defaultChecked={selected.keySource === "encrypted"}
									/>
									<span>加密存储</span>
								</label>
								<label className="radio-row">
									<input
										type="radio"
										name="key-source"
										defaultChecked={selected.keySource === "env"}
									/>
									<span>引用环境变量</span>
								</label>
								<label className="radio-row">
									<input
										type="radio"
										name="key-source"
										defaultChecked={selected.keySource === "none"}
									/>
									<span>不需要 Key</span>
								</label>
							</div>
							{selected.keySource === "encrypted" && (
								<div className="form-row">
									<label className="field">
										<span>API Key</span>
										<input
											type="password"
											value={selected.apiKeyPreview}
											readOnly
										/>
									</label>
									<Button size="sm">👁 查看</Button>
								</div>
							)}
							{selected.keySource === "env" && (
								<div className="form-row">
									<Field
										label="环境变量引用"
										value={selected.apiKeyEnvRef || "$MY_API_KEY"}
									/>
								</div>
							)}
						</div>
						<div className="policy-section">
							<h4>模型清单</h4>
							<table className="data-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>名称</th>
										<th>推理</th>
										<th>图片</th>
										<th>上下文窗口</th>
										<th>操作</th>
									</tr>
								</thead>
								<tbody>
									{selected.models.map((m) => (
										<tr key={m.id}>
											<td className="mono">{m.id}</td>
											<td>{m.name}</td>
											<td>{m.reasoning ? "✓" : "—"}</td>
											<td>{m.image ? "✓" : "—"}</td>
											<td>{m.contextWindow.toLocaleString()}</td>
											<td>
												<Button size="sm">删除</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<div className="button-row">
								<Button size="sm" tone="primary">
									+ 添加模型
								</Button>
							</div>
						</div>
						<div className="form-row">
							<label className="toggle-row">
								<div>
									<strong>设为默认 Profile</strong>
									<small>该 scope 下的默认 Provider Profile</small>
								</div>
								<span className={`switch ${selected.isDefault ? "on" : ""}`} />
							</label>
						</div>
					</div>
				</Panel>
			)}
		</div>
	);
}

// ============ 设置 ============
function AliyunDriveSettingsPanel() {
	const status = aliyunDriveStatus;
	return (
		<Panel
			title="阿里云盘配置"
			action={
				status.configured ? (
					<>
						<Button size="sm">编辑配置</Button>
						{status.authorized && <Button size="sm">测试授权</Button>}
						{status.authorized && (
							<Button size="sm" tone="danger">
								撤销授权
							</Button>
						)}
						{!status.authorized && (
							<Button size="sm" tone="primary">
								开始授权
							</Button>
						)}
					</>
				) : (
					<Button size="sm" tone="primary">
						保存配置
					</Button>
				)
			}
		>
			{!status.configured ? (
				<div className="aliyun-config-form">
					<div className="form-row">
						<label className="field-label">
							Client ID{" "}
							<input
								className="wide-input"
								placeholder="阿里云盘 OAuth App Client ID"
							/>
						</label>
						<label className="field-label">
							Client Secret{" "}
							<input
								className="wide-input"
								type="password"
								placeholder="为安全不回显已保存的 Secret"
							/>
						</label>
					</div>
					<div className="form-row">
						<label className="field-label">
							Scope{" "}
							<input
								className="wide-input"
								defaultValue="user:base,file:all:read,file:all:write"
							/>
						</label>
						<label className="field-label">
							OpenAPI Base{" "}
							<input
								className="wide-input"
								defaultValue="https://openapi.alipan.com"
							/>
						</label>
					</div>
					<div className="form-row">
						<label className="field-label">
							中转文件夹{" "}
							<input className="wide-input" defaultValue="NoesisTransfers" />
						</label>
						<label className="field-label">
							清理 TTL（小时）{" "}
							<input className="wide-input" defaultValue="24" />
						</label>
					</div>
					<p className="hint-text">保存后到「云盘」页面完成 OAuth 授权。</p>
				</div>
			) : (
				<div className="aliyun-config-form">
					<div className="info-block">
						<div className="info-row">
							<span>Client ID</span>
							<code>{status.clientId}</code>
						</div>
						<div className="info-row">
							<span>Scope</span>
							<code>{status.scope}</code>
						</div>
						<div className="info-row">
							<span>OpenAPI Base</span>
							<code>{status.openapiBase}</code>
						</div>
						<div className="info-row">
							<span>中转文件夹</span>
							<code>{status.transferFolder}</code>
						</div>
						<div className="info-row">
							<span>清理策略</span>
							<span>
								{status.cleanupTtlMs
									? `${status.cleanupTtlMs / 3600000} 小时后删除中转文件`
									: "—"}
							</span>
						</div>
					</div>
					{status.authorized && (
						<div className="info-block authorized">
							<div className="info-row">
								<span>状态</span>
								<Badge tone="green">✓ 已授权</Badge>
							</div>
							<div className="info-row">
								<span>授权账号</span>
								<span>{status.authorizedAccountName || "—"}</span>
							</div>
							<div className="info-row">
								<span>Drive ID</span>
								<code>{status.driveId || "—"}</code>
							</div>
							<div className="info-row">
								<span>Token 过期</span>
								<span>
									{status.expiresAt
										? new Date(status.expiresAt).toLocaleString("zh-CN")
										: "—"}
								</span>
							</div>
						</div>
					)}
					{status.authorizationState === "expired" && (
						<div className="info-block expired">
							<div className="info-row">
								<span>状态</span>
								<Badge tone="orange">⚠ 授权已过期</Badge>
							</div>
						</div>
					)}
					{status.authorizationState === "unauthorized" && (
						<div className="info-block unauthorized">
							<div className="info-row">
								<span>状态</span>
								<Badge tone="gray">尚未授权</Badge>
							</div>
						</div>
					)}
				</div>
			)}
		</Panel>
	);
}

export function SettingsPage() {
	const [settingsTab, setSettingsTab] = useState<string>("api-token");
	const tabs: Array<{ key: string; label: string }> = [
		{ key: "api-token", label: "API Token" },
		{ key: "pi-profile", label: "Pi Provider Profile" },
		{ key: "aliyundrive", label: "阿里云盘" },
		{ key: "retention", label: "保留策略" },
	];
	return (
		<>
			<PageTitle title="设置" />
			<div className="settings-tabs">
				{tabs.map((t) => (
					<button
						key={t.key}
						className={settingsTab === t.key ? "active" : ""}
						onClick={() => setSettingsTab(t.key)}
					>
						{t.label}
					</button>
				))}
			</div>
			<div className="settings-grid">
				{settingsTab === "api-token" && (
					<Panel
						title="API Token"
						action={
							<Button size="sm" tone="primary">
								+ 生成新 Token
							</Button>
						}
					>
						<table className="data-table">
							<thead>
								<tr>
									<th>名称</th>
									<th>前缀</th>
									<th>最后使用</th>
									<th>状态</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>pi-skill</td>
									<td>agw_••••</td>
									<td>3 分钟前</td>
									<td>
										<StatusBadge status="有效" />
									</td>
									<td>
										<Button size="sm">吊销</Button>
									</td>
								</tr>
								<tr>
									<td>ci-deploy</td>
									<td>agw_••••</td>
									<td>2 天前</td>
									<td>
										<StatusBadge status="有效" />
									</td>
									<td>
										<Button size="sm">吊销</Button>
									</td>
								</tr>
							</tbody>
						</table>
					</Panel>
				)}
				{settingsTab === "pi-profile" && <PiProviderProfilePanel />}
				{settingsTab === "aliyundrive" && <AliyunDriveSettingsPanel />}
				{settingsTab === "retention" && (
					<Panel title="保留策略">
						<div className="form-row">
							<Field label="任务事件保留天数" value="30" />
							<Field label="审计归档天数" value="365" />
						</div>
						<div className="form-row">
							<Field label="Pi 会话本地最大数量" value="50" />
							<Field label="Pi 会话本地最大 MB" value="512" />
						</div>
					</Panel>
				)}
			</div>
		</>
	);
}

// ============ Runbook 库（TS 即 DSL 的流程编排）============
// 编排脚本是 TS，import 能力函数组织跨机器流程。代码是源头，trace 是观测。

function ParamField({ p }: { p: RunbookParam }) {
	return (
		<label className="field">
			<span>
				{p.name}
				{p.required && <em className="req">*</em>}
				<small className="field-hint">
					{p.type}
					{p.hint ? ` · ${p.hint}` : ""}
				</small>
			</span>
			{p.type === "bool" ? (
				<select className="select-input" defaultValue={p.default || "false"}>
					<option value="true">true</option>
					<option value="false">false</option>
				</select>
			) : (
				<input
					className="wide-input"
					defaultValue={p.default || ""}
					placeholder={`${p.name}…`}
				/>
			)}
		</label>
	);
}

function RunbookRow({
	rb,
	active,
	onSelect,
}: {
	rb: Runbook;
	active: boolean;
	onSelect: () => void;
}) {
	const mids = runbookMachines(rb);
	const caps = runbookCapabilities(rb);
	const last = rb.lastExec;
	return (
		<button className={`rb-row ${active ? "active" : ""}`} onClick={onSelect}>
			<div className="rb-row-head">
				<strong>{rb.name}</strong>
				<Badge tone="blue">{mids.length} 台机器</Badge>
			</div>
			<small className="rb-row-desc">{rb.desc}</small>
			<div className="rb-row-meta">
				<span className="rb-os">
					{caps.map((c) => (
						<Badge key={c.cap} tone="gray">
							{c.cap} ×{c.count}
						</Badge>
					))}
				</span>
			</div>
			{last && (
				<div className="rb-row-exec">
					上次执行：
					<StatusBadge status={last.status} /> · {last.dur} · 调用{" "}
					{last.doneCalls}/{last.totalCalls}
				</div>
			)}
		</button>
	);
}

export function AutomationAssetsPage({ nav }: { nav: (r: Route) => void }) {
	return (
		<>
			<PageTitle
				title="自动化资产"
				actions={
					<>
						<Button>导入 Macro</Button>
						<Button tone="primary">新建 Runbook 导出</Button>
					</>
				}
			/>
			<div className="automation-kpi-grid">
				<div className="metric-card cyan">
					<div className="metric-icon">🌐</div>
					<div className="metric-content">
						<span>Browser Macro</span>
						<strong>
							{automationMacros.filter((m) => m.kind === "browser").length}
						</strong>
						<small>DOM/CDP 优先</small>
					</div>
				</div>
				<div className="metric-card purple">
					<div className="metric-icon">🖥</div>
					<div className="metric-content">
						<span>Computer Macro</span>
						<strong>
							{automationMacros.filter((m) => m.kind === "computer").length}
						</strong>
						<small>enikk sidecar</small>
					</div>
				</div>
				<div className="metric-card orange">
					<div className="metric-icon">◇</div>
					<div className="metric-content">
						<span>候选经验</span>
						<strong>{automationMacroCandidates.length}</strong>
						<small>需人工采纳</small>
					</div>
				</div>
				<div className="metric-card green">
					<div className="metric-icon">✓</div>
					<div className="metric-content">
						<span>成功报告</span>
						<strong>
							{automationReports.filter((r) => r.outcome === "success").length}
						</strong>
						<small>带 evidence</small>
					</div>
				</div>
			</div>
			<div className="automation-assets-layout">
				<Panel
					title="Automation Macro"
					action={<Badge tone="gray">JSON DSL</Badge>}
				>
					<table className="data-table compact">
						<thead>
							<tr>
								<th>名称</th>
								<th>类型</th>
								<th>版本</th>
								<th>适用范围</th>
								<th>成功率</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody>
							{automationMacros.map((m) => (
								<tr key={m.id}>
									<td>
										<strong>{m.name}</strong>
										<br />
										<small>{m.steps.join(" → ")}</small>
									</td>
									<td>
										<Badge tone={m.kind === "browser" ? "cyan" : "purple"}>
											{m.kind}
										</Badge>
									</td>
									<td>v{m.version}</td>
									<td>{m.scope}</td>
									<td>{m.successRate}</td>
									<td>
										<Button size="sm">导出 Runbook</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Panel>
				<Panel
					title="候选经验"
					action={<Badge tone="orange">人工确认后生效</Badge>}
				>
					<div className="candidate-list">
						{automationMacroCandidates.map((c) => (
							<div className="candidate-card" key={c.id}>
								<div>
									<strong>{c.name}</strong>
									<p>{c.reason}</p>
									<small>
										来自 {c.fromTask} · confidence {c.confidence}
									</small>
								</div>
								<div className="button-row">
									<Button size="sm" tone="primary">
										采纳
									</Button>
									<Button size="sm">拒绝</Button>
								</div>
							</div>
						))}
					</div>
				</Panel>
			</div>
			<Panel title="最近自动化报告">
				<table className="data-table compact">
					<thead>
						<tr>
							<th>任务</th>
							<th>机器</th>
							<th>类型</th>
							<th>结果</th>
							<th>摘要</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{automationReports.map((r) => (
							<tr key={r.taskId}>
								<td className="mono">{r.taskId}</td>
								<td>{r.machineId}</td>
								<td>{r.kind}</td>
								<td>
									<StatusBadge
										status={r.outcome === "success" ? "成功" : "需复核"}
									/>
								</td>
								<td>{r.summary}</td>
								<td>
									<Button
										size="sm"
										onClick={() =>
											nav({ page: "task-detail", taskId: r.taskId })
										}
									>
										查看报告
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</>
	);
}

export function RunbookLibraryPage({ nav }: { nav: (r: Route) => void }) {
	const [search, setSearch] = useState("");
	const [machineFilter, setMachineFilter] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [selectedId, setSelectedId] = useState<string>(runbooks[0]?.id || "");
	const [execOpen, setExecOpen] = useState(false);
	const detailRef = useRef<HTMLElement>(null);

	// 切换 Runbook 时把详情区滚到可见，避免代码块在视口下方看不见
	useEffect(() => {
		detailRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
	}, [selectedId]);

	const allMachines = useMemo(
		() =>
			Array.from(new Set(runbooks.flatMap((r) => runbookMachines(r)))).sort(),
		[],
	);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return runbooks.filter((r) => {
			const ms =
				!q ||
				r.name.toLowerCase().includes(q) ||
				r.desc.toLowerCase().includes(q);
			const mm = !machineFilter || runbookMachines(r).includes(machineFilter);
			return ms && mm;
		});
	}, [search, machineFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const safePage = Math.min(page, totalPages);
	const startIdx = (safePage - 1) * pageSize;
	const pageItems = filtered.slice(startIdx, startIdx + pageSize);

	useEffect(() => {
		setPage(1);
	}, [search, machineFilter, pageSize]);

	const pageNumbers = useMemo(() => {
		const max = 7;
		if (totalPages <= max)
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		const left = Math.max(1, safePage - 2);
		const right = Math.min(totalPages, safePage + 2);
		const nums: (number | "...")[] = [];
		if (left > 1) {
			nums.push(1);
			if (left > 2) nums.push("...");
		}
		for (let i = left; i <= right; i++) nums.push(i);
		if (right < totalPages) {
			if (right < totalPages - 1) nums.push("...");
			nums.push(totalPages);
		}
		return nums;
	}, [safePage, totalPages]);

	const rb = runbooks.find((r) => r.id === selectedId) || runbooks[0];
	const mids = rb ? runbookMachines(rb) : [];
	const caps = rb ? runbookCapabilities(rb) : [];

	return (
		<>
			<PageTitle
				title="Runbook 库"
				actions={
					<>
						<input
							className="wide-input"
							placeholder="搜索 Runbook…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<select
							className="select-sm"
							value={machineFilter}
							onChange={(e) => setMachineFilter(e.target.value)}
						>
							<option value="">机器（全部）</option>
							{allMachines.map((id) => (
								<option key={id} value={id}>
									{id}
								</option>
							))}
						</select>
						<Button tone="primary">+ 新建编排脚本</Button>
					</>
				}
			/>
			<div className="rb-layout">
				<aside className="rb-list">
					{pageItems.map((r) => (
						<RunbookRow
							key={r.id}
							rb={r}
							active={r.id === selectedId}
							onSelect={() => setSelectedId(r.id)}
						/>
					))}
					{pageItems.length === 0 && <EmptyState text="没有匹配的 Runbook" />}

					<div className="pager" style={{ marginTop: 12 }}>
						<div className="pager-info">
							{filtered.length > 0 ? (
								<>
									第 {startIdx + 1}–
									{Math.min(startIdx + pageSize, filtered.length)} 条 / 共{" "}
									{filtered.length} 条{(search || machineFilter) && " · 已筛选"}
								</>
							) : (
								"共 0 条"
							)}
						</div>
						<div className="pager-controls">
							<label className="pager-size">
								每页
								<select
									value={pageSize}
									onChange={(e) => setPageSize(Number(e.target.value))}
								>
									<option value={10}>10</option>
									<option value={20}>20</option>
									<option value={50}>50</option>
								</select>
							</label>
							<button
								className="btn btn-sm"
								disabled={safePage <= 1}
								onClick={() => setPage(safePage - 1)}
							>
								‹ 上一页
							</button>
							{pageNumbers.map((n, i) =>
								n === "..." ? (
									<span key={`gap-${i}`} className="pager-gap">
										…
									</span>
								) : (
									<button
										key={n}
										className={`btn btn-sm ${n === safePage ? "btn-primary" : ""}`}
										onClick={() => setPage(n)}
									>
										{n}
									</button>
								),
							)}
							<button
								className="btn btn-sm"
								disabled={safePage >= totalPages}
								onClick={() => setPage(safePage + 1)}
							>
								下一页 ›
							</button>
						</div>
					</div>
				</aside>

				<section className="rb-detail" ref={detailRef}>
					{!rb ? (
						<EmptyState text="选择左侧 Runbook 查看详情" />
					) : (
						<>
							<div className="rb-detail-head">
								<div>
									<h2>{rb.name}</h2>
									<small>{rb.desc}</small>
									<div className="tag-row" style={{ marginTop: 8 }}>
										<Badge tone="blue">{mids.length} 台机器</Badge>
										{caps.map((c) => (
											<Badge key={c.cap} tone="gray">
												{c.cap} ×{c.count}
											</Badge>
										))}
										{rb.dangerousOverride && (
											<Badge tone="red">覆盖危险拦截</Badge>
										)}
									</div>
								</div>
								<div className="button-row">
									<Button>编辑脚本</Button>
									<Button tone="primary" onClick={() => setExecOpen(true)}>
										▶ 下发执行
									</Button>
								</div>
							</div>

							<Panel
								title="编排脚本"
								action={
									<Badge tone="purple">TypeScript · import 能力函数</Badge>
								}
							>
								<pre className="rb-code">{rb.code}</pre>
							</Panel>

							<Panel title="执行历史">
								{rb.lastExec ? (
									<table className="data-table">
										<thead>
											<tr>
												<th>状态</th>
												<th>调用进度</th>
												<th>耗时</th>
												<th>时间</th>
												<th>操作</th>
											</tr>
										</thead>
										<tbody>
											<tr
												className="clickable"
												onClick={() => nav({ page: "tasks" })}
											>
												<td>
													<StatusBadge status={rb.lastExec.status} />
												</td>
												<td>
													{rb.lastExec.doneCalls}/{rb.lastExec.totalCalls}
												</td>
												<td>{rb.lastExec.dur}</td>
												<td>{rb.lastExec.at}</td>
												<td>
													<Button size="sm">查看任务</Button>
												</td>
											</tr>
										</tbody>
									</table>
								) : (
									<small className="hint-text">暂无执行记录</small>
								)}
							</Panel>
						</>
					)}
				</section>
			</div>

			{execOpen && rb && (
				<div className="frp-drawer-overlay" onClick={() => setExecOpen(false)}>
					<div className="frp-drawer" onClick={(e) => e.stopPropagation()}>
						<div className="frp-drawer-head">
							<strong>下发编排脚本：{rb.name}</strong>
							<button
								className="frp-drawer-close"
								onClick={() => setExecOpen(false)}
							>
								×
							</button>
						</div>
						<div className="frp-drawer-body">
							{rb.params.length > 0 && (
								<>
									<small
										className="hint-text"
										style={{ display: "block", marginBottom: 8 }}
									>
										流程参数（脚本里 {`{参数名}`} / 模板字符串引用）
									</small>
									<div className="rb-exec-params">
										{rb.params.map((p) => (
											<ParamField key={p.name} p={p} />
										))}
									</div>
								</>
							)}

							<div className="rb-warn neutral">
								ℹ 脚本将注入能力函数（cmd/pi/file/approve…）后执行。每次能力调用
								打到对应 {`@机器`}，受该机器 Pi 策略约束，并生成一个可观测
								Task。 approve() 会挂起等人工确认。
								{rb.dangerousOverride && " · 本流覆盖危险拦截。"}
							</div>
						</div>
						<div className="frp-drawer-actions">
							<Button onClick={() => setExecOpen(false)}>取消</Button>
							<Button
								tone="primary"
								onClick={() => {
									setExecOpen(false);
									nav({ page: "tasks" });
								}}
							>
								确认下发
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

// ============ 审批中心 ============
// 聚合所有待确认任务，一处处理 approve()/cmd({approve}) 产生的审批请求。
export function ApprovalsPage({
	nav: _nav,
	resolved,
	onResolve,
}: {
	nav: (r: Route) => void;
	resolved: Record<string, "approved" | "rejected">;
	onResolve: (id: string, action: "approved" | "rejected") => void;
}) {
	const [filter, setFilter] = useState<
		"all" | "runbook_gate" | "command_option"
	>("all");
	const [riskFilter, setRiskFilter] = useState<string>("");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const filtered = useMemo(
		() =>
			tasks.filter(
				(t) =>
					t.status === "待确认" &&
					t.approval &&
					!(t.id in resolved) &&
					(filter === "all" || t.approval!.source === filter) &&
					(!riskFilter || t.risk === riskFilter) &&
					(!search ||
						t.id.toLowerCase().includes(search.toLowerCase()) ||
						t.target.toLowerCase().includes(search.toLowerCase()) ||
						(t.approval!.runbookName || "")
							.toLowerCase()
							.includes(search.toLowerCase()) ||
						t.approval!.message.toLowerCase().includes(search.toLowerCase())),
			),
		[filter, riskFilter, search, resolved],
	);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const safePage = Math.min(page, totalPages);
	const startIdx = (safePage - 1) * pageSize;
	const pageItems = filtered.slice(startIdx, startIdx + pageSize);

	useEffect(() => {
		setPage(1);
	}, [filter, riskFilter, search, pageSize]);

	const pageNumbers = useMemo(() => {
		const max = 7;
		if (totalPages <= max)
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		const left = Math.max(1, safePage - 2);
		const right = Math.min(totalPages, safePage + 2);
		const nums: (number | "...")[] = [];
		if (left > 1) {
			nums.push(1);
			if (left > 2) nums.push("...");
		}
		for (let i = left; i <= right; i++) nums.push(i);
		if (right < totalPages) {
			if (right < totalPages - 1) nums.push("...");
			nums.push(totalPages);
		}
		return nums;
	}, [safePage, totalPages]);

	return (
		<>
			<PageTitle
				title="审批中心"
				actions={
					<>
						<input
							className="wide-input"
							placeholder="搜索任务/机器/Runbook/消息…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<select
							className="select-sm"
							value={filter}
							onChange={(e) =>
								setFilter(
									e.target.value as "all" | "runbook_gate" | "command_option",
								)
							}
						>
							<option value="all">来源（全部）</option>
							<option value="runbook_gate">编排流确认门</option>
							<option value="command_option">命令选项级</option>
						</select>
						<select
							className="select-sm"
							value={riskFilter}
							onChange={(e) => setRiskFilter(e.target.value)}
						>
							<option value="">风险（全部）</option>
							<option value="高">高</option>
							<option value="中">中</option>
							<option value="低">低</option>
						</select>
					</>
				}
			/>
			{filtered.length === 0 ? (
				<EmptyState text="没有待处理的审批 🎉" />
			) : (
				<>
					<div className="approval-list">
						{pageItems.map((t) => (
							<Panel key={t.id}>
								<div className="approval-card-head">
									<strong>{t.id}</strong>
									<Badge
										tone={
											t.approval!.source === "runbook_gate" ? "purple" : "cyan"
										}
									>
										{t.approval!.source === "runbook_gate"
											? "编排流确认门"
											: "命令选项级"}
									</Badge>
									{t.approval!.runbookName && (
										<Badge tone="blue">{t.approval!.runbookName}</Badge>
									)}
									<Badge tone="gray">@ {t.target}</Badge>
									<RiskBadge risk={t.risk} />
									<span className="hint-text">{t.time}</span>
								</div>
								<ApprovalPanel
									t={t}
									onResolved={(action) => onResolve(t.id, action)}
								/>
							</Panel>
						))}
					</div>
					<div className="pager" style={{ marginTop: 16 }}>
						<div className="pager-info">
							{filtered.length > 0 ? (
								<>
									第 {startIdx + 1}–
									{Math.min(startIdx + pageSize, filtered.length)} 条 / 共{" "}
									{filtered.length} 条
									{(search || filter !== "all" || riskFilter) && " · 已筛选"}
								</>
							) : (
								"共 0 条"
							)}
						</div>
						<div className="pager-controls">
							<label className="pager-size">
								每页
								<select
									value={pageSize}
									onChange={(e) => setPageSize(Number(e.target.value))}
								>
									<option value={10}>10</option>
									<option value={20}>20</option>
									<option value={50}>50</option>
								</select>
							</label>
							<button
								className="btn btn-sm"
								disabled={safePage <= 1}
								onClick={() => setPage(safePage - 1)}
							>
								‹ 上一页
							</button>
							{pageNumbers.map((n, i) =>
								n === "..." ? (
									<span key={`gap-${i}`} className="pager-gap">
										…
									</span>
								) : (
									<button
										key={n}
										className={`btn btn-sm ${n === safePage ? "btn-primary" : ""}`}
										onClick={() => setPage(n)}
									>
										{n}
									</button>
								),
							)}
							<button
								className="btn btn-sm"
								disabled={safePage >= totalPages}
								onClick={() => setPage(safePage + 1)}
							>
								下一页 ›
							</button>
						</div>
					</div>
				</>
			)}
		</>
	);
}
