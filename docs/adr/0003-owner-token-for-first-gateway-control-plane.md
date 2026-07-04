# Owner Token 作为第一版 Gateway 控制面凭证

Noesis 第一版 Gateway 控制面使用单一 Owner Token 保护 Web 控制台、SDK、CLI 和 Client Agent 连接。我们暂不实现 `/api/auth/login`、可撤销 API Token、Session、Cookie、多账号或 RBAC；调用方直接通过 `Authorization: Bearer <owner-token>` 访问受保护接口，Gateway 由 `--owner-token` 或 `NOESIS_OWNER_TOKEN` 配置该凭证。这个选择用最小安全边界完成个人单用户闭环，同时避免把第一阶段复杂化为身份系统；未来需要多人协作、令牌撤销或权限隔离时，再引入独立凭证体系。
