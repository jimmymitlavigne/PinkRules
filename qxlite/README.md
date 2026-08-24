# QX Lite

精简后的 Quantumult X 分流规则，仅包含分流文件，不包含节点订阅、代理密码、MITM 证书或其他私密配置。

## 内容

- `filter_remote/`：33 个分流规则文件
- `icon/`：当前配置使用的 38 个远程 PNG 图标
- `filter_remote.conf`：可复制到 Quantumult X 配置中的远程规则订阅段
- `RULES_REVIEW.md`：分类、排序与校验说明

当前共 1,250 条有效远程规则，按“专用场景 → 流媒体 → 应用与厂商 → 境外/中国兜底”排序。

Apple 分为 `Apple Direct`、`Apple Services` 和 `Apple News`；`Apple Services` 已覆盖 Apple 官方列出的 iCloud DNS 域名 `apple-dns.net`。国际新闻使用 `News`；海外影音使用 `GMedia`；通用境外服务使用 `Outside`；中国大陆服务使用 `China`。

所有有效分流规则和自有图标均集中在 `qxlite/` 目录下；完整配置未上传，因为本地版本含节点订阅凭据和代理密码。
