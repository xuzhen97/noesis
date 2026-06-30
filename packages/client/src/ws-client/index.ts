export interface ClientWsShape {
  gatewayUrl: string;
}

export function createClientWsShape(gatewayUrl: string): ClientWsShape {
  return { gatewayUrl };
}
