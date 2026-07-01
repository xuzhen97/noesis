import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "故障应急诊断流",
		desc: "Pi 诊断数据库 → Pi 分析应用日志归因 → 人工确认后执行修复",
		params: [
			{ name: "时间段", type: "string", default: "最近 30min", required: true },
			{ name: "服务名", type: "string", required: true },
		],
		dangerousOverride: true,
	},
	async ({ 时间段, 服务名 }, { on, approve }) => {
		const db = on("linux-db-02"); // 数据库机
		const app = on("win-dev-01"); // 应用机

		// 1. 数据库诊断（只读）
		const diag = await db.pi(
			"诊断数据库：连接数、慢查询、锁等待、主从延迟，给出结论。只读不改。",
		);

		// 2. 应用日志归因（结合诊断结论，失败继续）
		try {
			await app.pi(
				`读取应用 ERROR 日志 ${时间段}，结合以下诊断结论归因到可能模块：\n${diag.summary}`,
			);
		} catch {
			// 归因失败不影响后续修复
		}

		// 3. 人工确认后修复
		await approve(`根据诊断结果，建议重启 ${服务名}，确认执行？`);
		await db.cmd(`systemctl restart ${服务名}`);
	},
);
