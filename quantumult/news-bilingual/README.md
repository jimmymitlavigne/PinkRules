# NewsBilingual 0.4.1

Quantumult X 新闻双语与正文广告隐藏。默认 Google 翻译，可配置 DeepL、Gemini、DeepSeek。

## 安装 / 更新

在 QX「重写引用」添加或刷新：

https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.snippet

只需导入这一个链接；必需的 JS 会通过订阅自动加载。启用重写与 MitM，安装并信任 QX 证书，使用订阅中的 hostname。避免同时启用重复版本。

更新后确认版本为 **0.4.1**，完全退出再打开新闻 App。FT 需要重新触发启动请求。已缓存的文章可能不产生网络请求，需打开未缓存文章复测。

## 使用

- 正文右下角只有一个按钮：**显示双语 ⇄ 显示原文**。
- 点击“显示双语”开始逐段翻译；再次点击隐藏译文并停止后续批次。已发出的服务请求可能继续完成，但迟到的结果不会显示。
- 已完成的译文在当前页面内存缓存，切换显示不重复请求。
- **默认隐藏已识别的页面广告位并收起占位空白**，不需要先点翻译。包括 NYT 广告容器、FT 广告插槽及明确标记的广告位；动态加入的广告同样处理。
- 广告隐藏仅在识别到文章页面时生效；不按“广告”等正文文字、图片说明或普通 iframe 判断广告。新闻图片、图表和视频保留。

## 适配范围

| App / 页面 | 当前范围 |
|---|---|
| NYT App | HTML 正文已接入按钮及广告隐藏；待 iPhone 实测。 |
| FT App | 通过启动脚本入口加载客户端，在文章 DOM 隐藏广告和提供按钮；待 iPhone 实测。 |
| WSJ App | WebView 文章已接入；原生正文及原生广告尚未适配。 |
| 经济学人 App | 目前只识别正文接口，原生正文按钮和广告尚未适配。 |

**尚未实现四款 App 全部正文支持。** HTML/WebView 广告隐藏不会自动作用于原生控件，未知或未标记的广告也可能保留。离线浏览器检查使用模拟翻译；FT 使用重建 DOM，不能替代最新版 iPhone App 实测。

## 配置

已有 BoxJS 的用户可添加 [配置订阅](https://raw.githubusercontent.com/jimmymitlavigne/PinkRules/master/quantumult/news-bilingual/NewsBilingual.boxjs.json)。配置保存在 QX 本机，修改后重新打开文章。

| 字段 | 用途 |
|---|---|
| provider | google / deepl / gemini / deepseek |
| removeAds | true 默认开启广告隐藏；false 关闭 |
| deeplKey / deeplApiHost | DeepL Key；免费 api-free.deepl.com，付费 api.deepl.com |
| geminiKey / geminiModel | Gemini Key 与可用模型 ID |
| deepseekKey / deepseekModel | DeepSeek Key 与可用模型 ID |

Google 使用非正式免 Key 接口，可用性由服务方决定；其他服务需要自己的 Key，不会自动切换服务。Key 留在 QX 脚本端，不传入网页。真实付费 API 和 BoxJS 手机配置仍待验证。

## 日志与诊断

在 Safari 打开 [诊断页](https://www.ft.com/__news_bilingual__/v2/diagnostic)，查看版本、内容命中、客户端加载和翻译结果，也可测试翻译服务。

QX「网络活动 → 脚本记录」搜索 `NewsBilingual`：

- `loader injected`：HTML 已加入加载器。
- `bootstrap appended format=ft-startup`：FT 启动响应已加入加载入口。
- `client.js served`：客户端请求已到达 QX。
- `translate start / success / error`：翻译请求及结果。
- `structured article detected`：识别到结构化正文，不表示按钮已注入。

诊断仅保存域名、版本、时间、类型及结果，不保存正文、Cookie 或 Key。所选翻译服务仅在点击按钮后接收可见的待译文字。

## 发布文件

本目录仅保留 `NewsBilingual.js`、`NewsBilingual.snippet`、`NewsBilingual.boxjs.json`、本说明四个文件。源码拆分、测试、抓包分析工具和验证记录保留在本地，不随后续版本发布。抓包、截图、账户数据和真实 API Key 不作为发布文件。
