# 0.3.0 验证记录

验证日期：2026-09-25。运行环境：macOS，Node.js 25，隔离的无头 Chrome（390 × 844 手机视口）。

已完成：

- Node 核心测试 9 项通过：HTML / JSON 分流、NYT `Asset` GraphQL Hybrid HTML 注入、重复注入、CSP nonce、单 JS 路由、四个翻译服务的协议、密钥不泄露、输入与来源校验、限流与超时。
- Safari 诊断页与 `[NewsBilingual]` QX 日志输出已加入自动检查；真机日志入口仍需在用户设备确认。
- 浏览器集成测试通过：四家主域名下的人工 HTML 样本、nonce CSP、长段落分片与总长度组批、短段落及引文、跳过隐藏正文、四种服务切换、原文/双语切换不重复请求、部分失败后的续译、切页时隔离旧结果。
- 对用户导出的 NYT App 真机响应记录 3018 做离线回放：gzip 解压后 JSON 为 725,681 字节，脚本保持文章数据并向 `data.anyWork.hybridBody.main.contents` 注入且只注入一个绝对地址加载器；输出 725,797 字节，可重新解析为 JSON。
- 用户抓包共含 2,778 条请求。NYT 正文端点已定位为 `samizdat-graphql.nytimes.com/graphql/v2?operationName=Asset`；FT 会话只观察到图片、Origami 静态资源、推荐、评论、音频可用性与分析事件，没有正文响应。
- Google 真实网络测试通过：同一个 QX 脚本通过 Node fetch 适配器，翻译两句人工测试文本，分别得到“央行维持利率不变。”和“全球贸易增长了百分之三。”。
- 手机视口截图：`qa/browser-mobile.png`；截图中的 DeepSeek 译文是模拟响应。

未完成：

- iPhone 上 Quantumult X 的真实重写、MitM、超时和 `$task.fetch` 行为。
- 修改后的 0.3.0 在 iPhone NYT App 中的按钮显示和点击翻译复测。
- FT 的网络正文来源；当前抓包所打开文章由本地缓存或未导出的 App 数据层提供。
- WSJ 与 Economist App Store 正式版的正文抓包及按钮测试。
- DeepL、Gemini、DeepSeek 的真实付费 API 调用和模型可用性（没有提供 API Key）。
- BoxJS 手机端导入测试及远程托管地址的下载验证。

结论：可交付单 JS 的 HTML / WebView 实现，并已按真实 NYT App GraphQL 结构增加注入；不能标记“四个原生 App 全量兼容已验证”。
