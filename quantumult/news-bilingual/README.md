# NewsBilingual 0.2.1 — Quantumult X 新闻双语

默认 Google 翻译，可切换 DeepL、Gemini、DeepSeek。适配目标是 WSJ、NYT、FT 和《经济学人》的文章 HTML / WebView。点击“**双语**”后逐段显示英文原文和中文；“**原文**”隐藏译文，再次显示会复用当前页面会话中的翻译。支持长段落分割、按总长度组批、停止、失败续译和页面切换时取消旧结果。

**当前状态：网页方案已完成本地浏览器验证，Google 已做真实接口测试；尚未在 iPhone、Quantumult X 和四款 App Store 正式版 App 中实测。不能据此声称四款 App 的每篇新闻均可用。**

## 一个脚本和一次导入是什么关系

现在全部运行逻辑合并为 **一个 `NewsBilingual.js`**，不再需要旧版的三个 JS，也不需要 Data 目录文件。

- `.snippet` 告诉 Quantumult X 拦截哪些请求、在哪个阶段运行脚本。
- `.js` 包含按钮、正文处理和翻译逻辑。本功能需要 JS，普通文本替换规则无法完成按需翻译。
- `.snippet` 引用远程 JS 时，Quantumult X 自动加载 JS，用户只需要添加 **一个重写订阅链接**，无需手动导入 JS。
- 你提供的 [DualSubs Spotify 配置](https://github.com/DualSubs/Spotify/releases/latest/download/DualSubs.Spotify.snippet) 也采用远程 JS 引用，配置本身并不包含完整业务逻辑。

当前目录没有已发布的公共地址，因此随包提供的 `NewsBilingual.snippet` 是**本地脚本配置**，不是已经上线的远程订阅。

## 本地安装

1. 若已装上一版，先停用旧 NewsBilingual 重写，避免两个版本同时匹配。
2. 只将 **`NewsBilingual.js`** 放入“文件 → 我的 iPhone → Quantumult X → Scripts”（或 Quantumult X 的 iCloud Scripts 目录）。不要将整个 ZIP 当成重写导入。
3. 打开 Quantumult X 配置编辑器，将 `NewsBilingual.snippet` 中三条 `^https:` 开头的规则追加到 `[rewrite_local]` 下，保持文件中的顺序；将 `hostname` 的域名追加到已有 `[mitm]` 的 `hostname` 列表，不要覆盖其他域名。
4. 启用重写、MitM，并安装和信任 Quantumult X 的 MitM 证书。需要支持 `script-analyze-echo-response` 的版本。
5. 在 Safari 打开 `https://www.ft.com/__news_bilingual__/v2/diagnostic`。若看到 NewsBilingual 诊断页，说明本地脚本路由已运行；点“测试翻译”可继续检查翻译网络。若看到 FT 的 404 页面，说明重写没有命中。
6. 打开你有权限阅读的文章，看到“Google / 双语 / 原文”后点“双语”。App 内使用相同 HTML 链路的正文也可尝试。

## 只导入一个远程链接

将未填写密钥的 `NewsBilingual.js` 放到你控制的 HTTPS 静态目录（例如 GitHub raw 文件目录），然后运行：

```sh
node quantumult-x/tools/build.cjs 'https://raw.githubusercontent.com/你的账号/你的仓库/main/quantumult-x'
```

这会生成 `NewsBilingual.remote.snippet`，三条规则都引用同一个远程 JS 地址。将这个 `.snippet` 一起上传，再把它的 raw HTTPS 地址添加到 Quantumult X“重写 → 引用”。**构建命令不会上传文件，不会创建 GitHub 仓库。**上传后应确认 JS 地址直接返回代码，而不是 GitHub 的 HTML 预览页。

`build.cjs` 会重新生成 JS，请在发布的文件中保留空密钥。不要把填写了真实 API Key 的脚本上传到公开目录。远程安装建议用下面的 BoxJS 配置，以免脚本更新覆盖设置。

## 配置翻译服务

Google 默认免 Key，使用 `translate.googleapis.com/translate_a/single` 非正式接口；当前测试成功不代表它有可用性保证。正文会在点击“双语”后发往所选翻译服务，不会静默换用另一家。

本地用户可编辑 `NewsBilingual.js` 顶部 `LOCAL_CONFIG`：

| 字段 | 用途 |
|---|---|
| `provider` | 默认服务：`google` / `deepl` / `gemini` / `deepseek` |
| `deeplKey` | DeepL API Key，不是 DeepL 网页登录密码 |
| `deeplApiHost` | 免费 API：`api-free.deepl.com`；付费 API：`api.deepl.com` |
| `geminiKey` / `geminiModel` | Gemini API Key 与账户可用的模型 ID |
| `deepseekKey` / `deepseekModel` | DeepSeek API Key 与账户可用的模型 ID |

可选的 `NewsBilingual.boxjs.json` 是 BoxJS 应用配置，不是第二个必需运行脚本。已使用 BoxJS 的用户可将它作为应用订阅导入后填写设置并保存。BoxJS 中的 `NewsBilingual.*` 值优先于 `LOCAL_CONFIG`，更新设置后需要重新载入文章。此 JSON 结构已按 DualSubs 的公开 BoxJS 配置核对，未在手机 BoxJS 中实测。

API Key 只在 Quantumult X 脚本侧使用，不放入注入网页、状态接口或翻译请求正文；新闻站点 Cookie 和 Authorization 不会转发给翻译服务。译文仅做内存缓存，不持久保存全文；重新载入页面后可能再次调用服务。

## App 兼容边界

Quantumult X 改写的是网络响应。能注入按钮的前提是 App 的正文使用可改写的 HTML，并允许执行页面脚本。纯原生 UI 接收 JSON / Protobuf 后绘制正文时，改写响应不能凭空创建原生按钮。DualSubs 可以使用 Spotify 已有的歌词界面显示改写后的歌词，这不等于新闻 App 也有可复用的双语控件。

以下情况需要基于真实正文响应进一步适配：正文走其他域名或 API；证书固定使 MitM 失败；离线缓存没有经过重写；页面 CSP 不允许注入脚本或同源请求；正文不是常规文章节点。当前规则只覆盖四家站点的主域名及 `www`，未臆造原生 App API。

当前实现保留 CSP，复用 `script-src-elem` / `script-src` 中可用的 nonce。从已渲染的文章正文节点提取文本，跳过 `hidden`、`aria-hidden`、`display:none` 和 `visibility:hidden` 的节点，不从内部 JSON 中提取全文。文章订阅与访问权限仍由原站控制。

因此“全部是 App Store 最新版”能描述目标，但不能替代实测。要定位没有按钮的 App，需要其 Quantumult X HTTP Analyzer 中实际文章请求的 URL、Content-Type、响应正文结构，以及 App 版本号；提供样本时去掉 Cookie、Authorization 和账户信息。

## 查看日志

打开 Quantumult X 的“网络活动”，顶部切换到第 4 个“脚本记录”按钮，搜索 `NewsBilingual`。0.2.1 会记录正文响应是否跳过、是否注入按钮、本地页面脚本是否加载、使用哪个翻译服务、服务 HTTP 状态和错误原因；不会记录文章全文或 API Key。

同时在“网络活动”的 TCP 请求中搜索新闻域名。MitM 成功通常显示绿锁，重写实际修改响应时会显示红色铅笔。打开记录可看命中的规则和 Content-Type。如果 App 正文请求是 JSON / Protobuf，且没有 HTML 页面加载记录，现有 WebView 方案无法在原生正文中显示按钮。

## 本地验证

```sh
node quantumult-x/tools/build.cjs
node --test quantumult-x/tests/core.test.cjs
# 浏览器测试需要安装 Playwright，并通过 CHROME_PATH 指定 Chrome 可执行文件（macOS 默认已设）。
node quantumult-x/tests/browser.cjs
# 可选，真实 Google 网络测试，只发送两句人工测试文本：
node quantumult-x/tools/google-smoke.cjs
python3 quantumult-x/tools/package.py
```

具体测试边界见 `VALIDATION.md`。四家域名的浏览器测试使用人工 HTML 样本，不能等同于对应 App 的真实响应。

参考：[Quantumult X 官方配置与脚本 API](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)、[DeepL 翻译 API](https://developers.deepl.com/api-reference/translate/request-translation)、[Gemini generateContent](https://ai.google.dev/api/generate-content)、[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)。
