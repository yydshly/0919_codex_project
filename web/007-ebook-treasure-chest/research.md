# 007 · Ebook Treasure Chest · 个人电子书链接目录

**我们的结论：这是由个人维护、脚本定期更新的电子书书目与下载链接集合。** 仓库保存书名、作者、标签和外部网盘地址，书籍正文不在仓库里。它可以帮助读者查找已经收录的书；对我们的专业技术资料收集和产品建设，直接价值较低。保留此项目，主要是记录它组织目录和生成静态搜索页的方法。

这里的“个人收集库”指个人维护一个书目目录，并不意味着维护者亲自读过、挑选或推荐每本书。代码显示，目录主要通过抓取外部网站的书目和链接生成。

[返回总索引](../) · [上游仓库](https://github.com/jbiaojerry/ebook-treasure-chest) · [上游搜索页](https://jbiaojerry.github.io/ebook-treasure-chest/) · [本项目说明网页](./) · [源码核对笔记](notes.md)

## 项目信息

| 项目 | 内容 |
| --- | --- |
| 编号 | 007 |
| 核对版本 | `93cf3ffcf5a2e6814644d1747a101272557d7eac`（2026-01-13 提交） |
| 研究日期 | 2026-09-22 至 2026-09-23 |
| 技术 | Python、requests、BeautifulSoup、Markdown、JSON、原生 JavaScript、GitHub Actions 与 GitHub Pages |
| 授权信息 | 核对版本未发现独立 LICENSE；未确认明确的代码授权条款 |
| 验证范围 | 阅读仓库数据、代码和工作流；未运行采集或逐一下载书籍 |

## 它实际保存了什么

| 位置 | 内容 |
| --- | --- |
| `md/` | 按标签分组的 Markdown 表格，记录书名、作者和下载链接 |
| `docs/all-books.json` | 供网页搜索的汇总目录 |
| `docs/index.html`、`docs/search.js` | 静态网页及浏览器内关键词搜索 |
| `scripts/`、`.github/workflows/` | 采集、数据转换、增量或全量更新的代码与调度配置 |
| 第三方网盘 | 下载链接所指向的书籍文件，由外部服务提供 |

上游统计文件记录 **1,000 个分类文件、24,071 条书目记录**，以文学、历史、科普、管理等主题为主。一本书可以同时出现在多个标签下，所以 24,071 是目录条目数，不是去重后的独立书籍数。本次完整文件树查询未发现 EPUB、MOBI、AZW3 或 PDF 正文文件。下载这个 GitHub 仓库，得到的是目录和程序，不会得到整套书籍。[统计文件](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/docs/parse-stats.json)

目录转换脚本会默认填入 `ZH`、`Unknown` 和 `epub/mobi/azw3` 字段。这些字段不是对每个实际下载文件的验证；网盘链接能否访问、内容质量与具体格式仍需分别核对。[转换代码](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/parse_md_to_json.py)

## 如何设计与工作

```text
外部书籍网站的详情页与下载页
        ↓  Python 按书籍 ID 请求、解析
书名 / 作者 / 标签 / 网盘链接
        ↓  按标签写入 Markdown 表格
分类目录 md/
        ↓  汇总生成 JSON
浏览器加载整份目录 → 按书名、作者、分类匹配关键词
```

搜索发生在浏览器里，不会每输入一个词就重新搜索互联网；多关键词采用“所有词都匹配”的规则，最多显示 100 条。自动更新设计上比较新旧最大书籍 ID，主要采集新增记录；另有手动全量同步入口。采集依赖来源网站结构，网站改版或外链失效都会影响结果。[搜索实现](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/docs/search.js) · [增量同步](https://github.com/jbiaojerry/ebook-treasure-chest/blob/93cf3ffcf5a2e6814644d1747a101272557d7eac/scripts/sync/incremental_sync.py)

代码核对还发现，增量写分类文件时存在覆盖同标签旧记录的风险，失败请求也可能被记作已处理。详情见[源码核对笔记](notes.md)。这些是静态分析结论，尚未运行上游程序复现。

## 对我们的意义

**直接使用价值较低。** 该库的书目方向与我们关注的专业技术资料不够贴合，而且只给出外部下载入口。此前核对公开的 24,071 条搜索数据时，没有找到《架构师的自我修养》；这只是一个具体例子，不能由此推断所有技术书都缺失。它也没有书籍正文管理、个人阅读记录、全文检索或基于内容的 AI 问答。

唯一值得保留的设计参考是“用分类文件保存目录，生成一份统一搜索数据，再发布静态页面”。如果以后要做自己的资料索引，可以借鉴这条流程；但没有必要为使用现成书目而单独部署或继续扩建这个库。更重要的是围绕我们真正需要的资料建立来源、去重、有效性检查和备份。

## 本项目的说明网页

[查看简明说明网页](./)；网页只解释本项目的定位、数据存放方式、工作流程和我们的判断，没有电子书下载服务或引导图。源码在 `site/`，在仓库根目录运行 `python projects/007-ebook-treasure-chest/scripts/build_web.py` 可更新 `web/007-ebook-treasure-chest/`。本次将静态页面随研究记录提交；是否能在公网访问，以 GitHub Pages 部署结果为准。

## 来源与范围

本项目仅整理 [jbiaojerry/ebook-treasure-chest](https://github.com/jbiaojerry/ebook-treasure-chest) 的公开目录结构与实现，没有复制全量书目、下载电子书或验证逐本授权。外部链接的存在不能作为书籍使用授权的证明。
