import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "跨机安全漏洞扫描",
		desc: "并行对 Linux/Windows 跑 Pi CVE 扫描 → 汇总按严重度排序的修复清单",
		params: [],
	},
	async (_, { on }) => {
		const linux = on("linux-db-02");
		const win = on("win-dev-01");
		const prompt =
			"扫描本机已装软件包，对照 CVE 库，输出严重度排序的修复清单。仅分析不修改。";

		// 并行扫描双机
		const [linuxScan, winScan] = await Promise.all([
			linux.pi(prompt),
			win.pi(prompt),
		]);

		// 汇总统一清单
		await win.pi(
			`汇总 Linux/Windows CVE 扫描结果，去重按严重度排序，输出统一修复优先级清单：\nLinux: ${linuxScan.summary}\nWindows: ${winScan.summary}`,
		);
	},
);
