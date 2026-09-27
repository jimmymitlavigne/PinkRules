# 0.4.0 验证记录

日期：2026-09-27。环境：macOS、Node.js、无头 Chrome，390 × 844 手机视口。
输入为用户最新的 `2026-09-25-013508_new.zip`，只读解压到临时目录。抓包正文、请求头、Cookie、账户数据未写入公开交付物；测试不向外部服务发送新闻正文。

## 新抓包与改写检查

| 检查 | 结果 |
|---|---|
| 请求总数 | 4,101 |
| FT __origami/service/image 图片 | 824；正文规则命中 0 |
| NYT Asset 文章 | 26；全部注入且可重新解析 JSON |
| NYT 栏目 / 空响应 | 1 / 1；保持不变 |
| FT startupcheck | 2；只追加 executeJavascript，已有代码和其他字段逐一比较一致；重复处理不重复追加 |
| FT 结构化正文 | 26；全部保持原始响应 |
| WSJ WebView | 1；只增加加载器，移除加载器后与原文完全一致 |
| WSJ ArticleContent | 82 条响应；全部保持原始响应，仅记录结构类型 |
| Economist ArticlesQuery | 1 条响应含 16 篇文章；保持原始响应，仅记录结构类型 |
| 所选正文/启动响应解码错误 | 0 |

全包另外有两条不完整 HTTP 分块响应：6628、6704，属于 subscriptions.shared-data.dowjones.io/gateway/subscriptions。这两条不属于正文/启动入口，未补造内容，未用于改写回放。

## FT 入口依据

- 抓包中的 startupcheck 为 POST，Origin 与 Referer 为 https://app.ft.com。
- 2026-09-27 读取官方公开 app.ft.com 页面所引用的 v402.0.0 App JS，确认它在 startupcheck 成功后调用 `data.executeJavascript && eval(data.executeJavascript)`，并使用 `.n-content-body` 选择器。
- 新代码仅在 HTTPS FT 页面、顶层窗口执行；保持原 executeJavascript，在其后追加独立加载器。已有加载器或已启动客户端时不重复创建。
- 这证明该公开版本存在入口，不证明用户手机缓存的 App 代码完全相同。

## 自动检查

- 核心测试 12/12：HTML/NYT JSON 分流、CSP nonce、FT 启动代码保真、重复注入、方法/路由限制、三家结构化正文保真、八条订阅规则、四个翻译服务协议、密钥隔离、输入限制、错误/超时、诊断数据不含正文或密钥。
- 浏览器交互通过：四个主域名人工 HTML 样本、CSP、长段落、隐藏内容过滤、四个模拟服务、缓存复用、限流后仅补译缺失段落、切页丢弃旧结果、控件被移除后恢复、hidden 解除后显示、翻译中再次点击取消等待、诊断页。
- 真实正文离线回放：26 个 NYT 页面（879 段）+ 1 个 WSJ WebView（57 段）全部通过按钮显示、点击翻译、隐藏、再次显示缓存且无新增请求。
- FT：以一篇抓包文章的 12 个顶层段落重建 `.n-content-body` 测试页，通过真实 startupcheck 的新增代码启动客户端并完成相同交互。此项是重建 DOM 测试，不是 FT App 运行测试。
- 合计 28 个测试页面、948 个段落。翻译全部使用本地模拟；所有页面请求被拦截，原站脚本不执行，无页面外部网络请求、无页面截图。
- 先前 0.3.1 最终交互检查因审批服务额度未能运行的限制，本轮已通过实际 Chrome 测试解除。

复现入口：`node --test tests/core.test.cjs`、`node tests/browser.cjs`、`node tools/replay-capture.cjs <export-directory> --browser`。后两项需要 Playwright 和 Chrome。

## 交付边界

- 待 iPhone Quantumult X 与最新版 App 实测 NYT、FT 启动入口、WSJ WebView 的 MITM、脚本加载、按钮与真实翻译。旧缓存可能不触发网络改写。
- WSJ 原生正文和经济学人 App 没有已验证的按钮入口，本版仅诊断。四款 App 全部正文有按钮的要求仍未完成，不能以结构化 JSON 已命中作为成功证据。
- Google 使用非正式接口；0.3.0 曾对两句人工文本完成真实请求，本轮只做模拟协议检查。DeepL/Gemini/DeepSeek 真实 API 及 BoxJS 手机配置仍待验证。
- 不改账户、订阅、访问权限或付费墙。
