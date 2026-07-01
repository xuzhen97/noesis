import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "全栈发布流水线",
		desc: "构建机拉代码构建 → 打包 → 下发到 DB 机停服/替换/启服 → Pi 验证健康",
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
	},
	async ({ 项目目录, 服务名 }, { on, approve, log }) => {
		const build = on("win-dev-01"); // 构建机
		const db = on("linux-db-02"); // 数据库机

		// 1. 构建机：拉码 → 构建 → 打包
		await build.cmd(`cd ${项目目录} && git pull --ff-only && npm run build`);
		await build.cmd("tar -czf dist.tar.gz dist/");

		// 2. 人工确认门（挂起，等确认）
		await approve(`准备停 ${服务名} 并替换产物，确认继续？`);

		// 3. DB 机：停服 → 替换 → 启服
		await db.cmd(`systemctl stop ${服务名}`);
		await db.cmd(
			`scp win-dev-01:dist.tar.gz /opt/app/ && tar -xzf dist.tar.gz && systemctl start ${服务名}`,
		);

		// 4. Pi 健康验证（失败继续 = try/catch，给回滚建议）
		try {
			await db.pi(
				`服务 ${服务名} 刚重启，curl 健康检查确认 200，异常给回滚建议。`,
			);
		} catch (e) {
			log(`健康验证失败：${e}，请人工介入`);
		}
	},
);
