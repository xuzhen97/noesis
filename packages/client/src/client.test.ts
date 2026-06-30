import { describe, expect, it } from "vitest";
import { createClientSupervisor } from "./index.js";

describe("Client Agent command.run shape", () => {
  it("exposes the P0 Client Agent execution shape without running a shell", () => {
    const supervisor = createClientSupervisor({ gatewayUrl: "http://127.0.0.1:8080" });

    expect(supervisor.kind).toBe("client-agent-supervisor");
    expect(supervisor.ws.gatewayUrl).toBe("http://127.0.0.1:8080");
    expect(supervisor.taskRunner.canHandle("command.run")).toBe(true);
    expect(supervisor.commandExecutor.describe()).toEqual({
      taskType: "command.run",
      execution: "not-started",
    });
  });
});
