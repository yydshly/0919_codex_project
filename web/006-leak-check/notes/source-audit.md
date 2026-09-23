# 源码证据与问题分析

[返回项目](../research.md) · [验证记录](README.md)

固定提交：`7e3a113b9cf616b142ad5236c547c2c9a9246607`。下文行号对应这个提交的原始文件，不使用可能省略空行的网页抓取文本行号。

## 模块清单与职责

| 模块 | 实际职责 | 不应由此推导的能力 |
| --- | --- | --- |
| `main.py` | FastAPI 初始化、跨域设置、三个显式路由、脱敏聚合输出 | 不包含业务查询网页，也没有外部查询 API 客户端 |
| `models/request.py` | 请求 `q` 的格式判断与清洗 | 不核验身份归属、号码有效性或身份证校验位 |
| `db/crud.py` | SQLite 连接、会话、最大 rowid、两轮关联查询 | 名字叫 CRUD，但这里没有业务数据写入和更新流程 |
| `models/database.py` | `person` 和 `source` ORM 映射 | 定义表模型不代表自动导入数据或自动建立检索索引 |
| `models/response.py` | 结果结构声明 | 未脱敏模型存在，但当前查询接口不使用它 |
| `lib/masking.py` | 字符截取和星号替换、脱敏后的集合去重 | 不加密原始数据库、不匿名化整个处理过程 |
| `lib/aggregation.py` | 字符串和整数集合清理工具 | 被 main 导入但实际脱敏路由没有调用这些工具 |
| `install.sh` | 安装 uv / Python、复制示例库、同步依赖 | 没有真实数据拉取、业务数据导入和数据库同步 |
| `uvicorn-leak-check.service` | 指定 Linux 目录、账号、四个 worker 和系统日志 | 不是前端或完整网络代理配置 |

## 结论到源码的映射

| 结论 | 证据与定位 | 证据等级 |
| --- | --- | --- |
| 本地 SQLite 查询 | [db/crud.py L14–30](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L14-L30) | 源码直接确认 |
| 输入由规则识别 | [models/request.py L13–50](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/models/request.py#L13-L50) | 源码直接确认 |
| 查询分发只到本地函数 | [main.py L75–94](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/main.py#L75-L94) | 源码直接确认 |
| 默认两轮关联 | [db/crud.py L82–121](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L82-L121)、[L185–220](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L185-L220) | 源码直接确认 |
| 输出按字段聚合，来源单独返回 | [main.py L100–131](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/main.py#L100-L131) | 源码直接确认 |
| 脱敏后去重 | [lib/masking.py L91–96](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/lib/masking.py#L91-L96) | 源码直接确认 |
| 安装只复制示例库 | [install.sh L19–20](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/install.sh#L19-L20) | 源码直接确认 |
| 示例库规模和无索引 | [verification.json](verification.json) 的 `database` | 本地只读检查 |
| 没有采集、远程数据同步、业务前端 | [完整目录](https://github.com/garinasset/leak-check/tree/7e3a113b9cf616b142ad5236c547c2c9a9246607)与全部业务文件 | 仓库范围内的缺失判断，不外推到作者其他系统 |

## 具体问题

### 1. 邮箱清洗改变实际查询对象

`models/request.py` 第 19 行先从输入删除空格、连字符和括号，第 38 行用原始去首尾空格字符串判断邮箱格式，第 48 行却统一把已删除连字符的值写回 `q`。

用虚构邮箱隔离执行该函数，确认合法的用户名或域名连字符会被删除。应按输入类型清洗，邮箱保留合法字符；改动后需覆盖用户名和域名中连字符的用例。当前文档只记录问题，没有提交修复。

### 2. 数量上限检查太晚

[查询部分](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L129-L180)每个字段都调用 `.all()`，没有 SQL `LIMIT`。一轮结果全部合并后，第 203 行才检查 `len(all_persons) >= max_records`。

因此 64 是停止下一轮的条件，不保证单轮资源占用或最终输出规模。`threshold=12` 仅打印告警，不限制查询，也不依据数据源数量判断。关联深度有限不能替代记录数量上限。

### 3. 索引与性能声明需要区分

代码注释说分字段查询“全走索引”，但 [ORM 模型](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/models/database.py)未给四个匹配列定义索引，示例库只读检查也没有发现显式索引。

实际数据库若由部署者额外建索引，查询才有机会使用它们；不能从此推断作者线上没有索引。代码设置 WAL、缓存、内存临时表、mmap 和锁等待参数，但本次没有进行性能测试，不能据此宣称可稳定处理十亿级数据。

### 4. 日志可能包含查询标识

当某字段匹配数超过 12，代码会打印该轮的标识集合。例如 [db/crud.py L148–150](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L148-L150)。这可能是原始输入，也可能是上一轮发现的完整标识。

[服务配置 L20–22](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/uvicorn-leak-check.service#L20-L22)把标准输出和错误输出交给系统日志。该行为与 README 的“不记录查询”宣言存在差距；不能据此断言作者线上实际使用同样配置。

### 5. 关联结果缺少归属与来源粒度

精确匹配相同标识只能说明记录存在连接，不能证明属于同一个人。输出把每个字段分别聚合成集合，来源也单独成集合；调用者无法可靠重建每个值对应的原始记录和来源。

另外，先脱敏再去重会合并原始值不同但打码结果相同的条目。所以响应数组长度不能作为原始值数量或泄漏记录数。

### 6. 数据量接口不是计数

[db/crud.py L76–79](https://github.com/garinasset/leak-check/blob/7e3a113b9cf616b142ad5236c547c2c9a9246607/db/crud.py#L76-L79)使用 `max(Person.rowid)`，再转换为字符串。存在删除或跳号时，它可能大于记录总数；空表时是 `None` 的字符串形式。

### 7. 公开服务能力未包含在此实现里

全部业务路由中未见登录鉴权、查询对象归属验证、速率限制或用户配额。CORS 允许所有来源，不能当作身份认证。是否由外部网关补充这些能力，仓库无法回答。

## 未采用的推断

- 没有因为安装了 pandas / openpyxl 就宣称具备 Excel 导入。
- 没有因为安装了 psycopg2 就宣称已经支持 PostgreSQL 配置切换。
- 没有把未使用的未脱敏响应模型当成已开放接口。
- 没有用作者网站的展示数量证明示例库规模、实际有效数据量或查询性能。
- 没有从“源码无采集”推导“作者从未采集数据”；结论仅限于这个仓库。
- 没有因为缺少真实数据就判断开源程序毫无价值；其复用价值与我们是否具有数据条件分别评估。
