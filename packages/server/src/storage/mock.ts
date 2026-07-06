/** CI/本地无密钥时启用假存储后端。 */
export function isStorageMock(): boolean {
	return process.env.NOESIS_STORAGE_MOCK === "1";
}
