# Quantumult 资源整理清单

这份清单可以和 `quantumult/` 一起上传，用于后期更新和溯源。

清单不包含配置全文、节点订阅、服务器、证书、token 或密码。

## 总览

- 准备上传：82
- 保留上游：11
- 下载失败：4
- 完整性校验：82 个准备上传文件均与原始下载缓存字节一致，未发现缺失或不一致。

## 来源处理结果

- `blackmatrix7/ios_rule_script`: 准备上传 2
- `crossutility/Quantumult-X`: 保留上游 1
- `ddgksf2013/Rewrite`: 下载失败 1
- `DivineEngine/Profiles`: 下载失败 1
- `DualSubs/Spotify`: 保留上游 1
- `DualSubs/Universal`: 保留上游 1
- `gist:Sliverkiss`: 下载失败 1
- `jimmymitlavigne/PinkRules`: 准备上传 19
- `jimmymitlavigne/pinkrules`: 准备上传 26
- `Koolson/Qure`: 准备上传 27
- `KOP-XIAO/QuantumultX`: 保留上游 3
- `Neurogram-R/Quantumult-X`: 准备上传 1
- `NobyDa/Script`: 保留上游 1
- `NSRingo/Maps`: 保留上游 1
- `NSRingo/Siri`: 保留上游 1
- `NSRingo/TV`: 保留上游 1
- `NSRingo/WeatherKit`: 保留上游 1
- `Orz-3/QuantumultX`: 下载失败 1，准备上传 1
- `Semporia/TikTok-Unlock`: 准备上传 1
- `Sliverkiss/QuantumultX`: 准备上传 1
- `wf021325/qx`: 准备上传 2
- `Xhy333/QuantumultX`: 准备上传 2

## 下载失败

- line 164, `ddgksf2013/Rewrite`, tag `xhs`: `https://raw.githubusercontent.com/ddgksf2013/Rewrite/master/AdBlock/XiaoHongShu.conf` (HTTP 404: HTTP Error 404: Not Found)
- line 171, `DivineEngine/Profiles`, tag `神机规则重定向`: `https://raw.githubusercontent.com/DivineEngine/Profiles/master/Quantumult/Rewrite/General.conf` (HTTP 404: HTTP Error 404: Not Found)
- line 172, `Orz-3/QuantumultX`, tag `JS脚本合集`: `https://raw.githubusercontent.com/Orz-3/QuantumultX/master/JS.conf` (HTTP 404: HTTP Error 404: Not Found)
- line 182, `gist:Sliverkiss`, tag `顺丰`: `https://gist.githubusercontent.com/Sliverkiss/1fb1cf9cd7486d30752b1ba29b871e37/raw/sfsy.js` (HTTP 404: HTTP Error 404: Not Found)

## 说明

- `准备上传`：已复制或下载到 `quantumult/`，等你确认后才会上传。
- `保留上游`：你指定不整理到自己仓库的来源，配置继续使用原链接。
- `下载失败`：远端返回 404，配置继续保留原链接。
- `quantumult_resource_manifest.csv` 是机器可读明细，可以和资源目录一起上传。
