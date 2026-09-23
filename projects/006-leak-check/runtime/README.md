# 拾迹本机邮箱连接服务

Python 3.10 以上，无第三方依赖。

```powershell
python projects/006-leak-check/scripts/build_web.py
python projects/006-leak-check/runtime/mail_service.py
```

打开 `http://127.0.0.1:5196/006-leak-check/mail-trail/`。该服务同时提供静态页面与邮箱 API，替代同端口的 `python -m http.server`。可使用 `--port` 指定其他端口。

在产品页面填写自己的 QQ/Foxmail、163、126 或 Yeah 邮箱，并使用邮箱中生成的客户端授权码连接。不要使用网页登录密码。邮箱需先开启 IMAP；QQ 获取方式见[官方帮助](https://help.mail.qq.com/detail/106/985)。无需把授权码写进配置文件或发给开发者。

仅读取 INBOX 中最新的指定数量邮件。使用 TLS 993、只读 EXAMINE 与 BODY.PEEK，不发送、不删除、不修改已读状态。IMAP 客户端授权码本身未必只有只读权限，本程序的行为限制为读取。

本服务只绑定 `127.0.0.1`，并检查 Host、Origin、请求类型和临时令牌，不提供跨域接口；不是可直接公开部署的多用户后端。没有请求日志、邮件数据库、令牌持久化或第三方分析。

授权码仅用于本次登录。原始邮件只存在内存，完成并传递给前端后由前端请求清除；任务另设十分钟清理。取消后停止后续采集、清除对外返回的结果；内存清理与连接释放可能需要等正在执行的邮件协议请求返回或超时。关闭页面会尝试取消，不能保证浏览器退出前请求一定送达。

限制：单封 2 MB、总量 25 MB、最多 3,000 封、仅收件箱。网易客户端标识按服务器声明发送真实的 MailTrail 名称；当前未用真实网易/QQ 账号实测，提供商安全策略可能影响连接。Gmail/Outlook 尚未配置官方 OAuth 应用，当前不可连接。

离线测试：

```powershell
python -m unittest discover -s projects/006-leak-check/tests -p test_mail_service.py
```

测试采用假 IMAP 服务与虚构凭据，不连接真实邮箱。
