import { startGateway } from "./gateway-runtime.js";

function readPort(args: readonly string[]): number {
  const index = args.indexOf("--port");
  if (index === -1) return 8080;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error("--port must be an integer between 0 and 65535");
  }
  return value;
}

export async function runGatewayMain(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const gateway = await startGateway({ port: readPort(args) });
  console.log(
    JSON.stringify({
      type: "NOESIS_GATEWAY_READY",
      httpUrl: gateway.httpUrl,
      wsUrl: gateway.wsUrl,
      port: gateway.port,
    }),
  );
}

if (
  process.argv[1]?.endsWith("main.js") ||
  process.argv[1]?.endsWith("gateway.mjs")
) {
  runGatewayMain().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
