import type { ReactNode } from "react";
import type { MachineStatus, RiskLevel, TaskStatus } from "./mockData";

// ---------- 基础 UI ----------

export function Badge({
	children,
	tone = "blue",
}: {
	children: ReactNode;
	tone?: "blue" | "green" | "red" | "orange" | "purple" | "gray" | "cyan";
}) {
	return <span className={`badge ${tone}`}>{children}</span>;
}

export function Button({
	children,
	tone = "default",
	onClick,
	size,
}: {
	children: ReactNode;
	tone?: "default" | "primary" | "danger" | "ghost" | "warning";
	onClick?: () => void;
	size?: "sm";
}) {
	return (
		<button
			className={`btn ${tone} ${size ? `btn-${size}` : ""}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function StatusBadge({
	status,
}: {
	status: MachineStatus | TaskStatus | string;
}) {
	const tone =
		status === "在线" ||
		status === "成功" ||
		status === "活跃" ||
		status === "有效" ||
		status === "已发布"
			? "green"
			: status === "离线" ||
					status === "失败" ||
					status === "已用完" ||
					status === "已关闭"
				? "red"
				: status === "运行中" ||
						status === "更新中" ||
						status === "即将过期" ||
						status === "待确认" ||
						status === "需复核"
					? "orange"
					: "gray";
	return <Badge tone={tone as any}>{status}</Badge>;
}

export function RiskBadge({ risk }: { risk: RiskLevel | string }) {
	const tone = risk === "高" ? "red" : risk === "中" ? "orange" : "green";
	return <Badge tone={tone as any}>{risk}风险</Badge>;
}

export function Panel({
	title,
	action,
	children,
	className = "",
}: {
	title?: string;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`panel ${className}`}>
			{(title || action) && (
				<header className="panel-head">
					{title && <h3>{title}</h3>}
					{action && <div className="panel-action">{action}</div>}
				</header>
			)}
			{children}
		</section>
	);
}

export function EmptyState({
	text,
	sub,
	icon = "∅",
}: {
	text: string;
	sub?: string;
	icon?: string;
}) {
	return (
		<div className="empty-state">
			<span className="empty-icon">{icon}</span>
			<p className="empty-text">{text}</p>
			{sub && <p className="empty-sub">{sub}</p>}
		</div>
	);
}

export function Sparkline({
	values,
	tone = "blue",
}: {
	values: number[];
	tone?: string;
}) {
	const max = Math.max(...values, 1);
	const points = values
		.map((v, i) => `${(i / (values.length - 1)) * 100},${42 - (v / max) * 36}`)
		.join(" ");
	return (
		<svg
			className={`sparkline ${tone}`}
			viewBox="0 0 100 44"
			preserveAspectRatio="none"
		>
			<polyline
				points={points}
				fill="none"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function MiniStat({
	title,
	value,
	icon,
	tone = "blue",
	suffix,
}: {
	title: string;
	value: string;
	icon: string;
	tone?: string;
	suffix?: string;
}) {
	return (
		<div className={`mini-stat ${tone}`}>
			<span className="ms-icon">{icon}</span>
			<div>
				<small>{title}</small>
				<strong>{value}</strong>
				{suffix && <em>{suffix}</em>}
			</div>
		</div>
	);
}

export function InfoRows({ rows }: { rows: [string, string][] }) {
	return (
		<div className="info-rows">
			{rows.map(([k, v]) => (
				<div key={k}>
					<span>{k}</span>
					<strong>{v}</strong>
				</div>
			))}
		</div>
	);
}

export function Field({
	label,
	value,
	textarea = false,
}: {
	label: string;
	value: string;
	textarea?: boolean;
}) {
	return (
		<label className="field">
			<span>{label}</span>
			{textarea ? (
				<textarea value={value} readOnly />
			) : (
				<input value={value} readOnly />
			)}
		</label>
	);
}

export function ToggleRow({
	title,
	desc,
	on = false,
}: {
	title: string;
	desc: string;
	on?: boolean;
}) {
	return (
		<div className="toggle-row">
			<div>
				<strong>{title}</strong>
				<small>{desc}</small>
			</div>
			<span className={`switch ${on ? "on" : ""}`} />
		</div>
	);
}

export function Pagination({ total }: { total: string }) {
	return (
		<div className="pagination">
			<span>共 {total} 条</span>
			<button>‹</button>
			<button className="active">1</button>
			<button>2</button>
			<button>3</button>
			<button>…</button>
			<button>›</button>
		</div>
	);
}

export function PageTitle({
	title,
	desc,
	actions,
}: {
	title: string;
	desc?: string;
	actions?: ReactNode;
}) {
	return (
		<div className="page-title">
			<div>
				<h1>{title}</h1>
				{desc && <p>{desc}</p>}
			</div>
			{actions && <div className="title-actions">{actions}</div>}
		</div>
	);
}

export function osIcon(os: string) {
	if (os.includes("Windows")) return "▦";
	if (os.includes("Ubuntu")) return "◌";
	if (os.includes("Debian")) return "◎";
	if (os.includes("macOS")) return "";
	return "●";
}
