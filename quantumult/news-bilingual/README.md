# NewsBilingual 0.3.1 — Quantumult X 新闻双语

默认 Google 翻译，可切换 DeepL、Gemini、DeepSeek。点击“显示双语”显示逐段中文，点击“显示原文”隐藏译文。译文保留在当前页面内存中，切换显示不会重复请求；支持停止、长段落拆分和失败续译。

正文右下角只显示一个按钮：首次为“显示双语”，点击后开始翻译并变为“显示原文”。再次点击会隐藏译文并停止未完成的翻译等待；下次显示双语时复用已完成的译文。服务选择通过 BoxJS 的 provider 配置完成，正文界面不再放下拉菜单或额外按钮。

## 安装与更新

在 Quantumult X 的重写引用中添加或刷新这个链接：

https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.snippet

只需导入这一个链接。它引用同目录下的一个 `NewsBilingual.js`；JS 是必需的，但不需要手动导入。可选的 BoxJS 文件用于保存翻译服务配置。

1. 启用此重写引用和 MitM，安装并信任 QX 的 MitM 证书。避免同时启用多份 NewsBilingual。
2. 更新后确认订阅显示 `#!version=0.3.1`，MitM 包含 `samizdat-graphql.nytimes.com`、`www.nytimes.com` 和 `app.ft.com`。
3. 关闭再打开 NYT App，选择一篇尚未缓存的文章。旧的离线文章可能没有网络请求，因而不会经过脚本。
4. 在 Safari 打开 [诊断页](https://www.ft.com/__news_bilingual__/v2/diagnostic)。应显示 0.3.1；点击“测试翻译”可单独检查所选翻译服务。

远程 JS 和注入客户端地址都带版本参数，减少更新后继续使用旧脚本的情况。

## 基于抓包的适配范围

| 对象 | 这次抓包的证据与处理 |
|---|---|
| NYT App | 26 篇 Article 的 GraphQL 响应包含 `data.anyWork.hybridBody.main.contents` HTML；逐篇离线回放已验证注入、按钮显示和模拟翻译切换。 |
| NYT 栏目数据 | 1 条 LegacyCollection 保持不变；空响应也不改写。 |
| FT | 804 条 `www.ft.com/__origami/service/image/` 图片请求全部排除，修复旧规则漏写一个下划线的问题。支持 app.ft.com 的网络 HTML，但抓包中没有该正文响应。 |
| WSJ、Economist | 保留主域名 HTML 支持；没有足够的 App 正文响应样本可验证。 |

**这些结果不等同于 iPhone App 实测成功。** 浏览器回放禁用了原站脚本，翻译使用本地模拟响应；无法验证 App 的缓存、WebView 运行方式或 QX 真机执行。FT 正文可能来自缓存，也可能未包含在本次导出中；仅凭这份文件无法确定原因。

交付目标是四款 iOS App 的正文右下角按钮点击翻译；当前属于 NYT 待真机复测的适配版本，四款 App 的整体交付尚未完成。

QX 可以改写网络 HTML，也可以改写 JSON 内明确的 HTML 字段。纯原生正文不会因为插入 HTML 就自动产生按钮。当前不修改访问权限、付费墙或账户状态；翻译服务只在点击“显示双语”后接收页面提取的正文。

## 日志与诊断

在 QX“网络活动 → 脚本记录”中搜索 NewsBilingual。NYT 正文经过改写时可看到：

```text
[NewsBilingual v0.3.1] loader injected format=nyt-graphql path=/graphql/v2 ...
[NewsBilingual v0.3.1] client.js served host=www.nytimes.com
```

第一行说明 HTML 中加入了加载器，第二行说明客户端请求到达 QX；两者本身不证明按钮已渲染。点击“显示双语”后应出现 `translate start`、服务的 HTTP 状态和 `translate success` 或 `translate error`。

诊断页会显示最近一次“最近响应 / 正文注入 / 客户端加载 / 翻译结果”的时间和版本。记录保存在 QX 本机，只包含域名、格式、服务、状态码等运行信息，不保存文章全文、Cookie 或 API Key。这是最近事件，可能来自其他文章或诊断测试，判断时需核对时间；最近响应的 HTTP 数字表示新闻服务器响应状态；翻译结果的 HTTP 数字表示本地翻译接口结果码。

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

构建生成的 NewsBilingual.snippet 使用本地 JS；NewsBilingual.remote.snippet 使用远程 JS。发布时将后者作为公开的 NewsBilingual.snippet。本地使用者把 JS 放入 QX Scripts，并将本地配置中的四条规则和 hostname 分别合入 [rewrite_local] 与 [mitm]。

验证细节见 [VALIDATION.md](VALIDATION.md)。抓包原文件、新闻正文、请求头和账户信息不包含在公开仓库中。

参考：[QX 官方重写说明](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)、[DualSubs Spotify](https://github.com/DualSubs/Spotify/releases/latest/download/DualSubs.Spotify.snippet)。QX 官方说明指出正文改写会自动处理长度与编码响应头，因此本脚本不手工处理 gzip 或 Content-Length。
