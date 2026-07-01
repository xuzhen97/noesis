import {
	createCommandExecutorShape,
	type CommandExecutorShape,
} from "../command-executor/index.js";
import {
	createTaskRunnerShape,
	type TaskRunnerShape,
} from "../task-runner/index.js";
import { createClientWsShape, type ClientWsShape } from "../ws-client/index.js";

export interface ClientSupervisorOptions {
	gatewayUrl: string;
}

export interface ClientSupervisorShape {
	kind: "client-agent-supervisor";
	ws: ClientWsShape;
	taskRunner: TaskRunnerShape;
	commandExecutor: CommandExecutorShape;
}

export function createClientSupervisor(
	options: ClientSupervisorOptions,
): ClientSupervisorShape {
	return {
		kind: "client-agent-supervisor",
		ws: createClientWsShape(options.gatewayUrl),
		taskRunner: createTaskRunnerShape(),
		commandExecutor: createCommandExecutorShape(),
	};
}
