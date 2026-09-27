# NewsBilingual 0.4.0 — Quantumult X 新闻双语

默认 Google 翻译，可切换 DeepL、Gemini、DeepSeek。点击“显示双语”显示逐段中文，点击“显示原文”隐藏译文。译文保留在当前页面内存中，切换显示不会重复请求；支持停止、长段落拆分和失败续译。

正文右下角只显示一个按钮：首次为“显示双语”，点击后开始翻译并变为“显示原文”。再次点击会隐藏译文并停止未完成的翻译等待；下次显示双语时复用已完成的译文。服务选择通过 BoxJS 的 provider 配置完成，正文界面不再放下拉菜单或额外按钮。

## 安装与更新

在 Quantumult X 的重写引用中添加或刷新这个链接：

https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.snippet

只需导入这一个链接。它引用同目录下的一个 `NewsBilingual.js`；JS 是必需的，但不需要手动导入。可选的 BoxJS 文件用于保存翻译服务配置。

1. 启用此重写引用和 MitM，安装并信任 QX 的 MitM 证书。避免同时启用多份 NewsBilingual。
2. 更新后确认订阅显示 `#!version=0.4.0`，MitM 包含订阅中的全部 hostname，尤其是 `samizdat-graphql.nytimes.com`、`app-api.ft.com`、`app.ft.com`、`webview.wsj.com`。
3. 完全关闭再打开新闻 App，选择一篇尚未缓存的文章。FT 需要重新触发启动请求；只切换文章可能不会触发。旧的离线文章可能没有网络请求，因而不会经过脚本。
4. 在 Safari 打开 [诊断页](https://www.ft.com/__news_bilingual__/v2/diagnostic)。应显示 0.4.0；点击“测试翻译”可单独检查所选翻译服务。

远程 JS 和注入客户端地址都带版本参数，减少更新后继续使用旧脚本的情况。

## 基于新抓包的适配范围

本版针对 `2026-09-25-013508_new.zip`，共 4,101 条请求。新版文件确实包含四家的正文响应。

| 对象 | 证据与处理 | 验证边界 |
|---|---|---|
| NYT App | 26 条 Article 包含 `data.anyWork.hybridBody.main.contents` 完整 HTML；注入一个加载器。 | 26 个真实正文 DOM 离线回放通过，iPhone 待验证。 |
| FT App | 26 条文章返回结构化树；2 条 `POST app-api.ft.com/startupcheck` 带 `executeJavascript`。在该字段末尾追加客户端加载器，观察 `.n-content-body`，不修改正文 JSON。 | FT 官方公开 App 脚本确认会 eval 此字段；抓包 Origin 为 app.ft.com。启动字段保真检查与重建 DOM 交互通过，iPhone 待验证。 |
| WSJ App 的 WebView 文章 | `webview.wsj.com/webview/...` 返回完整 HTML，新增域名与本地接口规则。 | 1 个真实页面、57 段离线回放通过。 |
| WSJ App 的原生文章 | 82 条 `ArticleContent` 返回 `articleBody` 段落数组。 | 仅记录命中信息，尚无悬浮按钮入口；不算支持。 |
| 经济学人 App | `ArticlesQuery` 的 `findArticles` 返回 16 篇文章，body 为 ParagraphComponent 等结构化组件。 | 仅记录命中信息，尚无悬浮按钮入口；不算支持。 |

**四款 App 的每篇正文都有按钮这一交付要求尚未满足。** QX 网络重写不会自动给原生控件增加按钮。向这些段落字符串塞入 `<script>` 或 `<button>` 不能当作有效适配，本版保持其原始响应。FT 有已确认的页面脚本入口，因此另行接入；经济学人和 WSJ 原生文章没有在本次数据中找到同等入口。

浏览器回放禁用了原站脚本，翻译使用本地模拟响应。FT 测试页从抓包段落重建，未运行整个 FT App。以上结果不等同于最新 iOS App 真机成功。不会修改访问权限、付费墙、账户状态；仅点击“显示双语”后才向选定服务发送可见正文。

FT 入口依据：[官方公开 App 页面](https://app.ft.com/)及其 [v402.0.0 App 脚本](https://app.ft.com/dist/v402.0.0/f7cc50f67a324bc3c8b1/js/app.js)，2026-09-27 核对了 `data.executeJavascript && eval(data.executeJavascript)` 与 `.n-content-body`。公开 Web App 版本与手机缓存的版本可能不同，仍需真机核对。

## 日志与诊断

在 QX“网络活动 → 脚本记录”中搜索 NewsBilingual。NYT 正文经过改写时可看到：

```text
[NewsBilingual v0.4.0] loader injected format=nyt-graphql path=/graphql/v2 ...
[NewsBilingual v0.4.0] client.js served host=www.nytimes.com
```

第一行说明 HTML 中加入了加载器，第二行说明客户端请求到达 QX；两者本身不证明按钮已渲染。点击“显示双语”后应出现 `translate start`、服务的 HTTP 状态和 `translate success` 或 `translate error`。

FT 启动入口命中时日志为 `bootstrap appended format=ft-startup`，随后应出现 `client.js served host=app.ft.com`。WSJ WebView 为 `loader injected format=html`，随后 `client.js served host=webview.wsj.com`。`structured article detected` 仅表示识别到结构化正文，不表示按钮已经注入。

诊断页会显示最近一次“最近响应 / 正文注入 / 客户端加载 / 翻译结果”的时间和版本，也分别显示 NYT、FT、WSJ、经济学人的最近内容命中状态。记录保存在 QX 本机，只包含域名、格式、服务、状态码等运行信息，不保存文章全文、Cookie 或 API Key。这是最近事件，可能来自其他文章或诊断测试，判断时需核对时间；最近响应的 HTTP 数字表示新闻服务器响应状态；翻译结果的 HTTP 数字表示本地翻译接口结果码。

## 配置翻译服务

Google 默认免 Key，使用 translate.googleapis.com 的非正式接口，服务可用性由其运营方决定。其他服务需要对应 API Key；脚本不会自动改用另一家。

可将 [BoxJS 配置](https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.boxjs.json) 添加到已有 BoxJS，填写并保存设置；更新后重新载入文章。BoxJS 手机端导入仍待实测。

| 字段 | 用途 |
|---|---|
| provider | google / deepl / gemini / deepseek |
| deeplKey | DeepL API Key |
| deeplApiHost | 免费 api-free.deepl.com，付费 api.deepl.com |
| geminiKey / geminiModel | Gemini API Key / 可用模型 ID |
| deepseekKey / deepseekModel | DeepSeek API Key / 可用模型 ID |

本地安装也可编辑 JS 顶部的 LOCAL_CONFIG。NewsBilingual.* BoxJS 设置优先于脚本默认值。API Key 只在 QX 脚本端使用，不传入网页。真实付费 API 尚未测试。

## 源码与验证

在包含 src/、tools/、tests/ 的项目目录运行：

```sh
node tools/build.cjs 'https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual'
node --test tests/core.test.cjs
# 需要 Playwright；CHROME_PATH 可指定 Chrome 可执行文件。
node tests/browser.cjs
# 可选：只读本地 QX 导出，所有页面请求被拦截，译文使用本地模拟。
node tools/replay-capture.cjs '/path/to/unpacked-export' --browser
```

构建生成的 NewsBilingual.snippet 使用本地 JS；NewsBilingual.remote.snippet 使用远程 JS。发布时将后者作为公开的 NewsBilingual.snippet。本地使用者把 JS 放入 QX Scripts，并将本地配置中的八条规则和 hostname 分别合入 [rewrite_local] 与 [mitm]。

验证细节见 [VALIDATION.md](VALIDATION.md)。抓包原文件、新闻正文、请求头和账户信息不包含在公开仓库中。

参考：[QX 官方重写说明](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)、[DualSubs Spotify](https://github.com/DualSubs/Spotify/releases/latest/download/DualSubs.Spotify.snippet)。QX 官方说明指出正文改写会自动处理长度与编码响应头，因此本脚本不手工处理 gzip 或 Content-Length。
