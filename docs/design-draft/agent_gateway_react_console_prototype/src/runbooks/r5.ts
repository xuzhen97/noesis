import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "多机日志归档",
		desc: "并行打包 Linux/Windows 日志 → 汇聚到 Linux 归档到云盘",
		params: [
			{ name: "日志目录", type: "path", required: true },
			{
				name: "云盘路径",
				type: "string",
				required: true,
				hint: "rclone remote:path",
			},
		],
	},
	async ({ 日志目录, 云盘路径 }, { on }) => {
		const linux = on("linux-db-02");
		const win = on("win-dev-01");

		// 并行打包两台（任一失败继续：allSettled）
		await Promise.allSettled([
			linux.cmd(`tar -czf /tmp/logs-linux.tar.gz ${日志目录}`),
			win.cmd(
				`Compress-Archive -Path ${日志目录} -DestinationPath C:\\temp\\logs-win.zip`,
			),
		]);

		// 汇聚到 Linux 归档云盘
		await linux.cmd(
			`scp win-dev-01:logs-win.zip /tmp/ && rclone copy /tmp/logs-* ${云盘路径}`,
		);
	},
);
