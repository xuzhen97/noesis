import { useState } from "react";
import { Badge, Button, Panel, StatusBadge } from "./components";
import { frpMappings } from "./mockData";

// ponytail: 抽屉+模板就地实现，不引入状态管理；保存为模板仅 console 占位

const builtinTemplates = [
	{ label: "Web 8080", protocol: "TCP", localPort: 8080 },
	{ label: "SSH 22", protocol: "TCP", localPort: 22 },
	{ label: "MySQL 3306", protocol: "TCP", localPort: 3306 },
	{ label: "PostgreSQL 5432", protocol: "TCP", localPort: 5432 },
	{ label: "Redis 6379", protocol: "TCP", localPort: 6379 },
];

type DrawerMode = "create" | "edit" | null;

export function FrpMappingPage() {
	const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formLocal, setFormLocal] = useState("127.0.0.1:8080");
	const [formRemote, setFormRemote] = useState("auto");
	const [formProto, setFormProto] = useState("TCP");

	const editing = frpMappings.find((f) => f.id === editingId);

	function openCreate() {
		setEditingId(null);
		setFormLocal("127.0.0.1:8080");
		setFormRemote("auto");
		setFormProto("TCP");
		setDrawerMode("create");
	}

	function openEdit(id: string) {
		const f = frpMappings.find((x) => x.id === id);
		if (!f) return;
		setEditingId(id);
		setFormLocal(`127.0.0.1:${f.local}`);
		setFormRemote((f.public as string).split(":").pop() || "auto");
		setFormProto(f.protocol);
		setDrawerMode("edit");
	}

	function applyTemplate(t: (typeof builtinTemplates)[number]) {
		setEditingId(null);
		setFormLocal(`127.0.0.1:${t.localPort}`);
		setFormRemote("auto");
		setFormProto(t.protocol);
		setDrawerMode("create");
	}

	function closeDrawer() {
		setDrawerMode(null);
		setEditingId(null);
	}

	return (
		<div className="config-page">
			<div className="notice-bar">
				ℹ FRP 用于临时暴露内部服务，映射长期有效，仅手动关闭 / 删除；frps
				由你自备。
			</div>

			{/* ── frps 连接状态 ── */}
			<Panel title="FRP 服务器" action={<Badge tone="green">●在线</Badge>}>
				<div className="frps-status">
					<span>
						<small>服务器</small>
						<code>frp.example.com</code>
					</span>
					<span>
						<small>端口</small>
						<code>7000</code>
					</span>
					<span>
						<small>带宽</small>
						<code>↑1.2MB/s · ↓340KB/s</code>
					</span>
					<span>
						<small>活跃映射</small>
						<code>{frpMappings.filter((f) => f.status === "活跃").length}</code>
					</span>
				</div>
			</Panel>

			{/* ── 映射表 ── */}
			<Panel
				title="FRP 映射"
				action={
					<Button tone="primary" size="sm" onClick={openCreate}>
						+ 新建映射
					</Button>
				}
			>
				<table className="data-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>名称</th>
							<th>本地地址</th>
							<th>远程端口</th>
							<th>协议</th>
							<th>状态</th>
							<th>创建</th>
							<th>操作</th>
						</tr>
					</thead>
					<tbody>
						{frpMappings.map((f) => (
							<tr key={f.id}>
								<td>{f.id}</td>
								<td>
									<strong>{f.name}</strong>
								</td>
								<td>127.0.0.1:{f.local}</td>
								<td>{(f.public as string).split(":").pop()}</td>
								<td>
									<Badge>{f.protocol}</Badge>
								</td>
								<td>
									<StatusBadge status={f.status} />
								</td>
								<td>{f.created}</td>
								<td>
									<div className="row-actions">
										<button
											className="btn btn-sm"
											onClick={() => openEdit(f.id)}
										>
											编辑
										</button>
										<button className="btn btn-sm">关闭</button>
										<button className="btn btn-sm btn-ghost">删除</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Panel>

			{/* ── 端口映射模板 ── */}
			<Panel
				title="端口映射模板"
				action={<Button size="sm">保存当前为模板</Button>}
			>
				<div className="frp-template-grid">
					{builtinTemplates.map((t) => (
						<button
							key={t.label}
							className="frp-template-card"
							onClick={() => applyTemplate(t)}
						>
							<strong>{t.label}</strong>
							<small>
								{t.protocol} · 本地 {t.localPort}
							</small>
						</button>
					))}
				</div>
			</Panel>

			{/* ── 新建/编辑抽屉 ── */}
			{drawerMode && (
				<div className="frp-drawer-overlay" onClick={closeDrawer}>
					<div className="frp-drawer" onClick={(e) => e.stopPropagation()}>
						<div className="frp-drawer-head">
							<strong>
								{drawerMode === "create"
									? "新建映射"
									: `编辑 ${editing?.name ?? ""}`}
							</strong>
							<button className="frp-drawer-close" onClick={closeDrawer}>
								×
							</button>
						</div>
						<div className="frp-drawer-body">
							<label className="field">
								<span>本地地址</span>
								<input
									className="select-input"
									value={formLocal}
									onChange={(e) => setFormLocal(e.target.value)}
								/>
							</label>
							<label className="field">
								<span>远程端口</span>
								<select
									className="select-input"
									value={formRemote === "auto" ? "auto" : "custom"}
									onChange={(e) =>
										setFormRemote(e.target.value === "auto" ? "auto" : "")
									}
								>
									<option value="auto">自动分配</option>
									<option value="custom">指定</option>
								</select>
								{formRemote !== "auto" && (
									<input
										className="select-input"
										style={{ marginTop: 6 }}
										placeholder="远程端口号"
										value={formRemote}
										onChange={(e) => setFormRemote(e.target.value)}
									/>
								)}
							</label>
							<label className="field">
								<span>协议</span>
								<select
									className="select-input"
									value={formProto}
									onChange={(e) => setFormProto(e.target.value)}
								>
									<option value="TCP">TCP</option>
									<option value="UDP">UDP</option>
								</select>
							</label>
						</div>
						<div className="frp-drawer-actions">
							<Button size="sm" onClick={closeDrawer}>
								取消
							</Button>
							<Button size="sm" tone="primary" onClick={closeDrawer}>
								{drawerMode === "create" ? "创建" : "保存"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
