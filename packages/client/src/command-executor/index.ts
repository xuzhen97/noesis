import type { TaskType } from "@noesis/shared";

export interface CommandExecutorShape {
	describe(): { taskType: TaskType; execution: "not-started" };
}

export function createCommandExecutorShape(): CommandExecutorShape {
	return {
		describe() {
			return {
				taskType: "command.run",
				execution: "not-started",
			};
		},
	};
}
