// Runbook DSL —— 流程编排的能力原语。
//
// 编排脚本是 TS，import 能力函数组织跨机器流程。
// 每次能力调用 = 一个可观测、受策略约束、可挂起（approve）的步骤，对应一个 Task。
// 能力分两层，都在 RunbookDsl 上：
//   1. 机器绑机能力：on(machine) → MachineDsl（cmd/pi/file），作用于指定机器
//   2. 全局能力：cloud/todo/machines，不绑机，作用于全局资源
// 扩展任一层只需在对应接口加方法，编排脚本立即可用。
//
// ---- 速查（照此写一条编排）----
//   import { defineRunbook } from "../runbookDsl";
//
//   export default defineRunbook(
//     { name: "...", desc: "...", params: [...], dangerousOverride: false },
//     async (ctx, { on, approve, log, cloud, machines }) => {
//       const build = on("win-dev-01");        // 绑定机器，变量名带语义
//       await build.cmd(`cd ${ctx.项目目录} && npm run build`);  // 机器能力
//       const dbs = await machines.list({ tag: "db", online: true }); // 全局能力：动态选机
//       await cloud.copyAcross(                     // 全局能力：跨机经云盘搬文件
//         { machine: "win-dev-01", path: "dist.tar.gz" },
//         { machine: dbs[0].id, dir: "/opt/app" },
//       );
//       await approve("确认停服？");             // 人工确认门，挂起
//       try {                                    // 失败继续 = try/catch
//         await on(dbs[0].id).pi("诊断数据库...");
//       } catch (e) { log(`失败：${e}`); }
//       const [a, b] = await Promise.all([       // 并行 = Promise.all
//         on("m1").pi("..."), on("m2").pi("..."),
//       ]);
//     },
//   );
// ----------------------------

import type { RunbookParam } from "./mockData";

export interface CmdResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface PiResult {
	summary: string;
	changedFiles: string[];
	tokens: number;
}

// 机器绑机能力：on(machine) 返回，所有调用作用于这台机器
export interface MachineDsl {
	/** 下发 shell 命令到这台机器 */
	cmd(
		command: string,
		opts?: { approve?: boolean; timeout?: number },
	): Promise<CmdResult>;
	/** 下发 Pi agent 一次性任务到这台机器（agent 自主规划步骤） */
	pi(
		prompt: string,
		opts?: { approve?: boolean; timeout?: number },
	): Promise<PiResult>;
	/** 文件操作（作用于这台机器的本地文件系统） */
	file: {
		read(path: string): Promise<string>;
		write(path: string, content: string): Promise<void>;
		move(from: string, to: string): Promise<void>;
		delete(path: string): Promise<void>;
	};
}

// ---- 全局能力（不绑机，作用于全局资源）----

export interface TransferResult {
	transferId: string;
	bytes: number;
}

/** 云盘中转——跨机器文件搬运的全局能力（云盘是全局资源，不属于某台机器） */
export interface CloudDsl {
	/** 经云盘中转，把 A 机的文件搬到 B 机（自动上传 + 下载两段） */
	copyAcross(
		from: { machine: string; path: string },
		to: { machine: string; dir: string },
	): Promise<TransferResult>;
	/** 把某机文件备份到云盘 */
	backup(machine: string, path: string): Promise<TransferResult>;
}

export interface TodoItem {
	id: string;
	title: string;
	description?: string;
	status: "todo" | "doing" | "awaiting_confirmation" | "done" | "failed";
	due?: string;
	priority?: number;
	contextId?: string;
	ready?: boolean;
}

export interface TodoListFilter {
	status?: TodoItem["status"];
	ready?: boolean;
	tagId?: string;
	contextId?: string;
	leafOnly?: boolean;
}

/** 待办——全局协作事项，完整语义见 20-todo-vcp-collaboration.md */
export interface TodoDsl {
	create(input: {
		title: string;
		description?: string;
		due?: string;
		priority?: number;
		tagIds?: string[];
		contextId?: string;
		parentId?: string;
		ready?: boolean;
		assignee?: "me" | null;
	}): Promise<TodoItem>;
	list(filter?: TodoListFilter): Promise<TodoItem[]>;
}

export interface MachineRef {
	id: string;
	os: string;
	tags: string[];
	online: boolean;
}

/** 机器查询——动态选机，避免脚本里硬编码 id（按标签/状态筛选） */
export interface MachinesDsl {
	list(filter?: { tag?: string; online?: boolean }): Promise<MachineRef[]>;
}

export interface RunbookDsl {
	/** 绑定目标机器，返回该机器的能力集（推荐：绑定一次，后续调用不重复传 machine） */
	on(machine: string): MachineDsl;
	/** 人工确认门：断点挂起——序列化执行状态后运行时退出，零占用；确认后重放恢复。拒绝则抛错 */
	approve(message: string): Promise<void>;
	/** 记录可观测事件 */
	log(message: string): void;
	/** 等待 */
	sleep(ms: number): Promise<void>;

	// ---- 全局能力（不绑机）----
	/** 云盘中转（跨机文件搬运） */
	cloud: CloudDsl;
	/** 待办 */
	todo: TodoDsl;
	/** 机器查询（动态选机） */
	machines: MachinesDsl;
}

// 编排脚本的运行时上下文：流程级参数注入包（脚本里 {参数名} / 模板字符串引用）
export type RunbookContext = Record<string, string>;

// 编排脚本入口。meta 声明元数据 + 参数，body 是编排逻辑。
export function defineRunbook(
	meta: {
		name: string;
		desc: string;
		params: RunbookParam[];
		dangerousOverride?: boolean;
	},
	body: (ctx: RunbookContext, dsl: RunbookDsl) => Promise<void>,
): { meta: typeof meta; body: typeof body } {
	return { meta, body };
}
