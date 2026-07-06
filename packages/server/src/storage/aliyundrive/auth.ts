import { randomBytes } from "node:crypto";
import type Database from "better-sqlite3";
import { open, seal } from "../../secret-box.js";
import { isStorageMock } from "../mock.js";
import { AliyunDriveOpenApiClient } from "./openapi.js";

const DEFAULT_ID = "default";
const DEFAULT_SCOPE = "user:base,file:all:read,file:all:write";
const DEFAULT_OPENAPI_BASE = "https://openapi.alipan.com";
const DEFAULT_REDIRECT_URI = "oob";
const DEFAULT_TRANSFER_FOLDER = "NoesisTransfers";
const DEFAULT_CLEANUP_TTL_MS = 24 * 60 * 60 * 1000;

export interface AliyunDriveConfigRecord {
	clientId: string;
	clientSecret: string | null;
	scope: string;
	openapiBase: string;
	redirectUri: string;
	transferFolder: string;
	cleanupTtlMs: number;
}

export interface AliyunDriveAuthRecord {
	accessToken: string;
	refreshToken: string | null;
	tokenType: string;
	expiresAt: number;
	driveId: string | null;
	authorizedAccountName: string | null;
	updatedAt?: number;
}

interface OAuthSession {
	state: string;
	verifier: string;
	config: AliyunDriveConfigRecord;
	expiresAt: number;
}

export function buildCodeVerifier(): string {
	const alphabet =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const bytes = randomBytes(64);
	let result = "";
	for (const byte of bytes) result += alphabet[byte % alphabet.length];
	return result;
}

/** 阿里云盘 OAuth 与配置（token 加密落库）。 */
export class AliyunDriveAuthService {
	private readonly oauthSessions = new Map<string, OAuthSession>();

	constructor(
		private readonly db: Database.Database,
		private readonly secretKey: Buffer,
		private readonly deps: {
			fetchImpl?: typeof fetch;
			now?: () => number;
		} = {},
	) {}

	private now(): number {
		return this.deps.now?.() ?? Date.now();
	}

	private fetchImpl(): typeof fetch {
		return this.deps.fetchImpl ?? fetch;
	}

	getDefaultConfig(
		input: Partial<AliyunDriveConfigRecord> & { clientId?: string } = {},
	): AliyunDriveConfigRecord {
		return {
			clientId: input.clientId ?? "",
			clientSecret: input.clientSecret ?? null,
			scope: input.scope ?? DEFAULT_SCOPE,
			openapiBase: (input.openapiBase ?? DEFAULT_OPENAPI_BASE).replace(
				/\/+$/,
				"",
			),
			redirectUri: input.redirectUri ?? DEFAULT_REDIRECT_URI,
			transferFolder: input.transferFolder ?? DEFAULT_TRANSFER_FOLDER,
			cleanupTtlMs: input.cleanupTtlMs ?? DEFAULT_CLEANUP_TTL_MS,
		};
	}

	saveConfig(
		input: Partial<AliyunDriveConfigRecord> & { clientId: string },
	): AliyunDriveConfigRecord {
		const existing = this.getConfig();
		const record = this.getDefaultConfig({
			...existing,
			...input,
			clientId: input.clientId.trim(),
		});
		if (!record.clientId) throw new Error("clientId is required");
		const ts = new Date().toISOString();
		const secretEnc = record.clientSecret
			? seal(record.clientSecret, this.secretKey)
			: null;
		this.db
			.prepare(
				`INSERT INTO aliyundrive_config (
          id, client_id, client_secret_enc, scope, openapi_base, redirect_uri,
          transfer_folder, cleanup_ttl_ms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          client_id = excluded.client_id,
          client_secret_enc = excluded.client_secret_enc,
          scope = excluded.scope,
          openapi_base = excluded.openapi_base,
          redirect_uri = excluded.redirect_uri,
          transfer_folder = excluded.transfer_folder,
          cleanup_ttl_ms = excluded.cleanup_ttl_ms,
          updated_at = excluded.updated_at`,
			)
			.run(
				DEFAULT_ID,
				record.clientId,
				secretEnc,
				record.scope,
				record.openapiBase,
				record.redirectUri,
				record.transferFolder,
				record.cleanupTtlMs,
				existing ? ts : ts,
				ts,
			);
		return record;
	}

	getConfig(): AliyunDriveConfigRecord | null {
		const row = this.db
			.prepare("SELECT * FROM aliyundrive_config WHERE id = ?")
			.get(DEFAULT_ID) as Record<string, unknown> | undefined;
		if (!row) return null;
		let clientSecret: string | null = null;
		if (row.client_secret_enc) {
			clientSecret = open(String(row.client_secret_enc), this.secretKey);
		}
		return {
			clientId: String(row.client_id),
			clientSecret,
			scope: String(row.scope),
			openapiBase: String(row.openapi_base),
			redirectUri: String(row.redirect_uri),
			transferFolder: String(row.transfer_folder),
			cleanupTtlMs: Number(row.cleanup_ttl_ms),
		};
	}

	getAuth(): AliyunDriveAuthRecord | null {
		const row = this.db
			.prepare("SELECT * FROM aliyundrive_auth WHERE id = ?")
			.get(DEFAULT_ID) as Record<string, unknown> | undefined;
		if (!row) return null;
		return {
			accessToken: open(String(row.access_token_enc), this.secretKey),
			refreshToken: row.refresh_token_enc
				? open(String(row.refresh_token_enc), this.secretKey)
				: null,
			tokenType: row.token_type == null ? "Bearer" : String(row.token_type),
			expiresAt: Date.parse(String(row.expires_at)),
			driveId: row.drive_id == null ? null : String(row.drive_id),
			authorizedAccountName:
				row.authorized_account_name == null
					? null
					: String(row.authorized_account_name),
			updatedAt: Date.parse(String(row.updated_at)),
		};
	}

	getStatus() {
		const config = this.getConfig();
		const auth = this.getAuth();
		const hasAuth = Boolean(auth?.accessToken);
		const isExpired = Boolean(auth?.expiresAt && auth.expiresAt <= this.now());
		const authorizationState = !hasAuth
			? "unauthorized"
			: isExpired
				? "expired"
				: "authorized";
		return {
			configured: Boolean(config?.clientId),
			authorized: Boolean(
				auth?.accessToken && auth.expiresAt > this.now() + 300_000,
			),
			authorizationState,
			clientId: config?.clientId,
			scope: config?.scope,
			openapiBase: config?.openapiBase,
			redirectUri: config?.redirectUri,
			transferFolder: config?.transferFolder,
			cleanupTtlMs: config?.cleanupTtlMs,
			expiresAt: auth?.expiresAt,
			checkedAt: auth?.updatedAt,
			driveId: auth?.driveId ?? undefined,
			authorizedAccountName: auth?.authorizedAccountName ?? undefined,
			mock: isStorageMock(),
		};
	}

	startOAuth(
		configInput?: Partial<AliyunDriveConfigRecord> & { clientId?: string },
	) {
		const config = configInput?.clientId?.trim()
			? this.saveConfig({
					...configInput,
					clientId: configInput.clientId,
				})
			: this.getConfig();
		if (!config?.clientId) {
			throw new Error("Aliyun Drive client_id is not configured");
		}
		const verifier = buildCodeVerifier();
		const state = randomBytes(16).toString("hex");
		let url: URL;
		try {
			url = new URL(`${config.openapiBase}/oauth/authorize`);
		} catch {
			throw new Error("Invalid openapiBase for OAuth authorize URL");
		}
		url.searchParams.set("client_id", config.clientId);
		url.searchParams.set("redirect_uri", config.redirectUri);
		url.searchParams.set("scope", config.scope);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("state", state);
		url.searchParams.set("code_challenge", verifier);
		url.searchParams.set("code_challenge_method", "plain");
		this.oauthSessions.set(state, {
			state,
			verifier,
			config,
			expiresAt: this.now() + 10 * 60 * 1000,
		});
		return {
			state,
			authorizationUrl: url.toString(),
			expiresAt: this.now() + 10 * 60 * 1000,
		};
	}

	async completeOAuth(input: { state: string; code: string }) {
		const session = this.oauthSessions.get(input.state);
		if (!session || session.expiresAt < this.now()) {
			throw new Error("OAuth session expired");
		}
		const payload: Record<string, string> = {
			client_id: session.config.clientId,
			grant_type: "authorization_code",
			code: input.code.trim(),
			code_verifier: session.verifier,
		};
		if (session.config.clientSecret) {
			payload.client_secret = session.config.clientSecret;
		}
		const response = await this.fetchImpl()(
			`${session.config.openapiBase}/oauth/access_token`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);
		if (!response.ok) {
			throw new Error(
				`Aliyun token exchange failed: HTTP ${response.status} ${await response.text()}`,
			);
		}
		const data = (await response.json()) as {
			access_token: string;
			refresh_token?: string;
			token_type?: string;
			expires_in: number;
		};
		this.saveAuth({
			accessToken: data.access_token,
			refreshToken: data.refresh_token ?? null,
			tokenType: data.token_type ?? "Bearer",
			expiresAt: this.now() + Number(data.expires_in) * 1000,
			driveId: null,
			authorizedAccountName: null,
		});
		this.oauthSessions.delete(input.state);
		return this.getStatus();
	}

	async testAuthorization(): Promise<{
		state: "unauthorized" | "expired" | "valid" | "invalid" | "network_error";
		message: string;
		checkedAt: number;
		driveId?: string;
		authorizedAccountName?: string;
	}> {
		const checkedAt = this.now();
		if (isStorageMock()) {
			return {
				state: "valid",
				message: "mock 授权有效",
				checkedAt,
				driveId: "mock-drive",
			};
		}
		const config = this.getConfig();
		const auth = this.getAuth();
		if (!config?.clientId || !auth?.accessToken) {
			return { state: "unauthorized", message: "尚未授权", checkedAt };
		}
		if (auth.expiresAt <= checkedAt) {
			return { state: "expired", message: "本地授权已过期", checkedAt };
		}
		try {
			const client = new AliyunDriveOpenApiClient({
				openapiBase: config.openapiBase,
				accessToken: auth.accessToken,
				fetchImpl: this.fetchImpl(),
			});
			const info = await client.getDriveInfo();
			const raw = (info.raw ?? {}) as Record<string, unknown>;
			const authorizedAccountName =
				String(
					raw.nick_name ??
						raw.nickName ??
						raw.user_name ??
						raw.userName ??
						raw.name ??
						"",
				).trim() || undefined;
			this.saveAuth({
				...auth,
				driveId: info.driveId,
				authorizedAccountName:
					authorizedAccountName ?? auth.authorizedAccountName ?? null,
			});
			return {
				state: "valid",
				message: "授权有效",
				checkedAt,
				driveId: info.driveId,
				authorizedAccountName,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (/HTTP 401|HTTP 403|invalid|token/i.test(message)) {
				return { state: "invalid", message: "授权已失效", checkedAt };
			}
			return { state: "network_error", message: "远程校验失败", checkedAt };
		}
	}

	saveAuth(record: AliyunDriveAuthRecord): void {
		const ts = new Date().toISOString();
		this.db
			.prepare(
				`INSERT INTO aliyundrive_auth (
          id, access_token_enc, refresh_token_enc, token_type, expires_at,
          drive_id, authorized_account_name, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          access_token_enc = excluded.access_token_enc,
          refresh_token_enc = excluded.refresh_token_enc,
          token_type = excluded.token_type,
          expires_at = excluded.expires_at,
          drive_id = excluded.drive_id,
          authorized_account_name = excluded.authorized_account_name,
          updated_at = excluded.updated_at`,
			)
			.run(
				DEFAULT_ID,
				seal(record.accessToken, this.secretKey),
				record.refreshToken ? seal(record.refreshToken, this.secretKey) : null,
				record.tokenType ?? "Bearer",
				new Date(record.expiresAt).toISOString(),
				record.driveId ?? null,
				record.authorizedAccountName ?? null,
				ts,
			);
	}

	revoke(): void {
		this.db
			.prepare("DELETE FROM aliyundrive_auth WHERE id = ?")
			.run(DEFAULT_ID);
	}
}
