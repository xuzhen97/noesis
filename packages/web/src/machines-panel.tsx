import type { Machine } from "@noesis/shared";
import { Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatApiError, listMachines } from "./gateway-api.js";
import { MachineFilesPage } from "./machine-files.js";
import { PageHeading, PlaceholderPage } from "./ui-helpers.js";

/** 已注册 Machine 列表。 */
export function MachinesPage({ ownerToken }: { ownerToken: string }) {
	const [machines, setMachines] = useState<Machine[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const res = await listMachines(ownerToken);
			if (cancelled) return;
			if ("kind" in res) {
				setError(formatApiError(res));
			} else {
				setMachines(res);
			}
			setLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [ownerToken]);

	return (
		<div className="space-y-6">
			<PageHeading
				description="已注册的 Client Agent 列表，点击管理文件。"
				title="机器"
			/>
			{loading && <p className="text-sm text-muted-foreground">加载中…</p>}
			{error && (
				<Card className="noesis-panel border-destructive">
					<CardHeader>
						<CardTitle>加载失败</CardTitle>
						<CardDescription>{error}</CardDescription>
					</CardHeader>
				</Card>
			)}
			{!loading && !error && machines.length === 0 && (
				<PlaceholderPage
					description="尚无 Client Agent 注册心跳。"
					icon={Server}
					title="机器"
				>
					等待 Client Agent 接入 Gateway。
				</PlaceholderPage>
			)}
			{!loading && !error && machines.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{machines.map((m) => (
						<Card key={m.id} className="noesis-panel noesis-card-hover">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Server className="size-5 text-primary" />
									{m.name || m.id}
								</CardTitle>
								<CardDescription>{m.id}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<p className="text-sm">
									<span className="text-muted-foreground">状态：</span>
									{m.status}
								</p>
								<p className="text-sm">
									<span className="text-muted-foreground">磁盘数：</span>
									{m.disks?.length ?? 0}
								</p>
								<Button asChild size="sm" variant="outline">
									<Link to={`/machines/${encodeURIComponent(m.id)}`}>
										管理文件
									</Link>
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

/** Machine 文件页路由适配器。 */
export function MachineFilesRoute({ ownerToken }: { ownerToken: string }) {
	const { machineId = "" } = useParams();
	return (
		<MachineFilesPage
			machineId={decodeURIComponent(machineId)}
			ownerToken={ownerToken}
		/>
	);
}
