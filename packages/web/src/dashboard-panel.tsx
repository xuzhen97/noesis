import { protocolVersion, type GatewayInfo } from "@noesis/shared";
import {
	Bot,
	CheckCircle2,
	Database,
	Network,
	Server,
	ShieldCheck,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PageHeading, StatusChip } from "./ui-helpers.js";

const statusCards = [
	{
		title: "Gateway",
		value: "待接入",
		description: "等待真实 Gateway API 连接",
		icon: Network,
	},
	{
		title: "Machines",
		value: "0 台",
		description: "等待 Client Agent 注册心跳",
		icon: Server,
	},
	{
		title: "Tasks",
		value: "暂无",
		description: "等待创建第一个可观测 Task",
		icon: Bot,
	},
	{
		title: "Protocol",
		value: protocolVersion,
		description: "来自 @noesis/shared 的协议版本",
		icon: Database,
	},
] as const;

/** 控制台仪表盘。 */
export function DashboardPage({ gatewayInfo }: { gatewayInfo: GatewayInfo }) {
	return (
		<div className="space-y-6">
			<PageHeading
				description="当前只展示 P0 控制闭环的真实边界：Gateway、Machine、Task 与协议版本。"
				title="仪表盘"
			/>

			<section
				className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
				aria-label="P0 控制闭环占位状态"
			>
				{statusCards.map((card) => (
					<Card className="noesis-panel noesis-card-hover" key={card.title}>
						<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
							<div>
								<CardDescription>{card.title}</CardDescription>
								<CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
							</div>
							<div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
								<card.icon className="size-5" aria-hidden="true" />
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								{card.description}
							</p>
						</CardContent>
					</Card>
				))}
			</section>

			<Card className="noesis-panel">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
						控制面状态
					</CardTitle>
					<CardDescription>
						Gateway 已连接并完成 Owner Token 认证。
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-3">
					<StatusChip
						icon={ShieldCheck}
						label="认证模式"
						value={gatewayInfo.auth.mode}
					/>
					<StatusChip icon={Network} label="Gateway" value={gatewayInfo.name} />
					<StatusChip
						icon={Bot}
						label="协议版本"
						value={gatewayInfo.protocolVersion}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
