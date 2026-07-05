// 一次性启动 Gateway + Client Agent，不退出，方便 Web 手动验证。
// 用法：node scripts/dev-serve.mjs
// Ctrl+C 停止所有进程。
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const gatewayScript = join(root, "packages", "server", "dist", "gateway.mjs");
const clientScript = join(root, "packages", "client", "dist", "client-agent.mjs");
const webDir = join(root, "packages", "web", "dist");

const token = process.env.NOESIS_OWNER_TOKEN ?? "dev-owner-token";
const port = process.env.NOESIS_PORT ?? "8080";
const machineId = "local-dev-machine";

const children = [];

function cleanup() {
  for (const child of children.reverse()) {
    try { child.kill(); } catch { /* ignore */ }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

// 1. 启动 Gateway
const gateway = spawn(process.execPath, [
  gatewayScript,
  "--port", port,
  "--owner-token", token,
  "--web-dir", webDir,
], { stdio: ["ignore", "pipe", "inherit"] });
children.push(gateway);

// 等 Gateway ready
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Gateway 启动超时")), 10000);
  let buffer = "";
  gateway.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    buffer += String(chunk);
    if (buffer.includes("NOESIS_GATEWAY_READY")) {
      clearTimeout(timer);
      resolve();
    }
  });
  gateway.on("exit", (code) => {
    clearTimeout(timer);
    reject(new Error(`Gateway 异常退出 (${code})`));
  });
});

console.log(`\n✓ Gateway 就绪 → http://127.0.0.1:${port}`);
console.log(`  Owner Token: ${token}`);

// 2. 启动 Client Agent
const client = spawn(process.execPath, [
  clientScript,
  "--gateway", `http://127.0.0.1:${port}`,
  "--machine-id", machineId,
  "--owner-token", token,
], { stdio: ["ignore", "pipe", "inherit"] });
children.push(client);

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Client Agent 启动超时")), 10000);
  let buffer = "";
  client.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    buffer += String(chunk);
    if (buffer.includes("NOESIS_CLIENT_AGENT_READY")) {
      clearTimeout(timer);
      resolve();
    }
  });
  client.on("exit", (code) => {
    clearTimeout(timer);
    reject(new Error(`Client Agent 异常退出 (${code})`));
  });
});

console.log(`✓ Client Agent 就绪 → ${machineId}`);
console.log(`\n打开 http://127.0.0.1:${port} 输入 "${token}" 进入控制台。`);
console.log("Ctrl+C 停止所有进程。\n");

// 不退出，等用户 Ctrl+C
