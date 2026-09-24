# Research Decisions

按 speckit-plan 的研究步骤使用了一个只读研究代理，核对 SQLite 持久化、旧版本冲突和本地服务资源边界。

## 1. 本地服务与保存
Decision: Python标准库HTTP服务+SQLite，逐请求连接、显式写事务、参数化语句，提交成功后响应；有限锁等待，失败返回503。
Rationale: 无需安装额外框架，数据脱离浏览器保存，适合本机16项研究目录。
Alternatives: localStorage部署简单但浏览器绑定；云服务增加账号、同步和部署范围，当前不需要。

## 2. 旧版本冲突
Decision: 每条记录version+1，UPDATE/DELETE带WHERE version条件，冲突返回409与当前记录。
Rationale: 避免旧编辑覆盖新结果，两个无关项目不会互相冲突。
Alternatives: 全空间版本容易误冲突；last-write-wins可能丢结论。

## 3. 本地资源与请求
Decision: 只监听127.0.0.1；固定Host/Origin允许值，写请求必须JSON及Origin；64KiB上限；静态文件与证据精确白名单，解析真实路径后校验边界。
Rationale: 目录中有数据库、规格和脚本，不能把整个项目公开成静态目录。
Alternatives: SimpleHTTPRequestHandler直接服务根目录可能公开非产品文件，未采用。

## 4. 导出与测试
Decision: 导出从一次数据库读事务取得完整快照；每轮测试使用独立临时数据库及端口，测试真实关闭/重启。
Rationale: 导出不受页面筛选与旧缓存影响；验收不改变用户数据。

## Sources
- https://docs.python.org/3.12/library/sqlite3.html
- https://www.sqlite.org/lang_transaction.html
- https://docs.python.org/3/library/http.server.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin

所有当前技术未知项已解决；服务只用于个人本地演示，不宣称生产互联网服务。
