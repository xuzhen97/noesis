import type { TaskType } from "@noesis/shared";

export interface TaskRunnerShape {
	canHandle(taskType: TaskType): boolean;
}

export function createTaskRunnerShape(): TaskRunnerShape {
	return {
		canHandle(taskType) {
			return taskType === "command.run";
		},
	};
}
