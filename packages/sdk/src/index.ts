import { protocolVersion } from "@noesis/shared";

export interface NoesisClientOptions {
  baseUrl: string;
}

export interface NoesisPingResult {
  ok: true;
  baseUrl: string;
  protocolVersion: typeof protocolVersion;
}

export class NoesisClient {
  readonly baseUrl: string;

  constructor(options: NoesisClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  async ping(): Promise<NoesisPingResult> {
    return {
      ok: true,
      baseUrl: this.baseUrl,
      protocolVersion,
    };
  }
}
