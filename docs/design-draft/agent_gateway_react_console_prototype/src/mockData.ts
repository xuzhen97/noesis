export type MachineStatus = "在线" | "离线" | "更新中" | "告警";
export type TaskStatus =
	| "运行中"
	| "成功"
	| "失败"
	| "等待中"
	| "待确认"
	| "需复核";
export type RiskLevel = "低" | "中" | "高";

// ── 磁盘信息（多盘/多分区）──
export interface DiskInfo {
	name: string; // Windows: "C:" Linux: "/" macOS: "Macintosh HD"
	mount: string; // 挂载点（Windows 同 name，Linux 是路径）
	totalGb: number; // 总容量 GB
	usedGb: number; // 已用 GB
	freeGb: number; // 可用 GB
	usagePct: number; // 使用率 %
	fsType: string; // ntfs / ext4 / xfs / apfs
	readonly: boolean;
	system: boolean; // 是否系统盘
	label?: string; // 卷标（Windows 可选，如 "数据"/"备份"）
}

// 多盘 mock：覆盖 Windows 多盘符 / Linux 多分区 / 离线无数据 三种形态
const winDisks: DiskInfo[] = [
	{
		name: "C:",
		mount: "C:",
		totalGb: 500,
		usedGb: 120,
		freeGb: 380,
		usagePct: 24,
		fsType: "ntfs",
		readonly: false,
		system: true,
		label: "系统",
	},
	{
		name: "D:",
		mount: "D:",
		totalGb: 2000,
		usedGb: 1820,
		freeGb: 180,
		usagePct: 91,
		fsType: "ntfs",
		readonly: false,
		system: false,
		label: "项目",
	},
	{
		name: "E:",
		mount: "E:",
		totalGb: 4000,
		usedGb: 1200,
		freeGb: 2800,
		usagePct: 30,
		fsType: "ntfs",
		readonly: false,
		system: false,
		label: "备份",
	},
];
const winGpuDisks: DiskInfo[] = [
	{
		name: "C:",
		mount: "C:",
		totalGb: 250,
		usedGb: 88,
		freeGb: 162,
		usagePct: 35,
		fsType: "ntfs",
		readonly: false,
		system: true,
		label: "系统",
	},
	{
		name: "D:",
		mount: "D:",
		totalGb: 2000,
		usedGb: 1550,
		freeGb: 450,
		usagePct: 78,
		fsType: "ntfs",
		readonly: false,
		system: false,
		label: "数据",
	},
];
const linuxDisks: DiskInfo[] = [
	{
		name: "/",
		mount: "/",
		totalGb: 50,
		usedGb: 20,
		freeGb: 30,
		usagePct: 40,
		fsType: "ext4",
		readonly: false,
		system: true,
	},
	{
		name: "/home",
		mount: "/home",
		totalGb: 200,
		usedGb: 80,
		freeGb: 120,
		usagePct: 40,
		fsType: "ext4",
		readonly: false,
		system: false,
	},
	{
		name: "/var",
		mount: "/var",
		totalGb: 100,
		usedGb: 73,
		freeGb: 27,
		usagePct: 73,
		fsType: "ext4",
		readonly: false,
		system: false,
	},
	{
		name: "/data",
		mount: "/data",
		totalGb: 1000,
		usedGb: 210,
		freeGb: 790,
		usagePct: 21,
		fsType: "xfs",
		readonly: false,
		system: false,
	},
];
const linuxVmDisks: DiskInfo[] = [
	{
		name: "/",
		mount: "/",
		totalGb: 100,
		usedGb: 18,
		freeGb: 82,
		usagePct: 18,
		fsType: "ext4",
		readonly: false,
		system: true,
	},
];
const noDisks: DiskInfo[] = [];

// 扩充舰队：用于验证分页/筛选的 18 台机器需要的额外盘配置
const winSingleDisks: DiskInfo[] = [
	{
		name: "C:",
		mount: "C:",
		totalGb: 256,
		usedGb: 95,
		freeGb: 161,
		usagePct: 37,
		fsType: "ntfs",
		readonly: false,
		system: true,
		label: "系统",
	},
];
const winDualDisks: DiskInfo[] = [
	{
		name: "C:",
		mount: "C:",
		totalGb: 512,
		usedGb: 210,
		freeGb: 302,
		usagePct: 41,
		fsType: "ntfs",
		readonly: false,
		system: true,
		label: "系统",
	},
	{
		name: "D:",
		mount: "D:",
		totalGb: 1000,
		usedGb: 640,
		freeGb: 360,
		usagePct: 64,
		fsType: "ntfs",
		readonly: false,
		system: false,
		label: "数据",
	},
];
const winDbDisks: DiskInfo[] = [
	{
		name: "C:",
		mount: "C:",
		totalGb: 200,
		usedGb: 78,
		freeGb: 122,
		usagePct: 39,
		fsType: "ntfs",
		readonly: false,
		system: true,
	},
	{
		name: "D:",
		mount: "D:",
		totalGb: 2000,
		usedGb: 1760,
		freeGb: 240,
		usagePct: 88,
		fsType: "ntfs",
		readonly: false,
		system: false,
		label: "数据库",
	},
];
const linuxFullDisks: DiskInfo[] = [
	{
		name: "/",
		mount: "/",
		totalGb: 80,
		usedGb: 58,
		freeGb: 22,
		usagePct: 73,
		fsType: "ext4",
		readonly: false,
		system: true,
	},
	{
		name: "/home",
		mount: "/home",
		totalGb: 500,
		usedGb: 420,
		freeGb: 80,
		usagePct: 84,
		fsType: "ext4",
		readonly: false,
		system: false,
	},
	{
		name: "/data",
		mount: "/data",
		totalGb: 4000,
		usedGb: 1200,
		freeGb: 2800,
		usagePct: 30,
		fsType: "xfs",
		readonly: false,
		system: false,
	},
];
const linuxLogDisks: DiskInfo[] = [
	{
		name: "/",
		mount: "/",
		totalGb: 80,
		usedGb: 58,
		freeGb: 22,
		usagePct: 73,
		fsType: "ext4",
		readonly: false,
		system: true,
	},
	{
		name: "/var/log",
		mount: "/var/log",
		totalGb: 200,
		usedGb: 198,
		freeGb: 2,
		usagePct: 99,
		fsType: "ext4",
		readonly: false,
		system: false,
		label: "日志盘",
	},
];
const linuxProdDisks: DiskInfo[] = [
	{
		name: "/",
		mount: "/",
		totalGb: 100,
		usedGb: 41,
		freeGb: 59,
		usagePct: 41,
		fsType: "ext4",
		readonly: false,
		system: true,
	},
	{
		name: "/var",
		mount: "/var",
		totalGb: 300,
		usedGb: 95,
		freeGb: 205,
		usagePct: 32,
		fsType: "ext4",
		readonly: false,
		system: false,
	},
	{
		name: "/data",
		mount: "/data",
		totalGb: 8000,
		usedGb: 5600,
		freeGb: 2400,
		usagePct: 70,
		fsType: "xfs",
		readonly: false,
		system: false,
	},
];
const macDisks: DiskInfo[] = [
	{
		name: "Macintosh HD",
		mount: "/",
		totalGb: 512,
		usedGb: 310,
		freeGb: 202,
		usagePct: 61,
		fsType: "apfs",
		readonly: false,
		system: true,
	},
];

export const metrics = [
	{
		label: "在线机器",
		value: "12",
		delta: "+2",
		tone: "blue",
		icon: "🖥",
		line: [8, 12, 9, 10, 11, 12, 12, 12],
	},
	{
		label: "离线机器",
		value: "2",
		delta: "-1",
		tone: "red",
		icon: "○",
		line: [4, 3, 3, 2, 3, 2, 2, 2],
	},
	{
		label: "运行任务",
		value: "3",
		delta: "+1",
		tone: "green",
		icon: "▶",
		line: [1, 2, 2, 3, 2, 3, 3, 3],
	},
	{
		label: "失败任务",
		value: "1",
		delta: "+1",
		tone: "orange",
		icon: "!",
		line: [0, 0, 1, 0, 0, 1, 0, 1],
	},
	{
		label: "Pi 就绪率",
		value: "85%",
		delta: "+3%",
		tone: "purple",
		icon: "π",
		line: [70, 72, 75, 78, 80, 82, 84, 85],
	},
];

export const machines = [
	{
		id: "win-dev-01",
		ip: "10.0.0.101",
		host: "WIN-DEV-01",
		os: "Windows 11",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "22%",
		mem: "4.2G/16G",
		disks: winDisks,
		load: "0.8",
		heartbeat: "3s 前",
		tags: ["dev", "win"],
		runtime: { node: "v24.15.0", npm: "10.7.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-db-02",
		ip: "10.0.0.102",
		host: "db02",
		os: "Ubuntu 22.04",
		status: "在线" as MachineStatus,
		version: "v1.1.5",
		versionBadge: "可更新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "18%",
		mem: "6.1G/32G",
		disks: linuxDisks,
		load: "1.2",
		heartbeat: "5s 前",
		tags: ["prod", "db"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "mac-air",
		ip: "10.0.0.103",
		host: "air",
		os: "macOS 14",
		status: "离线" as MachineStatus,
		version: "v1.1.0",
		versionBadge: "可更新",
		pi: "未安装",
		piVersion: "—",
		frp: "未运行",
		cpu: "—",
		mem: "—",
		disks: noDisks,
		load: "—",
		heartbeat: "3m 前",
		tags: ["dev"],
		runtime: { node: "未检测", npm: "未检测", pi: "未安装", frpc: "未运行" },
	},
	{
		id: "gpu-work-01",
		ip: "10.0.0.104",
		host: "gpu-work",
		os: "Windows 10",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "64%",
		mem: "12.1G/64G",
		disks: winGpuDisks,
		load: "2.4",
		heartbeat: "2s 前",
		tags: ["gpu", "render"],
		runtime: { node: "v20.18.0", npm: "10.1.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "test-vm-02",
		ip: "10.0.0.105",
		host: "test-vm-02",
		os: "Ubuntu 22.04",
		status: "更新中" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "更新中",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "12%",
		mem: "2.2G/8G",
		disks: linuxVmDisks,
		load: "0.3",
		heartbeat: "8s 前",
		tags: ["test", "vm"],
		runtime: { node: "v22.2.0", npm: "10.3.1", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "win-ci-03",
		ip: "10.0.0.111",
		host: "WIN-CI-03",
		os: "Windows Server 2022",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "41%",
		mem: "8.4G/32G",
		disks: winDualDisks,
		load: "1.1",
		heartbeat: "4s 前",
		tags: ["ci", "win"],
		runtime: { node: "v24.15.0", npm: "10.7.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "win-laptop-04",
		ip: "10.0.0.112",
		host: "LAPTOP-04",
		os: "Windows 11",
		status: "在线" as MachineStatus,
		version: "v1.1.5",
		versionBadge: "可更新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "未运行",
		cpu: "9%",
		mem: "3.1G/16G",
		disks: winSingleDisks,
		load: "0.4",
		heartbeat: "6s 前",
		tags: ["dev", "win"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-build-05",
		ip: "10.0.0.113",
		host: "build-05",
		os: "Debian 12",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "73%",
		mem: "28.6G/64G",
		disks: linuxFullDisks,
		load: "3.8",
		heartbeat: "2s 前",
		tags: ["build", "linux"],
		runtime: { node: "v24.15.0", npm: "10.7.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-prod-db-06",
		ip: "10.0.0.114",
		host: "prod-db-06",
		os: "Ubuntu 24.04",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "未安装",
		piVersion: "—",
		frp: "未运行",
		cpu: "31%",
		mem: "48.2G/128G",
		disks: linuxProdDisks,
		load: "2.1",
		heartbeat: "1s 前",
		tags: ["prod", "db", "linux"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "未安装", frpc: "未运行" },
	},
	{
		id: "win-sql-07",
		ip: "10.0.0.115",
		host: "WIN-SQL-07",
		os: "Windows Server 2019",
		status: "在线" as MachineStatus,
		version: "v1.1.5",
		versionBadge: "可更新",
		pi: "未安装",
		piVersion: "—",
		frp: "未运行",
		cpu: "55%",
		mem: "36.1G/64G",
		disks: winDbDisks,
		load: "2.7",
		heartbeat: "3s 前",
		tags: ["prod", "db", "win"],
		runtime: { node: "v20.18.0", npm: "10.1.0", pi: "未安装", frpc: "未运行" },
	},
	{
		id: "mac-mini-08",
		ip: "10.0.0.116",
		host: "mac-mini-08",
		os: "macOS 15",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "18%",
		mem: "9.2G/32G",
		disks: macDisks,
		load: "0.9",
		heartbeat: "5s 前",
		tags: ["dev", "mac"],
		runtime: { node: "v24.15.0", npm: "10.7.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-edge-09",
		ip: "10.0.0.117",
		host: "edge-09",
		os: "Alpine 3.20",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "未安装",
		piVersion: "—",
		frp: "运行中",
		cpu: "6%",
		mem: "0.8G/4G",
		disks: linuxVmDisks,
		load: "0.1",
		heartbeat: "7s 前",
		tags: ["edge", "linux"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "未安装", frpc: "v0.59.0" },
	},
	{
		id: "win-render-10",
		ip: "10.0.0.118",
		host: "WIN-RENDER-10",
		os: "Windows 11",
		status: "告警" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "88%",
		mem: "58.1G/64G",
		disks: winGpuDisks,
		load: "5.2",
		heartbeat: "2s 前",
		tags: ["gpu", "render", "win"],
		runtime: { node: "v20.18.0", npm: "10.1.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-log-11",
		ip: "10.0.0.119",
		host: "log-11",
		os: "Rocky Linux 9",
		status: "在线" as MachineStatus,
		version: "v1.1.0",
		versionBadge: "可更新",
		pi: "未安装",
		piVersion: "—",
		frp: "未运行",
		cpu: "14%",
		mem: "4.1G/16G",
		disks: linuxLogDisks,
		load: "0.6",
		heartbeat: "4s 前",
		tags: ["prod", "linux"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "未安装", frpc: "未运行" },
	},
	{
		id: "win-test-12",
		ip: "10.0.0.120",
		host: "WIN-TEST-12",
		os: "Windows 10",
		status: "离线" as MachineStatus,
		version: "v1.0.5",
		versionBadge: "可更新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "未运行",
		cpu: "—",
		mem: "—",
		disks: noDisks,
		load: "—",
		heartbeat: "12m 前",
		tags: ["test", "win"],
		runtime: { node: "未检测", npm: "未检测", pi: "未检测", frpc: "未运行" },
	},
	{
		id: "linux-ai-13",
		ip: "10.0.0.121",
		host: "ai-13",
		os: "Ubuntu 22.04",
		status: "在线" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "最新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "67%",
		mem: "44.8G/128G",
		disks: linuxProdDisks,
		load: "4.1",
		heartbeat: "3s 前",
		tags: ["gpu", "ai", "linux"],
		runtime: { node: "v24.15.0", npm: "10.7.0", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "win-office-14",
		ip: "10.0.0.122",
		host: "OFFICE-14",
		os: "Windows 11",
		status: "在线" as MachineStatus,
		version: "v1.1.5",
		versionBadge: "可更新",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "未运行",
		cpu: "11%",
		mem: "5.6G/16G",
		disks: winSingleDisks,
		load: "0.5",
		heartbeat: "6s 前",
		tags: ["dev", "win"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "v0.74", frpc: "v0.59.0" },
	},
	{
		id: "linux-staging-15",
		ip: "10.0.0.123",
		host: "staging-15",
		os: "Ubuntu 22.04",
		status: "更新中" as MachineStatus,
		version: "v1.2.0",
		versionBadge: "更新中",
		pi: "已就绪",
		piVersion: "v0.74",
		frp: "运行中",
		cpu: "22%",
		mem: "6.8G/32G",
		disks: linuxDisks,
		load: "0.9",
		heartbeat: "5s 前",
		tags: ["staging", "linux"],
		runtime: { node: "v22.3.0", npm: "10.2.5", pi: "v0.74", frpc: "v0.59.0" },
	},
];

// 审批请求：approve() 或 cmd(..,{approve:true}) 挂起时挂载到 Task
export interface ApprovalRequest {
	message: string; // 确认门提示 / 危险命令内容
	source: "runbook_gate" | "command_option"; // approve() 显式门 / 命令选项级
	runbookId?: string; // 来源编排流（runbook_gate 时）
	runbookName?: string;
	nodeName?: string; // 触发确认的节点/步骤名
	// 执行上下文：已完成的步骤 + 即将执行的步骤（供审批人判断）
	doneSteps: string[];
	nextSteps: string[];
}

export interface Task {
	id: string;
	type: string;
	target: string;
	status: TaskStatus;
	progress: number;
	time: string;
	risk: RiskLevel;
	dur: string;
	approval?: ApprovalRequest; // status=待确认 时必填
}

export const tasks: Task[] = [
	{
		id: "task_124",
		type: "computer.run",
		target: "win-dev-01",
		status: "需复核" as TaskStatus,
		progress: 100,
		time: "1m 前",
		risk: "中" as RiskLevel,
		dur: "6m",
	},
	{
		id: "task_123",
		type: "browser.run",
		target: "win-dev-01",
		status: "成功" as TaskStatus,
		progress: 100,
		time: "2m 前",
		risk: "低" as RiskLevel,
		dur: "2m",
	},
	{
		id: "task_088",
		type: "command",
		target: "win-dev-01",
		status: "成功" as TaskStatus,
		progress: 100,
		time: "3m 前",
		risk: "低" as RiskLevel,
		dur: "3m",
	},
	{
		id: "task_087",
		type: "pi.run",
		target: "win-dev-01",
		status: "运行中" as TaskStatus,
		progress: 62,
		time: "8m 前",
		risk: "中" as RiskLevel,
		dur: "8m",
	},
	{
		id: "task_086",
		type: "file",
		target: "linux-db-02",
		status: "成功" as TaskStatus,
		progress: 100,
		time: "25m 前",
		risk: "低" as RiskLevel,
		dur: "25m",
	},
	{
		id: "task_085",
		type: "install",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "40m 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备在 linux-db-02 安装 nginx 1.25，涉及系统包变更。",
			source: "command_option",
			nodeName: "apt install nginx=1.25",
			doneSteps: ["检查当前版本 nginx 1.18"],
			nextSteps: ["安装 nginx 1.25", "重启 nginx", "验证服务状态"],
		},
	},
	{
		id: "task_081",
		type: "pi.run",
		target: "linux-db-02",
		status: "失败" as TaskStatus,
		progress: 0,
		time: "12m 前",
		risk: "中" as RiskLevel,
		dur: "12m",
	},
	{
		id: "task_089",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 50,
		time: "2m 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备停 mysql 并替换产物，确认继续？",
			source: "runbook_gate",
			runbookId: "r1",
			runbookName: "全栈发布流水线",
			nodeName: "approve(停服替换)",
			doneSteps: [
				"build.cmd: git pull + npm run build",
				"build.cmd: tar 打包 dist",
			],
			nextSteps: [
				"db.cmd: systemctl stop mysql",
				"db.cmd: 替换产物并启服",
				"db.pi: 健康验证",
			],
		},
	},
	{
		id: "task_090",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 33,
		time: "5m 前",
		risk: "中" as RiskLevel,
		dur: "—",
		approval: {
			message:
				"根据诊断结果，建议重启 mysql，确认执行？\n诊断结论：连接数正常，但存在慢查询堆积，重启可释放连接池。",
			source: "runbook_gate",
			runbookId: "r2",
			runbookName: "故障应急诊断流",
			nodeName: "approve(重启修复)",
			doneSteps: ["db.pi: 数据库诊断（只读）", "app.pi: 应用日志归因"],
			nextSteps: ["db.cmd: systemctl restart mysql"],
		},
	},
	{
		id: "task_091",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "6m 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备删除 /var/log 下 7 天前的日志，不可恢复。",
			source: "command_option",
			nodeName: "find /var/log -mtime +7 -delete",
			doneSteps: ["列出待删文件清单"],
			nextSteps: ["执行删除", "验证空间释放"],
		},
	},
	{
		id: "task_092",
		type: "pi.run",
		target: "win-dev-01",
		status: "待确认" as TaskStatus,
		progress: 66,
		time: "8m 前",
		risk: "中" as RiskLevel,
		dur: "—",
		approval: {
			message:
				"依赖升级评估完成，确认升级 lodash 和 axios？\n风险评估：lodash 4.17.x 安全补丁，axios 1.x 兼容。",
			source: "runbook_gate",
			runbookId: "r4",
			runbookName: "依赖升级评估与执行",
			nodeName: "approve(升级补丁)",
			doneSteps: ["dev.pi: npm outdated 风险评估"],
			nextSteps: ["dev.cmd: npm update lodash axios", "dev.pi: 回归验证"],
		},
	},
	{
		id: "task_093",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "12m 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message:
				"准备在 linux-db-02 执行 rclone copy 到云盘，将上传约 2GB 日志包。",
			source: "command_option",
			nodeName: "rclone copy /tmp/logs-* remote:archive",
			doneSteps: ["linux: 打包日志", "win: 打包日志", "汇聚到 linux"],
			nextSteps: ["上传到云盘", "校验远端文件"],
		},
	},
	{
		id: "task_094",
		type: "pi.run",
		target: "gpu-work-01",
		status: "待确认" as TaskStatus,
		progress: 75,
		time: "15m 前",
		risk: "低" as RiskLevel,
		dur: "—",
		approval: {
			message: "GPU 诊断完成，确认将结果汇总为集群报告？",
			source: "runbook_gate",
			runbookId: "r3",
			runbookName: "GPU 集群健康巡检",
			nodeName: "approve(汇总报告)",
			doneSteps: ["gpu1 诊断", "gpu2 诊断", "gpu3 诊断"],
			nextSteps: ["汇总集群健康度报告"],
		},
	},
	{
		id: "task_095",
		type: "command",
		target: "win-dev-01",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "22m 前",
		risk: "中" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备重启 Windows 服务 Spooler，影响打印队列。",
			source: "command_option",
			nodeName: "Restart-Service -Name Spooler -Force",
			doneSteps: ["Get-Service 确认服务存在"],
			nextSteps: ["重启服务", "验证状态"],
		},
	},
	{
		id: "task_096",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 50,
		time: "30m 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message:
				"跨机 CVE 扫描完成，确认汇总 Linux/Windows 修复清单？\nLinux: 3 个高危，Windows: 1 个高危。",
			source: "runbook_gate",
			runbookId: "r6",
			runbookName: "跨机安全漏洞扫描",
			nodeName: "approve(汇总清单)",
			doneSteps: ["linux CVE 扫描", "win CVE 扫描"],
			nextSteps: ["汇总统一修复优先级清单"],
		},
	},
	{
		id: "task_097",
		type: "command",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "45m 前",
		risk: "低" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备导出 iptables 防火墙规则到 /tmp/fw-rules.txt。",
			source: "command_option",
			nodeName: "iptables -L -n -v > /tmp/fw-rules.txt",
			doneSteps: [],
			nextSteps: ["导出规则", "确认文件生成"],
		},
	},
	{
		id: "task_098",
		type: "pi.run",
		target: "win-dev-01",
		status: "待确认" as TaskStatus,
		progress: 0,
		time: "1h 前",
		risk: "中" as RiskLevel,
		dur: "—",
		approval: {
			message: "准备打包配置目录到备份路径，确认备份范围？",
			source: "command_option",
			nodeName: "tar -czf cfg-backup.tar.gz /etc/app",
			doneSteps: [],
			nextSteps: ["打包配置", "确认备份包"],
		},
	},
	{
		id: "task_099",
		type: "pi.run",
		target: "linux-db-02",
		status: "待确认" as TaskStatus,
		progress: 40,
		time: "1h 前",
		risk: "高" as RiskLevel,
		dur: "—",
		approval: {
			message:
				"故障应急诊断完成，建议重启 redis，确认执行？\n诊断：内存碎片率高，重启可整理内存。",
			source: "runbook_gate",
			runbookId: "r2",
			runbookName: "故障应急诊断流",
			nodeName: "approve(重启 redis)",
			doneSteps: ["db.pi: redis 诊断", "app.pi: 日志归因"],
			nextSteps: ["db.cmd: systemctl restart redis"],
		},
	},
];

export const activities = [
	{
		time: "5 分钟前",
		icon: "π",
		title: "Pi 任务完成 win-dev-01",
		desc: "task_088 共 5 步 31s",
		tag: "Pi",
		tone: "purple",
	},
	{
		time: "18 分钟前",
		icon: "🔑",
		title: "安装令牌创建",
		desc: "Windows-生产批量部署 100 次",
		tag: "安装",
		tone: "blue",
	},
	{
		time: "1 小时前",
		icon: "↻",
		title: "Client 上线 linux-db-02",
		desc: "v1.1.5 心跳恢复",
		tag: "系统",
		tone: "green",
	},
	{
		time: "2 小时前",
		icon: "✓",
		title: "确认通过 删除文件",
		desc: "win-dev-01 /tmp/old.log",
		tag: "审计",
		tone: "blue",
	},
	{
		time: "3 小时前",
		icon: "☍",
		title: "FRP 映射新增",
		desc: "App-Debug-3000 → 公网 23000",
		tag: "FRP",
		tone: "orange",
	},
];

// ── 文件树模型（多磁盘浏览）──
// 每个磁盘生成一棵真实感的目录树，按 OS / 系统盘 / 数据盘 / 文件系统类型分支。
export interface FileNode {
	name: string;
	kind: "folder" | "file";
	size?: string; // 文件大小（人类可读）
	time: string;
	perm: string;
	fileType?: string; // 文件后缀语义：TypeScript / JSON / Markdown / 日志 / 配置 / 压缩包
	cloud?: boolean; // 是否云盘中转文件
	children?: FileNode[]; // 文件夹的子节点
}

const T = "10:02";
const YESTERDAY = "昨天";
const DAYS2 = "2天前";
function tsFile(name: string, size: string, time = T): FileNode {
	return {
		name,
		kind: "file",
		size,
		time,
		perm: "rw-r--r--",
		fileType: "TypeScript",
	};
}
function jsonFile(name: string, size: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: YESTERDAY,
		perm: "rw-r--r--",
		fileType: "JSON",
	};
}
function mdFile(name: string, size: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: DAYS2,
		perm: "rw-r--r--",
		fileType: "Markdown",
	};
}
function logFile(name: string, size: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: T,
		perm: "rw-r-----",
		fileType: "日志",
	};
}
function confFile(name: string, size: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: YESTERDAY,
		perm: "rw-r--r--",
		fileType: "配置",
	};
}
function archiveFile(name: string, size: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: DAYS2,
		perm: "rw-r--r--",
		fileType: "压缩包",
	};
}
function folder(
	name: string,
	children: FileNode[],
	time = YESTERDAY,
): FileNode {
	return { name, kind: "folder", time, perm: "drwxr-xr-x", children };
}
function winFolder(
	name: string,
	children: FileNode[],
	time = YESTERDAY,
): FileNode {
	return { name, kind: "folder", time, perm: "drwxrwxr-x", children };
}
function winFile(name: string, size: string, fileType: string): FileNode {
	return {
		name,
		kind: "file",
		size,
		time: YESTERDAY,
		perm: "rw-rw-rw-",
		fileType,
	};
}

// 项目子树：在任意项目目录下复用
function projectSubtree(name: string): FileNode {
	return folder(name, [
		folder(
			"src",
			[
				tsFile("a.ts", "2.1K"),
				tsFile("b.ts", "5.4K"),
				tsFile("c.ts", "812B", "09:30"),
			],
			T,
		),
		folder("tests", [tsFile("a.test.ts", "1.4K", "09:58")], "09:58"),
		folder("dist", [winFile("app.js", "142K", "JavaScript")], "昨天"),
		jsonFile("package.json", "1.2K"),
		jsonFile("tsconfig.json", "0.6K"),
		mdFile("README.md", "4.8K"),
	]);
}

// Windows 系统盘（C:）
function winSystemTree(): FileNode[] {
	return [
		winFolder("Users", [
			winFolder("admin", [
				winFolder("Desktop", [winFile("notes.txt", "1.1K", "文本")]),
				winFolder("Documents", [winFile("report.docx", "38K", "文档")]),
				winFolder("Downloads", [archiveFile("setup.zip", "12.4M")]),
				winFolder("Projects", [
					projectSubtree("OptiMinder"),
					projectSubtree("gateway"),
				]),
				winFile(".npmrc", "0.2K", "配置"),
			]),
		]),
		winFolder("Program Files", [
			winFolder("nodejs", [winFile("node.exe", "72M", "可执行")]),
			winFolder("Git", [
				winFolder("bin", [winFile("git.exe", "5.4M", "可执行")]),
			]),
		]),
		winFolder("Windows", [
			winFolder("System32", [winFile("kernel32.dll", "1.2M", "系统")]),
			winFolder("Temp", []),
		]),
		winFolder("ProgramData", [winFolder("npm-cache", [])]),
	];
}

// Windows 数据盘（D:/E: …）
function winDataTree(disk: DiskInfo): FileNode[] {
	const label = disk.label ?? "数据";
	return [
		winFolder("Projects", [
			projectSubtree("OptiMinder"),
			projectSubtree("gateway"),
			projectSubtree("analytics"),
		]),
		winFolder("Backups", [
			archiveFile(`${label}-2026-06.tar.gz`, "4.2G"),
			archiveFile(`${label}-2026-05.tar.gz`, "3.8G"),
		]),
		winFolder("Archives", [archiveFile("old-projects.zip", "820M")]),
		winFolder("VMImages", [winFile("ubuntu.vhdx", "32G", "虚拟磁盘")]),
		winFile("pagefile.sys", "8G", "系统"),
	];
}

// Linux 根分区（/）
function linuxRootTree(): FileNode[] {
	return [
		folder("etc", [
			folder("nginx", [
				confFile("nginx.conf", "2.1K"),
				confFile("sites-enabled", "-"),
			]),
			folder("systemd", [confFile("system.conf", "1.0K")]),
			confFile("hostname", "12B"),
			confFile("hosts", "0.2K"),
			confFile("passwd", "3.4K"),
		]),
		folder("var", [
			folder("log", [
				logFile("syslog", "18M"),
				logFile("auth.log", "4.2M"),
				logFile("app.log", "82M"),
			]),
			folder("lib", [folder("docker", [])]),
			folder("cache", []),
		]),
		folder("home", [
			folder("admin", [
				folder("Projects", [
					projectSubtree("OptiMinder"),
					projectSubtree("gateway"),
				]),
				confFile(".bashrc", "0.4K"),
				folder(".ssh", [confFile("authorized_keys", "0.2K")]),
			]),
		]),
		folder("usr", [folder("bin", []), folder("lib", []), folder("local", [])]),
		folder("opt", [folder("app", [jsonFile("config.json", "0.8K")])]),
		folder("tmp", []),
	];
}

// Linux 数据分区（/data /var/lib …）
function linuxDataTree(disk: DiskInfo): FileNode[] {
	return [
		folder("data", [
			folder("db", [winFile("postgres.dump", "12G", "数据库")]),
			folder("cache", [winFile("redis.rdb", "640M", "数据库")]),
		]),
		folder("backups", [
			archiveFile(
				`backup-${disk.mount.replace(/\//g, "_")}-daily.tar.gz`,
				"2.4G",
			),
		]),
		folder("logs", [logFile("app.log", "320M"), logFile("error.log", "48M")]),
	];
}

// Linux home 分区（/home）
function linuxHomeTree(): FileNode[] {
	return [
		folder("admin", [
			folder("Projects", [
				projectSubtree("OptiMinder"),
				projectSubtree("gateway"),
				projectSubtree("analytics"),
			]),
			confFile(".bashrc", "0.4K"),
			folder(".ssh", [confFile("authorized_keys", "0.2K")]),
			folder("Documents", [mdFile("TODO.md", "1.2K")]),
		]),
		folder("shared", [
			folder("releases", [archiveFile("release-2026-06.zip", "240M")]),
		]),
	];
}

// macOS 系统盘
function macSystemTree(): FileNode[] {
	return [
		winFolder("Applications", [
			winFolder("Xcode.app", []),
			winFolder("Visual Studio Code.app", []),
		]),
		winFolder("Users", [
			winFolder("admin", [
				winFolder("Desktop", []),
				winFolder("Documents", []),
				winFolder("Downloads", [archiveFile("dmg-installer.dmg", "180M")]),
				winFolder("Projects", [projectSubtree("OptiMinder")]),
			]),
		]),
		winFolder("Library", [winFolder("Caches", [])]),
		winFolder("System", []),
	];
}

// 入口：根据磁盘 + OS 生成该磁盘根目录下的子节点
export function buildFileTree(disk: DiskInfo, os: string): FileNode[] {
	if (os.includes("Windows")) {
		return disk.system ? winSystemTree() : winDataTree(disk);
	}
	if (os.includes("macOS") || os.includes("Mac")) {
		return macSystemTree();
	}
	// Linux：按挂载点判断
	if (disk.system || disk.mount === "/") return linuxRootTree();
	if (disk.mount === "/home" || disk.mount.startsWith("/home"))
		return linuxHomeTree();
	return linuxDataTree(disk);
}

export const frpMappings = [
	{
		id: "f-01",
		name: "PostgreSQL-5432",
		desc: "数据库访问",
		machine: "linux-db-02",
		ip: "10.0.0.102",
		protocol: "TCP",
		local: "5432",
		public: "tcp://frp.example.com:15432",
		created: "10:00",
		status: "活跃",
	},
	{
		id: "f-02",
		name: "App-Debug-3000",
		desc: "前端调试",
		machine: "win-dev-01",
		ip: "10.0.0.101",
		protocol: "TCP",
		local: "3000",
		public: "tcp://frp.example.com:13000",
		created: "09:00",
		status: "活跃",
	},
	{
		id: "f-03",
		name: "RDP-3389",
		desc: "远程桌面",
		machine: "gpu-work-01",
		ip: "10.0.0.104",
		protocol: "TCP",
		local: "3389",
		public: "tcp://frp.example.com:18080",
		created: "昨天",
		status: "已关闭",
	},
	{
		id: "f-04",
		name: "MinIO-9001",
		desc: "对象存储控制台",
		machine: "linux-db-02",
		ip: "10.0.0.102",
		protocol: "TCP",
		local: "9001",
		public: "tcp://frp.example.com:19001",
		created: "2 天前",
		status: "活跃",
	},
];

export const releases = [
	{
		version: "v1.2.0",
		channel: "stable",
		status: "已发布",
		type: "client",
		time: "2026-06-15",
		artifacts: 6,
	},
	{
		version: "v1.1.5",
		channel: "stable",
		status: "已发布",
		type: "client",
		time: "2026-06-01",
		artifacts: 6,
	},
	{
		version: "v1.1.0",
		channel: "beta",
		status: "已完成",
		type: "client",
		time: "2026-05-20",
		artifacts: 6,
	},
	{
		version: "v1.0.0",
		channel: "stable",
		status: "已发布",
		type: "server",
		time: "2026-05-01",
		artifacts: 4,
	},
];

export const installTokens = [
	{
		name: "tok_01",
		tag: "dev",
		os: "Windows",
		expire: "24h",
		usage: "2 / 10",
		status: "有效",
	},
	{
		name: "tok_02",
		tag: "prod",
		os: "Linux",
		expire: "—",
		usage: "5 / 5",
		status: "已用完",
	},
	{
		name: "tok_03",
		tag: "test",
		os: "Windows",
		expire: "12h",
		usage: "0 / 3",
		status: "有效",
	},
];

export const auditRows = [
	{
		time: "10:03:12",
		source: "cli",
		action: "bash",
		object: "win-dev-01",
		risk: "中" as RiskLevel,
		result: "通过",
		ip: "—",
	},
	{
		time: "10:04:08",
		source: "cli",
		action: "file_edit",
		object: "a.ts",
		risk: "低" as RiskLevel,
		result: "通过",
		ip: "—",
	},
	{
		time: "09:40:55",
		source: "web",
		action: "install",
		object: "linux-db-02",
		risk: "高" as RiskLevel,
		result: "待确认",
		ip: "—",
	},
	{
		time: "09:30:21",
		source: "skill",
		action: "pi.run",
		object: "win-dev-01",
		risk: "中" as RiskLevel,
		result: "通过",
		ip: "—",
	},
	{
		time: "09:12:08",
		source: "web",
		action: "frp.open",
		object: "f-02",
		risk: "中" as RiskLevel,
		result: "通过",
		ip: "—",
	},
];

// ---------- 新增：Pi 交互式终端 ----------

export type PiMsg =
	| { kind: "user"; text: string }
	| { kind: "assistant"; text: string }
	| { kind: "thinking"; preview: string }
	| { kind: "tool"; tool: string; cmd: string; out: string; dur: string }
	| { kind: "markdown"; text: string; list?: string[] }
	| { kind: "turnend"; summary: string };

export const piConversation: PiMsg[] = [
	{ kind: "user", text: "把 src 下所有 .ts 文件列出来" },
	{ kind: "thinking", preview: "正在分析目录结构…" },
	{ kind: "assistant", text: "我来读取目录：" },
	{
		kind: "tool",
		tool: "bash",
		cmd: "ls src/**/*.ts",
		out: "src/a.ts  src/b.ts  src/c.ts",
		dur: "1.2s",
	},
	{
		kind: "markdown",
		text: "共 3 个 TypeScript 文件：",
		list: ["a.ts  导出工具函数", "b.ts  数据模型", "c.ts  入口文件"],
	},
	{ kind: "turnend", summary: "1 turn · 1.2s · 840 tokens" },
];

export const piSessions = [
	{
		id: "s1",
		name: "修复依赖",
		preview: "列出 src 下 ts 文件",
		time: "5 分钟前",
	},
	{ id: "s2", name: "清理日志", preview: "删除旧日志文件", time: "2 小时前" },
	{ id: "s3", name: "部署脚本", preview: "生成 deploy.sh", time: "昨天" },
	{ id: "s4", name: "重构配置", preview: "拆分 config 文件", time: "2 天前" },
];

// ---------- 新增：命令控制台 ----------
export const commandHistory = [
	{ cmd: "npm install", out: "added 312 packages in 18s", code: 0 },
	{
		cmd: "git status",
		out: "On branch main\nnothing to commit, working tree clean",
		code: 0,
	},
	{ cmd: "node -v", out: "v24.15.0", code: 0 },
];

// ---------- 新增：云盘 ----------
export type TransferDirection = "import" | "export";
export type TransferMode = "aliyundrive" | "frps_chunked";
export type TransferStatus =
	| "created"
	| "waiting_cli_upload"
	| "cli_uploading"
	| "aliyun_uploaded"
	| "waiting_client_download"
	| "client_downloading"
	| "completed"
	| "failed"
	| "cancelled";

export interface TransferJob {
	id: string;
	clientId: string;
	clientHost: string;
	rootId: string;
	targetDir: string;
	filename: string;
	size: number;
	direction: TransferDirection;
	mode: TransferMode;
	status: TransferStatus;
	uploadedBytes: number;
	downloadedBytes: number;
	totalBytes: number;
	errorMessage?: string;
	createdAt: number;
	updatedAt: number;
	completedAt?: number;
	cleanupAfterAt?: number;
}

export interface AliyunDriveStatus {
	configured: boolean;
	authorized: boolean;
	authorizationState: "unauthorized" | "expired" | "authorized";
	clientId?: string;
	scope?: string;
	openapiBase?: string;
	redirectUri?: string;
	transferFolder?: string;
	cleanupTtlMs?: number;
	expiresAt?: number;
	driveId?: string;
	authorizedAccountName?: string;
}

export const aliyunDriveStatus: AliyunDriveStatus = {
	configured: true,
	authorized: true,
	authorizationState: "authorized",
	clientId: "ali_drive_app_xxxx",
	scope: "user:base,file:all:read,file:all:write",
	openapiBase: "https://openapi.alipan.com",
	transferFolder: "NoesisTransfers",
	cleanupTtlMs: 86400000,
	expiresAt: Date.now() + 5 * 24 * 3600 * 1000,
	driveId: "201903011",
	authorizedAccountName: "运维云盘",
};

export const transferJobs: TransferJob[] = [
	{
		id: "tr_a1b2c3",
		clientId: "linux-build-05",
		clientHost: "build-05",
		rootId: "root-0",
		targetDir: "/opt/projects",
		filename: "bundle.tar",
		size: 1288490188,
		direction: "import",
		mode: "aliyundrive",
		status: "completed",
		uploadedBytes: 1288490188,
		downloadedBytes: 1288490188,
		totalBytes: 1288490188,
		createdAt: Date.now() - 86400000 * 2,
		updatedAt: Date.now() - 86400000 * 2 + 3600000,
		completedAt: Date.now() - 86400000 * 2 + 3600000,
		cleanupAfterAt: Date.now() - 86400000 + 3600000,
	},
	{
		id: "tr_d4e5f6",
		clientId: "linux-prod-db-06",
		clientHost: "prod-db-06",
		rootId: "root-1",
		targetDir: "/var/backups",
		filename: "db-backup.sql.gz",
		size: 2254857830,
		direction: "export",
		mode: "aliyundrive",
		status: "cli_uploading",
		uploadedBytes: 1127228915,
		downloadedBytes: 0,
		totalBytes: 2254857830,
		createdAt: Date.now() - 1800000,
		updatedAt: Date.now() - 60000,
	},
	{
		id: "tr_g7h8i9",
		clientId: "win-dev-01",
		clientHost: "win-dev-01",
		rootId: "root-0",
		targetDir: "D:\\Projects",
		filename: "analytics-v2.zip",
		size: 503316480,
		direction: "import",
		mode: "aliyundrive",
		status: "waiting_client_download",
		uploadedBytes: 503316480,
		downloadedBytes: 0,
		totalBytes: 503316480,
		createdAt: Date.now() - 900000,
		updatedAt: Date.now() - 120000,
	},
	{
		id: "tr_j0k1l2",
		clientId: "linux-log-11",
		clientHost: "log-11",
		rootId: "root-1",
		targetDir: "/var/log",
		filename: "logs.zip",
		size: 503316480,
		direction: "export",
		mode: "aliyundrive",
		status: "completed",
		uploadedBytes: 503316480,
		downloadedBytes: 0,
		totalBytes: 503316480,
		createdAt: Date.now() - 86400000 * 3,
		updatedAt: Date.now() - 86400000 * 3 + 1800000,
		completedAt: Date.now() - 86400000 * 3 + 1800000,
		cleanupAfterAt: Date.now() - 86400000 * 2 + 1800000,
	},
	{
		id: "tr_m3n4o5",
		clientId: "win-ci-03",
		clientHost: "ci-03",
		rootId: "root-0",
		targetDir: "C:\\Build",
		filename: "release-v1.3.0.zip",
		size: 104857600,
		direction: "import",
		mode: "aliyundrive",
		status: "failed",
		uploadedBytes: 0,
		downloadedBytes: 0,
		totalBytes: 104857600,
		errorMessage: "Client 离线，无法分发下载任务",
		createdAt: Date.now() - 7200000,
		updatedAt: Date.now() - 7000000,
	},
	{
		id: "tr_p6q7r8",
		clientId: "linux-ai-13",
		clientHost: "ai-13",
		rootId: "root-2",
		targetDir: "/data/models",
		filename: "llm-7b-q4.gguf",
		size: 4294967296,
		direction: "import",
		mode: "aliyundrive",
		status: "client_downloading",
		uploadedBytes: 4294967296,
		downloadedBytes: 3221225472,
		totalBytes: 4294967296,
		createdAt: Date.now() - 3600000,
		updatedAt: Date.now() - 30000,
	},
];

export const cloudFiles = [];

// ---------- Runbook（TS 即 DSL 的流程编排）----------
// 单脚本/pi 任务没意义，跨机器的流程编排才有意义。
// Runbook = 一段 TS 脚本，import 能力函数（cmd/pi/file/approve…）组织跨机器流程。
// 能力函数是可观测、受策略约束、可挂起的步骤单元，每次调用对应一个 Task。
// 扩展新能力（机器能力加到 MachineDsl，全局能力加到 RunbookDsl 上的 cloud/todo/machines 命名空间），编排脚本立即可用。
//
// 编排脚本是真实的 .ts 文件（src/runbooks/*.ts），用 Vite ?raw 导入原文展示。
import r1Code from "./runbooks/r1.ts?raw";
import r2Code from "./runbooks/r2.ts?raw";
import r3Code from "./runbooks/r3.ts?raw";
import r4Code from "./runbooks/r4.ts?raw";
import r5Code from "./runbooks/r5.ts?raw";
import r6Code from "./runbooks/r6.ts?raw";
import r7Code from "./runbooks/r7.ts?raw";

export type OsTag = "linux" | "win" | "mac";

export interface RunbookParam {
	name: string;
	type: "string" | "path" | "int" | "bool";
	default?: string;
	required: boolean;
	hint?: string;
}

export interface RunbookExecRecord {
	status: "成功" | "失败" | "运行中" | "已确认";
	at: string;
	dur: string;
	// 已完成的能力调用数 / 总调用数
	doneCalls: number;
	totalCalls: number;
}

export interface Runbook {
	id: string;
	name: string;
	desc: string;
	code: string; // TS 编排脚本原文（展示 + 运行）
	params: RunbookParam[]; // 流程级参数，脚本里 {参数名} 引用
	dangerousOverride: boolean;
	updated: string;
	lastExec?: RunbookExecRecord;
}

// 扫描脚本原文中引用的机器 id（原型用，足够展示涉及机器）
// ponytail: 字符串扫描，真实实现由运行时记录实际调用
export function runbookMachines(rb: Runbook): string[] {
	return machines.filter((m) => rb.code.includes(`"${m.id}"`)).map((m) => m.id);
}

// 扫描脚本原文中使用的能力函数及次数（展示用）
export function runbookCapabilities(
	rb: Runbook,
): { cap: string; count: number }[] {
	const caps = [
		"cmd",
		"pi",
		"approve",
		"file.read",
		"file.write",
		"file.move",
		"file.delete",
		"log",
		"sleep",
		"cloud.copyAcross",
		"cloud.backup",
		"todo.create",
		"todo.list",
		"machines.list",
	];
	const out: { cap: string; count: number }[] = [];
	for (const cap of caps) {
		const re = new RegExp(`\\b${cap.replace(/\./g, "\\.")}\\(`, "g");
		const m = rb.code.match(re);
		if (m) out.push({ cap, count: m.length });
	}
	return out;
}

export const runbooks: Runbook[] = [
	{
		id: "r1",
		name: "全栈发布流水线",
		desc: "构建机拉代码构建 → 打包 → 下发到 DB 机停服/替换/启服 → Pi 验证健康",
		code: r1Code,
		params: [
			{ name: "项目目录", type: "path", required: true, hint: "构建机项目根" },
			{
				name: "服务名",
				type: "string",
				required: true,
				hint: "systemd 服务名",
			},
		],
		dangerousOverride: true,
		updated: "2 天前",
		lastExec: {
			status: "成功",
			at: "2 天前",
			dur: "3m12s",
			doneCalls: 6,
			totalCalls: 6,
		},
	},
	{
		id: "r2",
		name: "故障应急诊断流",
		desc: "Pi 诊断数据库 → Pi 分析应用日志归因 → 人工确认后执行修复",
		code: r2Code,
		params: [
			{ name: "时间段", type: "string", default: "最近 30min", required: true },
			{ name: "服务名", type: "string", required: true },
		],
		dangerousOverride: true,
		updated: "5 天前",
		lastExec: {
			status: "已确认",
			at: "5 天前",
			dur: "2m08s",
			doneCalls: 3,
			totalCalls: 4,
		},
	},
	{
		id: "r3",
		name: "GPU 集群健康巡检",
		desc: "并行对 3 台 GPU 机器跑 Pi 诊断 → 汇总集群健康度报告",
		code: r3Code,
		params: [],
		dangerousOverride: false,
		updated: "3 天前",
		lastExec: {
			status: "成功",
			at: "3 天前",
			dur: "4m20s",
			doneCalls: 4,
			totalCalls: 4,
		},
	},
	{
		id: "r4",
		name: "依赖升级评估与执行",
		desc: "Pi 评估升级风险 → 人工确认后升级安全补丁 → Pi 回归验证",
		code: r4Code,
		params: [
			{ name: "项目目录", type: "path", required: true },
			{
				name: "补丁包",
				type: "string",
				required: true,
				hint: "npm update 目标包",
			},
		],
		dangerousOverride: false,
		updated: "1 周前",
	},
	{
		id: "r5",
		name: "多机日志归档",
		desc: "并行打包 Linux/Windows 日志 → 汇聚到 Linux 归档到云盘",
		code: r5Code,
		params: [
			{ name: "日志目录", type: "path", required: true },
			{
				name: "云盘路径",
				type: "string",
				required: true,
				hint: "rclone remote:path",
			},
		],
		dangerousOverride: false,
		updated: "1 周前",
	},
	{
		id: "r6",
		name: "跨机安全漏洞扫描",
		desc: "并行对 Linux/Windows 跑 Pi CVE 扫描 → 汇总按严重度排序的修复清单",
		code: r6Code,
		params: [],
		dangerousOverride: false,
		updated: "2 周前",
	},
	{
		id: "r7",
		name: "DB 机组配置备份与同步",
		desc: "动态选 db 机组 → file 读配置 → cloud 经云盘汇聚备份 → 确认 → 下发新配置 → 记待办",
		code: r7Code,
		params: [
			{
				name: "配置路径",
				type: "path",
				required: true,
				hint: "如 /etc/mysql/my.cnf",
			},
			{
				name: "新配置内容",
				type: "string",
				required: true,
				hint: "下发的配置正文",
			},
		],
		dangerousOverride: true,
		updated: "3 天前",
		lastExec: {
			status: "成功",
			at: "3 天前",
			dur: "48s",
			doneCalls: 9,
			totalCalls: 10,
		},
	},
];

// ---------- 新增：机器日志 ----------
export const machineLogs = [
	"[INFO] 10:24:31 client heartbeat ok",
	"[INFO] 10:24:21 pi rpc idle",
	"[WARN] 10:23:55 frp mapping f-02 will expire in 3m",
	"[INFO] 10:23:41 task_088 command completed exit=0",
	"[ERROR] 10:21:09 pi task_081 failed: command timeout",
	"[INFO] 10:20:00 client started v1.2.0",
];

// ---------- 新增：Pi 工作台事件流 ----------
export type PiRunTaskStatus = "running" | "completed" | "failed" | "canceled";
export interface PiRunTask {
	id: string;
	goal: string;
	model: string;
	status: PiRunTaskStatus;
	startedAt: string;
	durationSec: number;
	tokens: number;
	changes: number;
}

export const piRunTasks: PiRunTask[] = [
	{
		id: "pir_2401ab",
		goal: "修复 package.json 依赖冲突",
		model: "claude-4",
		status: "running",
		startedAt: "10:01",
		durationSec: 0,
		tokens: 0,
		changes: 0,
	},
	{
		id: "pir_2390fe",
		goal: "清理旧日志文件",
		model: "claude-4",
		status: "completed",
		startedAt: "昨天 16:30",
		durationSec: 142,
		tokens: 840,
		changes: 2,
	},
	{
		id: "pir_2387cc",
		goal: "生成部署脚本 deploy.sh",
		model: "claude-4",
		status: "completed",
		startedAt: "昨天 14:12",
		durationSec: 218,
		tokens: 1240,
		changes: 1,
	},
	{
		id: "pir_2371dd",
		goal: "拆分 config 单体文件",
		model: "claude-4",
		status: "failed",
		startedAt: "2 天前",
		durationSec: 56,
		tokens: 320,
		changes: 0,
	},
];

export const piRunEvents = [
	{ time: "10:01", icon: "●", title: "prompt 已发送", tone: "blue" },
	{ time: "10:02", icon: "▾", title: "thinking …", tone: "gray" },
	{
		time: "10:03",
		icon: "🔧",
		title: "bash: npm install  1.2s",
		tone: "blue",
		detail: "added 312 packages",
	},
	{ time: "10:05", icon: "✎", title: "file_edit: a.ts", tone: "orange" },
	{ time: "10:08", icon: "🏁", title: "agent_end", tone: "green" },
];

export const piRunChanges = [
	{ name: "src/a.ts", status: "修改", plus: "+3", minus: "-12" },
	{ name: "src/b.ts", status: "新增", plus: "+18", minus: "-2" },
	{ name: "src/c.ts", status: "删除", plus: "+0", minus: "-40" },
];

export const piRunCommands = [
	"npm install",
	"git status",
	"node -v",
	"npm run build",
	"npm test",
];

// ---------- Pi Provider Profile ----------
export type ApiType =
	| "openai-completions"
	| "openai-responses"
	| "anthropic-messages"
	| "google-generative-ai";

export type KeySource = "encrypted" | "env" | "none";

export interface ProfileModel {
	id: string;
	name: string;
	reasoning: boolean;
	image: boolean;
	contextWindow: number;
	maxTokens: number;
}

export interface ProviderProfile {
	id: string;
	scope: "global" | "machine";
	machineId?: string;
	name: string;
	providerKey: string;
	baseUrl: string | null;
	apiType: ApiType;
	keySource: KeySource;
	apiKeyPreview: string;
	apiKeyEnvRef?: string;
	models: ProfileModel[];
	isDefault: boolean;
}

export const apiTypeLabels: Record<ApiType, string> = {
	"openai-completions": "OpenAI Completions",
	"openai-responses": "OpenAI Responses",
	"anthropic-messages": "Anthropic Messages",
	"google-generative-ai": "Google Generative AI",
};

export const providerProfiles: ProviderProfile[] = [
	{
		id: "profile_001",
		scope: "global",
		name: "Anthropic 官方",
		providerKey: "anthropic",
		baseUrl: null,
		apiType: "anthropic-messages",
		keySource: "encrypted",
		apiKeyPreview: "sk-ant-••••••••••••",
		models: [
			{
				id: "claude-sonnet-4-20250514",
				name: "Sonnet 4",
				reasoning: true,
				image: true,
				contextWindow: 200000,
				maxTokens: 16384,
			},
			{
				id: "claude-opus-4-20250514",
				name: "Opus 4",
				reasoning: true,
				image: true,
				contextWindow: 200000,
				maxTokens: 16384,
			},
		],
		isDefault: true,
	},
	{
		id: "profile_002",
		scope: "global",
		name: "公司代理",
		providerKey: "my-custom",
		baseUrl: "https://proxy.corp.com/v1",
		apiType: "openai-completions",
		keySource: "env",
		apiKeyPreview: "",
		apiKeyEnvRef: "$CORP_API_KEY",
		models: [
			{
				id: "claude-sonnet-4",
				name: "Sonnet 4 (代理)",
				reasoning: true,
				image: true,
				contextWindow: 200000,
				maxTokens: 16384,
			},
			{
				id: "gpt-4o",
				name: "GPT-4o",
				reasoning: false,
				image: true,
				contextWindow: 128000,
				maxTokens: 16384,
			},
		],
		isDefault: false,
	},
	{
		id: "profile_003",
		scope: "global",
		name: "本地 Ollama",
		providerKey: "ollama",
		baseUrl: "http://localhost:11434/v1",
		apiType: "openai-completions",
		keySource: "none",
		apiKeyPreview: "",
		models: [
			{
				id: "llama3.1:8b",
				name: "Llama 3.1 8B",
				reasoning: false,
				image: false,
				contextWindow: 128000,
				maxTokens: 32000,
			},
		],
		isDefault: false,
	},
];

// ---------- Browser / Computer 自动化资产 ----------
export type AutomationKind = "browser" | "computer" | "mixed";
export type AutomationOutcome = "success" | "failed" | "needs_review";

export interface AutomationMacro {
	id: string;
	kind: "browser" | "computer";
	name: string;
	version: number;
	scope: string;
	successRate: string;
	lastRun: string;
	status: "活跃" | "停用";
	steps: string[];
}

export interface AutomationMacroCandidate {
	id: string;
	kind: "browser" | "computer";
	name: string;
	fromTask: string;
	reason: string;
	confidence: string;
	createdAt: string;
}

export interface AutomationReport {
	taskId: string;
	kind: AutomationKind;
	machineId: string;
	outcome: AutomationOutcome;
	confidence: string;
	summary: string;
	macro?: string;
	fallbacks: string[];
	steps: { engine: string; action: string; target: string; result: string }[];
	evidence: string[];
	artifacts: string[];
	manualInterventions: string[];
}

export const automationMacros: AutomationMacro[] = [
	{
		id: "am_export_daily_report",
		kind: "browser",
		name: "导出日报",
		version: 3,
		scope: "Chrome · internal-report.example.com · finance-desktop",
		successRate: "92%",
		lastRun: "2m 前",
		status: "活跃",
		steps: ["打开报表页", "点击导出", "等待下载"],
	},
	{
		id: "am_desktop_music",
		kind: "computer",
		name: "桌面音乐播放",
		version: 1,
		scope: "Windows · 网易云音乐 · dedicatedDesktop",
		successRate: "78%",
		lastRun: "1h 前",
		status: "活跃",
		steps: ["识别窗口", "点击我喜欢", "播放"],
	},
];

export const automationMacroCandidates: AutomationMacroCandidate[] = [
	{
		id: "cand_004",
		kind: "computer",
		name: "导出日报 v4 候选",
		fromTask: "task_124",
		reason: "按钮文案从「导出」变为「下载 Excel」，VLM 修复成功。",
		confidence: "0.86",
		createdAt: "1m 前",
	},
	{
		id: "cand_003",
		kind: "browser",
		name: "登录后关闭公告",
		fromTask: "task_123",
		reason: "首次进入后台会弹公告，加入关闭步骤可减少一次 VLM 调用。",
		confidence: "0.91",
		createdAt: "2m 前",
	},
];

export const automationReports: AutomationReport[] = [
	{
		taskId: "task_123",
		kind: "browser",
		machineId: "win-dev-01",
		outcome: "success",
		confidence: "0.94",
		summary: "已通过 Browser Use 导出今天日报，文件保存在下载目录。",
		macro: "导出日报 v3",
		fallbacks: [],
		steps: [
			{
				engine: "browserUse",
				action: "click",
				target: "button[name=导出]",
				result: "success",
			},
			{
				engine: "browserUse",
				action: "waitForDownload",
				target: "daily-report.xlsx",
				result: "success",
			},
		],
		evidence: ["download event observed", "文件 sha256 已计算"],
		artifacts: ["C:/Users/me/Downloads/daily-report.xlsx"],
		manualInterventions: [],
	},
	{
		taskId: "task_124",
		kind: "mixed",
		machineId: "win-dev-01",
		outcome: "needs_review",
		confidence: "0.71",
		summary:
			"Computer Use 完成导出，但第 5 步由 VLM 修复，建议复核报告后采纳候选宏。",
		macro: "导出日报 v3",
		fallbacks: [
			"browserUse profile busy -> computerUse",
			"step 5 recovered_by_vlm",
		],
		steps: [
			{
				engine: "computerUse",
				action: "clickText",
				target: "报表",
				result: "success",
			},
			{
				engine: "computerUse",
				action: "clickText",
				target: "下载 Excel",
				result: "recovered_by_vlm",
			},
		],
		evidence: ["截图显示下载完成", "文件存在但页面未出现明确成功文案"],
		artifacts: ["C:/Users/me/Downloads/report.xlsx"],
		manualInterventions: ["WebRTC 旁观 38s，未接管"],
	},
];

// ---------- Todo / Context / Tag 协作 ----------
export type TodoStatus =
	| "todo"
	| "doing"
	| "awaiting_confirmation"
	| "done"
	| "failed";

export interface TodoTag {
	id: string;
	name: string;
	archived?: boolean;
}

export interface TodoContextPack {
	id: string;
	name: string;
	machineIds: string[];
	markdown: string;
	updatedAt: string;
	todoCount: number;
	archived?: boolean;
}

export interface TodoMock {
	id: string;
	parentId?: string | null;
	title: string;
	description: string;
	due?: string | null;
	priority: number;
	contextId?: string | null;
	ready?: boolean | null;
	status: TodoStatus;
	assignee?: "me" | "vcp" | `vcp:${string}` | null;
	resultSummary?: string | null;
	tagIds: string[];
	taskIds: string[];
	audit: string[];
	updatedAt: string;
	archived?: boolean;
}

export const todoTags: TodoTag[] = [
	{ id: "tag_vcp", name: "VCP" },
	{ id: "tag_frontend", name: "前端" },
	{ id: "tag_ops", name: "运维" },
	{ id: "tag_db", name: "数据库" },
	{ id: "tag_release", name: "发布" },
	{ id: "tag_old", name: "已归档标签", archived: true },
];

export const todoContexts: TodoContextPack[] = [
	{
		id: "ctx_vcp",
		name: "VCPToolBox 插件开发",
		machineIds: ["win-dev-01"],
		markdown:
			"## 目标\n修复 VCP 插件与 Gateway SDK 的协作体验。\n\n## 路径\n- repo: D:/work/vcp-toolbox\n- gateway sdk: packages/sdk\n\n## 验证\n运行插件热重载 demo，并检查 X-Noesis-Actor 是否落为 vcp:<agentName>。",
		updatedAt: "5m 前",
		todoCount: 3,
	},
	{
		id: "ctx_db_ops",
		name: "DB 运维窗口",
		machineIds: ["linux-db-02"],
		markdown:
			"## 维护窗口\n22:00-23:00 可执行低风险变更。\n\n## 注意\n所有 systemctl restart 需要先走审批；完成后观察业务指标 30 分钟。",
		updatedAt: "18m 前",
		todoCount: 2,
	},
	{
		id: "ctx_release",
		name: "Noesis 发布检查",
		machineIds: ["win-dev-01", "linux-db-02"],
		markdown:
			"## 发布前\n确认 Runbook dry-run、StorageProvider 授权、审批中心无未决高风险项。\n\n## 发布后\n记录 linked tasks 和 audit 摘要。",
		updatedAt: "1h 前",
		todoCount: 2,
	},
	{
		id: "ctx_old_pi",
		name: "旧 Pi 迁移上下文",
		machineIds: [],
		markdown: "已归档，仅供历史 Todo 查看。",
		updatedAt: "2d 前",
		todoCount: 1,
		archived: true,
	},
];

const seedTodos: TodoMock[] = [
	{
		id: "todo_vcp_hot_reload",
		parentId: null,
		title: "修复 VCP 插件配置热重载",
		description:
			"复现配置保存后 AgentAssistant 未刷新，修复并验证 actor 审计头。",
		due: "今日",
		priority: 3,
		contextId: "ctx_vcp",
		ready: true,
		status: "doing",
		assignee: "vcp:诺娃",
		resultSummary: null,
		tagIds: ["tag_vcp", "tag_frontend"],
		taskIds: ["task_123"],
		audit: ["5m 前 vcp:诺娃 claim", "4m 前 task_123 linked"],
		updatedAt: "4m 前",
	},
	{
		id: "todo_release_check",
		parentId: null,
		title: "发布前检查 Noesis 控制台",
		description:
			"按发布上下文检查 build、审批中心、云盘授权和 Runbook dry-run。",
		due: "明日",
		priority: 2,
		contextId: "ctx_release",
		ready: null,
		status: "awaiting_confirmation",
		assignee: "vcp:可可",
		resultSummary: "VCP 已完成 build 和 dry-run；等待用户确认是否进入 done。",
		tagIds: ["tag_release", "tag_ops"],
		taskIds: ["task_088", "task_123"],
		audit: [
			"40m 前 web 创建",
			"8m 前 vcp:可可 report done",
			"8m 前 父级进入待确认",
		],
		updatedAt: "8m 前",
	},
	{
		id: "todo_db_sync_parent",
		parentId: null,
		title: "同步 DB 机组配置并观察指标",
		description: "容器 Todo：子任务完成后统一由用户终判。",
		due: "本周",
		priority: 2,
		contextId: "ctx_db_ops",
		ready: null,
		status: "doing",
		assignee: null,
		resultSummary: null,
		tagIds: ["tag_db", "tag_ops"],
		taskIds: [],
		audit: ["1h 前 runbook 创建", "20m 前 子任务进入 doing"],
		updatedAt: "20m 前",
	},
	{
		id: "todo_db_backup",
		parentId: "todo_db_sync_parent",
		title: "备份 DB 配置",
		description: "读取 /etc/mysql 并备份到 StorageProvider。",
		due: "今日",
		priority: 2,
		contextId: null,
		ready: true,
		status: "done",
		assignee: "vcp:诺娃",
		resultSummary: "已备份 mysql 配置，产物在阿里云盘 transferFolder。",
		tagIds: ["tag_db"],
		taskIds: ["task_086"],
		audit: ["35m 前 vcp:诺娃 claim", "25m 前 report done"],
		updatedAt: "25m 前",
	},
	{
		id: "todo_db_reload",
		parentId: "todo_db_sync_parent",
		title: "重载 DB 配置",
		description: "应用配置变更；需要审批后执行 systemctl reload mysql。",
		due: "今日",
		priority: 3,
		contextId: null,
		ready: true,
		status: "doing",
		assignee: "vcp:诺娃",
		resultSummary: null,
		tagIds: ["tag_db", "tag_ops"],
		taskIds: ["task_085"],
		audit: ["20m 前 vcp:诺娃 claim", "19m 前 task_085 等待审批"],
		updatedAt: "19m 前",
	},
	{
		id: "todo_docs_cleanup",
		parentId: null,
		title: "整理旧 Pi 迁移文档",
		description: "引用了已归档 Context，不能再被 VCP claim。",
		due: null,
		priority: 0,
		contextId: "ctx_old_pi",
		ready: true,
		status: "todo",
		assignee: null,
		resultSummary: null,
		tagIds: ["tag_old"],
		taskIds: [],
		audit: ["2d 前 web 创建", "1d 前 ctx_old_pi archived"],
		updatedAt: "1d 前",
	},
];

const bulkTodos: TodoMock[] = Array.from({ length: 74 }, (_, i) => {
	const n = i + 1;
	const contexts = ["ctx_vcp", "ctx_db_ops", "ctx_release"];
	const tags = ["tag_vcp", "tag_frontend", "tag_ops", "tag_db", "tag_release"];
	const statusCycle: TodoStatus[] = ["todo", "todo", "doing", "done", "failed"];
	const status = statusCycle[i % statusCycle.length];
	return {
		id: `todo_bulk_${String(n).padStart(3, "0")}`,
		parentId: null,
		title: `批量待办样例 ${String(n).padStart(3, "0")}`,
		description: "用于验证 Todo 很多时的队列、筛选和分页展示效果。",
		due: n % 4 === 0 ? "本周" : n % 3 === 0 ? "明日" : "今日",
		priority: n % 5,
		contextId: contexts[i % contexts.length],
		ready: status === "todo" ? n % 3 !== 0 : status === "done",
		status,
		assignee: status === "doing" ? `vcp:${n % 2 ? "诺娃" : "可可"}` : null,
		resultSummary: status === "done" ? "批量样例已完成。" : null,
		tagIds: [tags[i % tags.length]],
		taskIds: status === "done" ? ["task_088"] : [],
		audit: [
			`${n}m 前 mock 创建`,
			status === "doing" ? `${n - 1}m 前 VCP claim` : "等待处理",
		],
		updatedAt: `${n}m 前`,
	};
});

export const todos: TodoMock[] = [...seedTodos, ...bulkTodos];

// ---------- 路由 ----------
export type Route =
	| { page: "dashboard" }
	| { page: "machines" }
	| { page: "machine-detail"; machineId: string; tab: string }
	| { page: "tasks" }
	| { page: "task-detail"; taskId: string }
	| { page: "todos" }
	| { page: "contexts" }
	| { page: "releases" }
	| { page: "install" }
	| { page: "storage" }
	| { page: "audit" }
	| { page: "runbooks" }
	| { page: "automation" }
	| { page: "approvals" }
	| { page: "settings" };
