import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * AES-256-GCM 加密，输出 base64（iv + authTag + ciphertext）。
 */
export function seal(plaintext: string, key: Buffer): string {
	if (key.length !== 32) {
		throw new Error("secret-box key must be 32 bytes");
	}
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * 解密 {@link seal} 产生的密文。
 */
export function open(sealed: string, key: Buffer): string {
	if (key.length !== 32) {
		throw new Error("secret-box key must be 32 bytes");
	}
	const buf = Buffer.from(sealed, "base64");
	const iv = buf.subarray(0, IV_LEN);
	const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
	const data = buf.subarray(IV_LEN + TAG_LEN);
	const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(data), decipher.final()]).toString(
		"utf8",
	);
}

/**
 * 读取或创建 Gateway 数据目录下的 32 字节密钥文件。
 */
export function resolveGatewayDataKey(dataDir: string): Buffer {
	mkdirSync(dataDir, { recursive: true });
	const keyPath = join(dataDir, ".gateway-key");
	if (!existsSync(keyPath)) {
		const key = randomBytes(32);
		writeFileSync(keyPath, key, { mode: 0o600 });
		return key;
	}
	const key = readFileSync(keyPath);
	if (key.length !== 32) {
		throw new Error("invalid .gateway-key length");
	}
	return key;
}
