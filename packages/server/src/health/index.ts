import { protocolVersion, type GatewayHealth } from "@noesis/shared";

export function getGatewayHealth(): GatewayHealth {
  return {
    ok: true,
    service: "gateway",
    protocolVersion,
  };
}
