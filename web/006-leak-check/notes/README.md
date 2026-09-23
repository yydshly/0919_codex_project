# 研究记录

[返回项目](../research.md) · [源码证据与问题分析](source-audit.md) · [机器可读验证结果](verification.json)

## 2026-09-22 · 产品理解与后续规划归档

[完整理解与后续规划](product-roadmap.md) · [拾迹原型及验证范围](mail-trail.md) · [网页检查记录](web-verification.md)

已将原库能力、数据来源边界、邮件账号盘点方向、各邮箱适配状态及恢复后的候选顺序汇总到研究网页。当前保留研究与原型，暂停新增邮箱适配和真实账号验证；Gmail、Outlook 留待后续接入。

## 2026-09-22 · 固定版本源码研究

研究版本：`7e3a113b9cf616b142ad5236c547c2c9a9246607`。

完成内容：

1. 阅读全部非空业务源码与安装、服务配置，追踪请求到数据库及输出的完整路径。
2. 检查示例库表结构、记录数量和索引，不展示个人记录。
3. 隔离执行固定版本中的输入校验函数，使用虚构邮箱复现连字符被删除的问题。
4. 将实现事实、运行验证、条件性价值判断和未验证事项分开记录。

## 复现方式

在研究集根目录运行：

```sh
python projects/006-leak-check/scripts/verify_upstream.py
```

工具只依赖 Python 标准库，读取固定提交的 `main.py`、`db/crud.py`、`models/request.py`、`lib/masking.py` 与 `example.db`。源码仅在内存中处理，示例数据库放入自动清理的临时目录并以只读方式打开。不会访问作者的查询 API。

输入校验的复现方式：从已审查的固定版本中提取 `validate_and_detect` 方法，去除 Pydantic / classmethod 装饰器，提供 `re` 模块后独立调用。因此验证的是函数体的值转换行为，不是完整的 Pydantic 请求处理、HTTP 状态码或应用启动兼容性。

记录文件包含固定提交、执行时间、Python 版本、下载文件 SHA-256、路由声明、数据库结构与统计、虚构邮箱输入及清洗结果。断言与本版本预期不符时工具会失败，不会生成成功记录。

## 结果与范围

- `person` 表 8 行，`source` 表 4 行；未发现显式索引。
- `alice-test@example.com` 变成 `alicetest@example.com`。
- `alice@example-domain.com` 变成 `alice@exampledomain.com`。
- 这两种输入都被识别为 email，说明问题发生在校验后的统一清洗阶段。
- 应用源码有三个显式路由声明：空路径、`/`、`POST /dig/masking`；FastAPI 自动文档不计入这三个业务声明。
- 数量限制、日志行为、来源关联丢失、缺少鉴权限流等结论来自静态代码审查，没有伪称经过压力测试或线上复现。

未启动上游完整应用，未安装其依赖，未修改上游代码，未验证作者线上数据库与本次源码的对应关系。
