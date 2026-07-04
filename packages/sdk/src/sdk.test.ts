import { describe, expect, it } from "vitest";
import { NoesisClient } from "./index.js";

describe("Noesis SDK shell", () => {
	it("constructs a client and exposes a deterministic ping shape", async () => {
		const client = new NoesisClient({ baseUrl: "http://127.0.0.1:8080" });

		await expect(client.ping()).resolves.toEqual({
			ok: true,
			baseUrl: "http://127.0.0.1:8080",
			protocolVersion: "0.1.0",
		});
	});

	it("creates a command task and polls until success", async () => {
		const calls: string[] = [];
		const fakeFetch: typeof fetch = async (input, init) => {
			calls.push(`${init?.method ?? "GET"} ${String(input)}`);
			if (String(input).endsWith("/api/tasks")) {
				return Response.json(
					{
						ok: true,
						requestId: "req_1",
						data: {
							id: "task_1",
							machineId: "local-dev-machine",
							taskType: "command.run",
							status: "dispatched",
							payload: {
								command: ["node", "-e", "console.log('noesis-ok')"],
							},
						},
					},
					{ status: 201 },
				);
			}
			if (String(input).endsWith("/api/tasks/task_1")) {
				return Response.json({
					ok: true,
					requestId: "req_2",
					data: {
						id: "task_1",
						machineId: "local-dev-machine",
						taskType: "command.run",
						status: "succeeded",
						payload: {
							command: ["node", "-e", "console.log('noesis-ok')"],
						},
					},
				});
			}
			if (String(input).endsWith("/api/tasks/task_1/events")) {
				return Response.json({
					ok: true,
					requestId: "req_3",
					data: [
						{
							id: "event_1",
							taskId: "task_1",
							type: "task.succeeded",
							level: "info",
							data: {
								stdout: "noesis-ok\n",
								stderr: "",
								exitCode: 0,
							},
						},
					],
				});
			}
			return Response.json(
				{
					ok: false,
					requestId: "req_bad",
					error: { code: "BAD_REQUEST", message: "bad" },
				},
				{ status: 400 },
			);
		};

		const client = new NoesisClient({
			baseUrl: "http://127.0.0.1:8080",
			fetch: fakeFetch,
		});
		await expect(
			client.runCommandAndWait({
				machineId: "local-dev-machine",
				command: ["node", "-e", "console.log('noesis-ok')"],
				pollIntervalMs: 1,
				timeoutMs: 100,
			}),
		).resolves.toEqual({
			taskId: "task_1",
			status: "succeeded",
			stdout: "noesis-ok\n",
		});

			expect(calls).toEqual([
				"POST http://127.0.0.1:8080/api/tasks",
				"GET http://127.0.0.1:8080/api/tasks/task_1",
				"GET http://127.0.0.1:8080/api/tasks/task_1/events",
			]);
		});

		it("passes ownerToken in Authorization header", async () => {
			let capturedHeaders: Record<string, string> = {};
			const fakeFetch: typeof fetch = async (_input, init) => {
				capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
				return Response.json({
								ok: true,
								requestId: "req_1",
								data: {
										name: "Noesis Gateway",
										service: "gateway",
										protocolVersion: "0.1.0",
										auth: { mode: "owner-token" },
										capabilities: [],
								},
				});
			};

			const client = new NoesisClient({
				baseUrl: "http://127.0.0.1:8080",
				fetch: fakeFetch,
				ownerToken: "test-token",
			});

			await client.getGatewayInfo();
			expect(capturedHeaders.authorization).toBe("Bearer test-token");
		});

		it("getGatewayInfo returns GatewayInfo shape", async () => {
			const fakeFetch: typeof fetch = async () =>
				Response.json({
								ok: true,
								requestId: "req_1",
								data: {
										name: "Noesis Gateway",
										service: "gateway",
										protocolVersion: "0.1.0",
										auth: { mode: "owner-token" },
										capabilities: ["tasks.command.run", "machines.client-agent"],
								},
				});

			const client = new NoesisClient({
				baseUrl: "http://127.0.0.1:8080",
				fetch: fakeFetch,
				ownerToken: "test-token",
			});

			await expect(client.getGatewayInfo()).resolves.toEqual({
				name: "Noesis Gateway",
				service: "gateway",
				protocolVersion: "0.1.0",
				auth: { mode: "owner-token" },
				capabilities: ["tasks.command.run", "machines.client-agent"],
			});
		});
});
