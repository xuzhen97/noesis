import type { LucideIcon } from "lucide-react";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/** 页面标题区。 */
export function PageHeading({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<section className="space-y-1.5">
			<h1 className="text-3xl font-semibold tracking-tight text-foreground">
				{title}
			</h1>
			<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
				{description}
			</p>
		</section>
	);
}

/** 诚实占位页面，不伪造未接入数据。 */
export function PlaceholderPage({
	children,
	description,
	icon: Icon,
	title,
}: {
	children: string;
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<div className="space-y-6">
			<PageHeading description={description} title={title} />
			<Card className="noesis-panel max-w-3xl">
				<CardHeader>
					<div className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
						<Icon className="size-6" aria-hidden="true" />
					</div>
					<CardTitle className="pt-2">{children}</CardTitle>
					<CardDescription>
						这是诚实占位状态，不使用大规模 mock 数据。
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}

/** 小型状态标签。 */
export function StatusChip({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}) {
	return (
		<div className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-card/55 px-4 py-3 backdrop-blur-xl">
			<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Icon className="size-5" aria-hidden="true" />
			</div>
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm font-medium text-foreground">{value}</p>
			</div>
		</div>
	);
}
