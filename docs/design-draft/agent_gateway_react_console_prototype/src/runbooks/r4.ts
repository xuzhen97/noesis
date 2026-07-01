import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "依赖升级评估与执行",
		desc: "Pi 评估升级风险 → 人工确认后升级安全补丁 → Pi 回归验证",
		params: [
			{ name: "项目目录", type: "path", required: true },
			{
				name: "补丁包",
				type: "string",
				required: true,
				hint: "npm update 目标包",
			},
		],
	},
	async ({ 项目目录, 补丁包 }, { on, approve }) => {
		const dev = on("win-dev-01"); // 开发机

		// 1. 风险评估（不执行升级）
		const report = await dev.pi(
			`在 ${项目目录} 运行 npm outdated，评估升级风险（breaking/安全补丁），输出建议清单。不执行升级。`,
		);

		// 2. 人工确认后升级
		await approve(`评估完成，确认升级 ${补丁包}？\n${report.summary}`);
		await dev.cmd(`cd ${项目目录} && npm update ${补丁包}`);

		// 3. 回归验证
		await dev.pi(
			`在 ${项目目录} 跑 npm test，确认升级未引入破坏，输出结果摘要。`,
		);
	},
);
