# 源码核对笔记

研究日期：2026-09-22。固定版本：`93cf3ffcf5a2e6814644d1747a101272557d7eac`。

[返回项目说明](research.md)

## 核对方法与事实

通过 GitHub 仓库 API、完整递归文件树、公开原始文件和网页读取代码，没有执行上游采集程序。文件树响应 `truncated=false`，其中分类 Markdown 文件为 1,000 个，没有发现 epub、mobi、azw3、pdf 扩展名文件。仓库根目录没有独立 LICENSE，API 返回 license=null；这只说明本次未确认许可证。

统计文件记录 24,071 条目录数据。这里沿用上游快照，没有重新抓取或计算去重后的独立书籍数量。书籍下载链接的有效性、文件质量以及上游描述的平台覆盖比例未测试。

## 结论与代码对应

| 结论 | 固定版本依据 |
| --- | --- |
| 1,000 个分类、24,071 条记录及热门标签数量 | [docs/parse-stats.json](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/docs/parse-stats.json) |
| 按标题、作者、分类匹配；多关键词 AND；最多 100 条；优先读取 all-books.json | [docs/search.js](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/docs/search.js) |
| 合并分类表格而不跨分类去重；格式、语言、难度使用默认值 | [scripts/parse_md_to_json.py](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/parse_md_to_json.py) |
| requests + BeautifulSoup 提取元信息与诚通网盘链接 | [scripts/sync/parse_book_detail_enhanced.py](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/sync/parse_book_detail_enhanced.py) |
| 按标签重复归类、过滤缺少下载地址的记录、并发调度、保存状态 | [scripts/sync/test_batch_sync.py](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/sync/test_batch_sync.py) |
| 比较最大 ID，仅采集新增范围 | [scripts/sync/incremental_sync.py](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/sync/incremental_sync.py) |
| 每日 UTC 02:00 调度，需要 BOOK_SITE_DOMAIN Secret | [.github/workflows/incremental-sync.yml](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/.github/workflows/incremental-sync.yml) |
| 手动全量同步工作流 | [.github/workflows/full-sync.yml](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/.github/workflows/full-sync.yml) |
| 当指定源码/目录文件变动时生成网站 | [.github/workflows/generate-site.yml](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/.github/workflows/generate-site.yml) |

## 复用自动同步前需要核查的实现

以下是代码静态分析，不是实际运行后复现的故障。本次整理没有修改上游实现。

1. **分类文件可能被新增批次覆盖。** 增量脚本调用批处理入口；批处理只把当前请求范围的记录按标签组织，再调用 `generate_md_file`，后者使用 `write_text` 写整个分类文件。该路径没有读取并合并原分类记录，因而存在新增批次覆盖同标签历史内容的问题。
2. **失败请求也可能被标记为已处理。** 批处理最终把全部待处理 `book_ids` 加入 `processed_ids`，并将最大请求 ID 保存为进度；这不等于每个 ID 都成功解析。直接依靠该状态续跑，可能跳过此前请求失败的记录。
3. **增量初始化需要状态文件。** `load_max_book_id` 读取的是 `md/max_book_id.json`。根目录的 `max_book_id_found.txt` 不是该函数的读取来源。如果状态缺失，增量函数会返回失败，不能仅凭根目录存在文本 ID 就认定可以运行。
4. **定时增量不检查旧链接。** 只遍历较大的新 ID，不会自动发现旧书元信息变更或旧下载链接修复。

如以后复用，优先增加稳定书籍标识、分类数据合并、成功与失败状态区分、失败重试和旧链接检查。这里列出的是后续改进方向，不属于本次交付功能。

## 本次交付

- 建立 007 号子项目及元信息。
- 整理主题内容、记录字段、文件结构、功能边界、技术原理和个人价值。
- 通过现有索引工具同步总 README。
- 本项目没有上游运行截图、下载样本或采集实验结果。

## 网页交付与验证

2026-09-23 根据后续讨论，将研究结论收束为：**个人维护的电子书书目和外部下载链接目录，对我们的直接价值较低**。简明网页只保留文字说明、关键数字、目录结构、采集流程及核对来源，不再使用引导图或交互演示。`site/` 内的静态 HTML、CSS 和图标由构建脚本输出到 `web/007-ebook-treasure-chest/`。

这个结论是对使用价值的判断，不改变上面关于采集、分类、搜索和同步方式的源码核对事实。页面不提供电子书下载服务，也没有运行上游采集程序。
