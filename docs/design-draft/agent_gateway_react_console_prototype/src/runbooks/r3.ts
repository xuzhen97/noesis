import { defineRunbook } from "../runbookDsl";

export default defineRunbook(
	{
		name: "GPU 集群健康巡检",
		desc: "并行对 3 台 GPU 机器跑 Pi 诊断 → 汇总集群健康度报告",
		params: [],
	},
	async (_, { on }) => {
		const gpu1 = on("win-dev-01");
		const gpu2 = on("linux-db-02");
		const gpu3 = on("gpu-work-01");
		const prompt =
			"检查 GPU：nvidia-smi、nvcc、显存占用、温度，异常给修复建议。只读。";

		// 并行诊断 3 台（Promise.all = 并行收口）
		const [d1, d2, d3] = await Promise.all([
			gpu1.pi(prompt),
			gpu2.pi(prompt),
			gpu3.pi(prompt),
		]);

		// 汇总集群报告
		await gpu1.pi(
			`汇总三台 GPU 诊断结果，对比显存/温度/驱动，输出集群健康度报告：\n#1: ${d1.summary}\n#2: ${d2.summary}\n#3: ${d3.summary}`,
		);
	},
);
