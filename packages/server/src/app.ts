import { dbSlice } from "./db/index.js";
import { getGatewayHealth } from "./health/index.js";
import { machinesSlice } from "./machines/index.js";
import { tasksSlice } from "./tasks/index.js";
import { wsSlice } from "./ws/index.js";

export interface GatewayAppShape {
  name: "Noesis Gateway";
  health: ReturnType<typeof getGatewayHealth>;
  slices: ["health", "machines", "tasks", "ws", "db"];
}

export function createGatewayApp(): GatewayAppShape {
  return {
    name: "Noesis Gateway",
    health: getGatewayHealth(),
    slices: ["health", machinesSlice, tasksSlice, wsSlice, dbSlice],
  };
}
