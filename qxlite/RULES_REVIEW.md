# Quantumult X 分流规则本地整理说明

整理日期：2026-08-24

## 本地文件

- 当前本地配置：`PinkRules-iOS-20260824-v39.conf`
- 待确认规则：`quantumult/filter_remote/*.list`
- 原始配置备份：`quantumult_20260823215638.conf.bak`
- 原始规则快照：`rules_snapshot/`
- 只读校验脚本：`tools/validate_qx_rules.py`

当前配置已引用 GitHub 上的 `PinkRules/master/qxlite/filter_remote/` 地址，整理后的规则已同步到仓库 `qxlite/` 目录。

> 安全提醒：完整配置含节点订阅凭据、代理密码和 MITM 证书材料，不应直接上传到公开仓库。本次仅同步脱敏后的 `qxlite/` 规则包，未上传完整配置。

## Apple 分流

Apple 已拆成两个明确策略，`Apple Direct` 排在 `Apple Services` 前：

- `Apple Direct`：默认 `direct`，并可手动切换 `proxy` 或 `灰原哀`；负责 Apple Music、Apple TV、App Store、TestFlight、应用内容、系统和应用更新。包含 Apple 官方列出的 `*.itunes.apple.com`、`*.apps.apple.com`、`*.mzstatic.com` 以及软件更新端点。
- `Apple Services`：默认 `direct`，负责 Apple 账号、iCloud、地图、定位、查找、天气、Siri、推送及剩余 Apple 服务，并包含 Apple 官方列出的 iCloud DNS 域名 `apple-dns.net`。
- iCloud 按用途拆分：账号、CloudKit 与同步控制进入 `Apple Services`；`icloud-content.com` 承载的 Drive、照片、备份和附件大流量进入默认直连的 `Apple Direct`；iCloud Mail 继续进入 `Mail`。

当前完整配置仍在 `[general] excluded_routes` 中保留 `17.0.0.0/8`。该网段流量会绕过 Quantumult X，因此命中 Apple IP 时无法由上述策略切换；建议后续从 `excluded_routes` 删除，改由 Apple 策略的默认 `direct` 控制。Apple 端点分类参考：<https://support.apple.com/101555>。

## 分类校正

- `AC` 按用户定义保留为“学术 + 国际金融 + AI”，文件内按三类分段。
- AC 已移除 Datadog、Cloudflare Insights、Statsig、Feature Gates、LaunchDarkly 等共享统计、遥测和功能开关域名，只保留 OpenAI 自有域名及人机验证、实时语音功能依赖。
- `TV` 仅保留影视、成人内容、番剧索引、字幕和电视服务。
- Steam、Riot、Blizzard 等游戏规则并入 `Outside`，不再保留独立 Game 策略。
- `Work` 负责豆瓣、微博、头条、知乎、抖音、小红书和 Soul，默认直连并可切换通用代理或地区策略。
- 抖音的 `Aweme` 应用/主机及 `amemv.com` 由前置 `Work` 精确匹配，避免被后置 TikTok 的字节系共享域名误分流。
- `Customer` 只保留明确要求直连的自有服务、远程控制和服务器。
- Prime Video、ESPN 从 Hulu 拆出独立规则；Hulu 文件只包含 Hulu。
- PikPak 从 Microsoft 移到 Storage；Microsoft 文件只保留 Microsoft 服务。
- Storage 的宽泛 `dl-a` 关键词已替换为 Microsoft 官方列出的 OneDrive 内容域名：`files.1drv.com`、`storage.live.com`、`livefilestore.com` 和 `storage.msn.com`。
- YouTube Music 归入 YouTube；Disney+ 相关项归入 Disney+。
- 原 `News` 改名为 `Apple News`；新 `News` 只负责 BBC、Bloomberg、CNN、Reuters、纽约时报、WSJ、The Economist 等国际新闻媒体。
- GMedia 删除宽泛的 `go.com`、`fox.com` 和 BBC 主站，只保留 ABC、FOX、BBC iPlayer 的媒体专用域名、App UA 与播放接口。
- Netflix 从 1,142 条精简为 43 条：官方服务域名、14 个 AS2906 IPv4 聚合网段和 7 个 IPv6 聚合网段，不再包含普通 AWS 云网段。
- 删除 Prime Video、ESPN、TikTok、Google、China 中 13 条被同策略宽泛规则覆盖的具体条目。
- `CMedia` 与 `Mainland` 合并为 `China`，统一包含中国大陆影音、常用服务、`.cn` 域名和 `GEOIP CN` 通用匹配；删除了 1,009 条与名称不符且被 GEOIP 覆盖的 ASN 项及明显国外服务。
- 移除了 Notion、Netflix、GMedia 等专用列表内不属于该服务的泛统计、共享 CDN 或通用云域名。

## 分流顺序

1. 自定义与专用场景：TV、Work、Customer、Infuse、Storage、Mail、Apple News、News、AC。
2. 区域与测速：Turkey、Speedtest。
3. 流媒体：Netflix、Hulu、Prime Video、ESPN、Disney+、Paramount+、HBO、Spotify、YouTube、Pornhub。
4. 应用与厂商：Telegram、TikTok、Notion、Adobe、Apple Direct、Apple Services、Microsoft、PayPal、Google。
5. 大类兜底：GMedia、Outside、China。
6. 本地规则与 `final, Others`。

News 和 Outside 均放在 China 前，用于优先处理 `bloomberg.cn` 等明确需要代理的例外；其余 `.cn` 和中国大陆 IP 再由 China 直连。

网易云音乐独立策略已移除，其域名和中国大陆 IP 由 China 统一直连。

## 去广告与校验

已移除 `AdBlock` 策略组、广告/劫持分流订阅、小红书和 YouTube 去广告复写，以及可能重新引入去广告脚本的旧合集。原有三条迅雷版权规避 `reject` 也已从本地规则删除。

DNS 已精简为阿里云 `223.5.5.5` 与腾讯云 DNSPod `119.29.29.29` 两个全局解析服务器；本地规则补充了 SSDP、IPv6 链路本地和 IPv6 链路本地组播直连，用于局域网设备发现与通信。

当前配置使用的远程 PNG 图标已集中到 `qxlite/icon/`，配置中的图标 URL 统一指向该目录；系统 SF Symbols 继续使用系统内置名称，无需保存本地副本。

当前共有 33 个分流文件、1,250 条活动规则。校验项目包括：配置引用与本地文件一一对应、策略名称一致、规则字段完整、文件内无重复、没有被前置规则完整覆盖而永远无法命中的后置规则，以及没有同策略的非必要包含规则。当前保留的 56 组跨策略包含关系均用于“专用策略优先、宽泛规则兜底”。

Netflix 官方移动交付域名参考：<https://openconnect.netflix.com/mobiledeliverydomains.txt>。Netflix 官方说明其网页使用 AWS、视频内容由 Open Connect 提供；网段按 RIPEstat 当前公布的 AS2906 路由聚合，快照日期为 2026-08-23。
