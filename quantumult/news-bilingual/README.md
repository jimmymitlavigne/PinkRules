# NewsBilingual 0.6.0

Quantumult X 新闻双语与正文广告隐藏。默认 Google 翻译，可配置 DeepL、Gemini、DeepSeek。

## 安装 / 更新

在 QX「重写引用」添加或刷新：

https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.snippet

只需导入这一个链接；必需的 JS 会通过订阅自动加载。启用重写与 MitM，安装并信任 QX 证书，使用订阅中的 hostname。避免同时启用重复版本。

更新后确认版本为 **0.6.0**，完全退出再打开新闻 App。FT 需要重新触发启动请求。已缓存的文章可能不产生网络请求，需打开未缓存文章复测。

## 0.6.0：经济学人实验性适配

根据新抓包加入 `ArticleQuery` 单篇正文、`ArticlesQuery` 批量正文、首页和专题列表适配。仅将已识别文章的 `contentIdentity.forceAppWebView` 从 false 改为 true，尝试让 App 使用自身的网页正文入口，再由 HTML 重写加载翻译按钮。默认开启，可在诊断设置页关闭“经济学人 WebView 入口（实验性）”。

**这个字段已在真实响应中验证存在，但 App 是否实际切换、是否沿用登录状态及按钮能否显示仍待 iPhone 实测。** 不将“已请求 WebView”当作按钮加载成功。若出现登录提示、页面打不开或阅读异常，请关闭该开关后重开文章；已有缓存可能需要重新联网加载。正文、图片、音频、文章 URL、权限字段与广告标签均保留。

抓包回放：293 条记录中 8 个响应、284 处标志改写通过字段保真检查；其中单篇正文 4 条。5 条 Google 投放请求没有响应头/体，无法据此验证去广告效果。新增对投放接口直接返回完整 HTML 广告的清空处理；未把广告分类标签 `ABS/BSC` 当作广告开关。

## 使用

- 支持的正文右下角只有一个按钮：**显示双语 ⇄ 显示原文**，采用 Liquid Glass 风格胶囊、半透明背景模糊、高光、明暗模式与按压反馈。兼容减少动态效果、减少透明度和增强对比度；这是网页样式模拟，不是 iOS 原生材质 API。
- 点击“显示双语”开始逐段翻译；再次点击隐藏译文并停止后续批次。已发出的服务请求可能继续完成，但迟到的结果不会显示。
- 已完成的译文在当前页面内存缓存，切换显示不重复请求。
- **默认隐藏已识别的页面广告位并收起占位空白**，不需要先点翻译。包括 NYT 广告容器、FT 广告插槽及明确标记的广告位；动态加入的广告同样处理。
- **默认清理已识别的 Google 广告投放、Amazon 移动广告竞价、SafeFrame 广告框架响应**。Google 流式响应保留元数据并替换广告 HTML；原生 JSON 清空广告网络列表；Amazon 使用抓包中已有的空广告结构。直接返回完整 HTML 的 Google 广告文档也清空；未知格式保持原样。此功能在响应到达后执行，可单独关闭，也会影响其他 App 使用的相同广告接口。
- 广告隐藏仅在识别到文章页面时生效；不按“广告”等正文文字、图片说明或普通 iframe 判断广告。新闻图片、图表和视频保留。

## 适配范围

| App / 页面 | 当前范围 |
|---|---|
| NYT App | HTML 正文已接入按钮及广告隐藏；待 iPhone 实测。 |
| FT App | 通过启动脚本入口加载客户端，在文章 DOM 隐藏广告和提供按钮；待 iPhone 实测。 |
| WSJ App | WebView 文章已接入；原生正文按钮未实现；匹配到的通用广告响应可清理，空位不保证消失。 |
| 经济学人 App | 实验性请求 App 切换 WebView 后提供按钮；尚未真机确认。匹配到的通用广告响应可清理，原生空位不保证消失。 |

**尚未实现四款 App 全部正文支持。** 页面广告隐藏作用于 HTML/WebView；新增的响应清理可处理匹配接口的原生广告数据。未知广告格式、缓存广告及原生控件的占位仍可能保留。离线浏览器检查使用模拟翻译；FT 使用重建 DOM，不能替代最新版 iPhone App 实测。

## 在诊断页管理设置

开启 QX 和最新重写后，在 **iPhone Safari** 打开：

[NewsBilingual 诊断与设置](https://news-bilingual.invalid/__news_bilingual__/v2/diagnostic)

也可从原 [诊断页](https://www.ft.com/__news_bilingual__/v2/diagnostic) 点击“管理翻译服务、API Key 和广告设置”。无需安装 BoxJS。

1. 选择 Google、DeepL、Gemini 或 DeepSeek。
2. 展开对应的 API 设置，填写 Key；可选择 DeepL Free/Pro、修改 Gemini/DeepSeek 模型 ID。
3. 按需切换“隐藏页面广告”“清理广告投放响应”和“经济学人 WebView 入口（实验性）”。
4. 点击“保存设置”，再点击“测试翻译”；保存后重新打开新闻文章，FT 建议完全退出 App 后重开。

Key 留空表示保留原值；勾选“清除已保存的 Key”并保存才会清除。保存后输入框清空，只显示“已配置/未配置”。现有 Key 不返回网页，不写入日志或 GitHub；设置使用 QX 本机 prefs，与 BoxJS 共用。

管理页使用独立的 `.invalid` 地址，由 QX 本地重写提供；设置提交不使用新闻网站域名。页面不加载第三方脚本，配置写入要求匹配的来源与版本。QX 未启用或新规则未生效时管理地址可能无法打开，请先更新订阅并确认 MitM 含 `news-bilingual.invalid`。手机实际加载仍需验证，已有 BoxJS 可继续使用。

本机抓包可能记录你向管理页提交的 Key；分享后续抓包时请排除 `/__news_bilingual__/v2/settings` 请求。

Google 使用非正式免 Key 接口；其他服务需要自己的 Key，不会自动切换服务。Key 仅用于对应的官方翻译 API。真实付费 API 仍待验证。

[可选 BoxJS 配置](https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.boxjs.json)：

| 字段 | 用途 |
|---|---|
| provider | google / deepl / gemini / deepseek |
| removeAds | true 默认隐藏页面广告；false 关闭 |
| cleanAdResponses | true 默认清理广告响应；false 关闭 |
| economistWebView | true 默认尝试经济学人 WebView 入口；false 保留原响应 |
| deeplKey / deeplApiHost | DeepL Key；api-free.deepl.com 或 api.deepl.com |
| geminiKey / geminiModel | Gemini Key 与模型 ID |
| deepseekKey / deepseekModel | DeepSeek Key 与模型 ID |

## 日志与诊断

在 Safari 打开 [诊断页](https://www.ft.com/__news_bilingual__/v2/diagnostic)，查看版本、内容命中、客户端加载和翻译结果，也可测试翻译服务。

QX「网络活动 → 脚本记录」搜索 `NewsBilingual`：

- `loader injected`：HTML 已加入加载器。
- `bootstrap appended format=ft-startup`：FT 启动响应已加入加载入口。
- `client.js served`：客户端请求已到达 QX。
- `translate start / success / error`：翻译请求及结果。
- `ad response cleaned`：广告响应已清理；不代表原生广告占位已消失。
- `economist webview requested`：已修改 App 的 WebView 偏好；只有后续 `loader injected`、`client.js served` 才证明进入网页客户端链路。
- `structured article detected`：识别到结构化正文，不表示按钮已注入。

诊断仅保存域名、版本、时间、类型及结果，不保存正文、Cookie 或 Key。所选翻译服务仅在点击按钮后接收可见的待译文字。

## 发布文件

本目录仅保留 `NewsBilingual.js`、`NewsBilingual.snippet`、`NewsBilingual.boxjs.json`、本说明四个文件。源码拆分、测试、抓包分析工具和验证记录保留在本地，不随后续版本发布。抓包、截图、账户数据和真实 API Key 不作为发布文件。
