import { defineRunbook } from "../runbookDsl";

// 跨机配置备份与同步：展示机器能力（file/cmd）+ 全局能力（machines/cloud/todo）两层。
// 故事：动态选出所有在线 db 机组 → 读取每台配置 → 经云盘中转汇聚到备份机 →
//       生成变更清单 → 人工确认 → 落地新配置 → 把后续人工核查记成待办（不丢）。
export default defineRunbook(
	{
		name: "DB 机组配置备份与同步",
		desc: "动态选 db 机组 → file 读配置 → cloud 经云盘汇聚备份 → 确认 → 下发新配置 → 记待办",
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
	},
	async (
		{ 配置路径, 新配置内容 },
		{ on, approve, log, cloud, machines, todo },
	) => {
		// 1. 全局能力：动态选机——不硬编码 id，按标签 + 在线状态筛选
		const dbs = await machines.list({ tag: "db", online: true });
		if (dbs.length === 0) {
			log("没有在线的 db 机组，流程结束");
			return;
		}
		log(`选出 ${dbs.length} 台 db：${dbs.map((m) => m.id).join(", ")}`);

		// 2. 机器能力：并行读每台配置（Promise.all = 并行）
		const configs = await Promise.all(
			dbs.map((m) => on(m.id).file.read(配置路径)),
		);
		configs.forEach((c, i) => log(`${dbs[i].id} 配置 ${c.length} 字节`));

		// 3. 全局能力：经云盘中转，把每台配置汇聚到备份机
		for (const m of dbs) {
			await cloud.copyAcross(
				{ machine: m.id, path: 配置路径 },
				{ machine: "linux-db-02", dir: `/opt/backup/cfg-${m.id}` },
			);
		}
		log("配置已汇聚到 linux-db-02 备份目录");

		// 4. 人工确认门：下发前停一停
		await approve(
			`即将用新配置覆盖 ${dbs.length} 台 db 的 ${配置路径}，确认？`,
		);

		// 5. 机器能力：下发新配置 + 重载（串行 await = 顺序执行）
		for (const m of dbs) {
			const target = on(m.id);
			await target.file.write(配置路径, 新配置内容);
			await target.cmd("systemctl reload mysql");
		}

		// 6. 全局能力：把后续人工核查记成待办，运维不丢
		await todo.create({
			title: "核查 db 机组配置同步后业务指标",
			description: "检查配置同步后 30 分钟业务指标是否恢复正常。",
			due: "今日",
			contextId: "ctx_db_ops",
			ready: true,
		});
		log("已记录待办：核查业务指标");
	},
);
