"""Local-only application server. Private project files are never a static root."""
import argparse
import json
import mimetypes
import sqlite3
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from storage import Store,Problem

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'app/public'
SPEC=ROOT/'specs/001-custom-workbench'
RESTORE_SPEC=ROOT/'specs/002-restore-backup'
ARTIFACTS=[('input','定制输入',ROOT/'evidence/input.md'),('constitution','项目原则',ROOT/'.specify/memory/constitution.md'),('spec','需求规格',SPEC/'spec.md'),('plan','实现方案',SPEC/'plan.md'),('research','技术决策',SPEC/'research.md'),('model','数据规则',SPEC/'data-model.md'),('contract','接口约定',SPEC/'contracts/api.md'),('tasks','开发任务',SPEC/'tasks.md'),('setup-plan','规划脚本日志',ROOT/'evidence/02-setup-plan.txt'),('setup-tasks','任务脚本日志',ROOT/'evidence/03-setup-tasks.txt'),('prerequisites','前置检查日志',ROOT/'evidence/04-prerequisites.txt'),('api','服务端验收',ROOT/'evidence/api-verification.json'),('browser','浏览器验收',ROOT/'evidence/browser-verification.json'),('convergence','完成度核对',ROOT/'evidence/convergence.md'),('server','服务端源码',ROOT/'app/server.py'),('store','保存逻辑源码',ROOT/'app/storage.py'),('ui','产品界面源码',ROOT/'app/public/app.js')]
ARTIFACTS += [('skill-'+step,'官方 Skill · '+step,ROOT/f'.agents/skills/speckit-{step}/SKILL.md') for step in ('specify','plan','tasks','implement','converge')]
ARTIFACTS += [('browser-test','浏览器验收代码',ROOT/'tests/browser.cjs'),('api-test','服务端验收代码',ROOT/'tests/test_api.py'),('init-options','官方初始化配置',ROOT/'.specify/init-options.json')]
ARTIFACTS += [('trace-before','本次修复前失败',ROOT/'evidence/trace-before-fix.json'),('trace-after','本次修复后验收',ROOT/'evidence/trace-verification.json'),('trace-test','双页面回归代码',ROOT/'tests/application-trace.cjs'),('followup','本次核对与修复说明',ROOT/'evidence/convergence-followup.md')]
RESTORE_ARTIFACTS=[('restore-'+key,label,RESTORE_SPEC/name) for key,label,name in [('spec','本轮需求规格','spec.md'),('checklist','规格检查','checklists/requirements.md'),('plan','本轮实现方案','plan.md'),('research','技术研究','research.md'),('model','数据规则','data-model.md'),('contract','接口约定','contracts/api.md'),('tasks','本轮开发任务','tasks.md'),('setup-plan','官方规划脚本输出','setup-plan.txt'),('setup-tasks','官方任务脚本输出','setup-tasks.txt')]]
RESTORE_ARTIFACTS += [('restore-'+key,label,ROOT/name) for key,label,name in [('skill-specify','官方需求Skill','.agents/skills/speckit-specify/SKILL.md'),('code','恢复实现代码','app/restore.py'),('ui','恢复界面代码','app/public/restore.js'),('baseline','实现前失败基线','evidence/restore/storage-baseline.json'),('verification','实际存储验收','evidence/restore/storage-verification.json'),('browser','实际浏览器验收','evidence/restore/browser-verification.json'),('convergence','本轮完成度核对','evidence/restore/convergence.md'),('test','存储验收代码','tests/test_restore.py')]]

def read_text(path):
    raw=path.read_bytes()
    return raw.decode('utf-16') if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else raw.decode('utf-8-sig')

def report(state):
    s=state['settings'];lines=[f'# {s["name"]}','',s['goal'],'','研究快照：'+state['snapshotAt'],'']
    labels={'pending':'待研究','active':'研究中','decided':'已形成结论'}
    for p in state['projects']:
        lines.extend(['## '+p['name'],'',p['source'],'',p['summary'],'','跟进状态：'+labels[p['status']],'','我的应用判断：'+(p['note'] or '尚未填写'),''])
        for t in state['tasks']:
            if t['projectId']==p['id']:lines.append(f'- [{"x" if t["done"] else " "}] {t["title"]}'+(' · '+t['due'] if t['due'] else ''))
        lines.append('')
    return '\n'.join(lines)

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def send(self,status,value,mime='application/json; charset=utf-8',attachment=None):
        raw=json.dumps(value,ensure_ascii=False).encode() if mime.startswith('application/json') else (value.encode() if isinstance(value,str) else value)
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        if attachment:self.send_header('Content-Disposition',f'attachment; filename="{attachment}"')
        self.end_headers();self.wfile.write(raw)

    def body(self):
        if self.headers.get('Origin') != self.server.origin:raise Problem(403,'请求来源不匹配，请从本地工作台操作')
        if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json':raise Problem(415,'请使用JSON提交')
        if self.headers.get('Transfer-Encoding'):raise Problem(400,'不支持分块请求')
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:raise Problem(400,'请求长度无效')
        limit=5*1024*1024+1024 if urlsplit(self.path).path.startswith('/api/restore/') else 65536
        if length>limit:
            # Drain modest oversized bodies so Windows does not reset before the error arrives.
            if length<=6*1024*1024:
                self.connection.settimeout(2)
                try:self.rfile.read(length)
                except TimeoutError:pass
            raise Problem(413,'提交内容过大')
        if length<1:raise Problem(400,'提交内容为空')
        try:data=json.loads(self.rfile.read(length),parse_constant=lambda value:(_ for _ in ()).throw(ValueError(value)))
        except (ValueError,UnicodeError,RecursionError):raise Problem(400,'提交内容不是有效JSON')
        if not isinstance(data,dict):raise Problem(400,'提交内容必须是对象')
        return data

    def dispatch(self):
        try:
            if self.headers.get('Host')!=self.server.host:raise Problem(403,'主机地址不匹配')
            route=urlsplit(self.path).path;store=self.server.store
            if self.command=='GET':
                if route=='/api/state':return self.send(200,store.state())
                if route=='/api/export.json':return self.send(200,dict(schemaVersion=1,exportedAt=datetime.now(timezone.utc).isoformat(),**store.state()),attachment='research-workspace.json')
                if route=='/api/report.md':return self.send(200,report(store.state()),'text/markdown; charset=utf-8','research-report.md')
                if route=='/api/restore/status':return self.send(200,{**self.server.restore.status(),'demo':bool(self.server.demo_backup)})
                if route=='/api/demo-backup':
                    if not self.server.demo_backup:raise Problem(404,'此空间没有演示备份，请选择自己的备份文件')
                    return self.send(200,json.loads(self.server.demo_backup.read_text(encoding='utf-8')))
                if route=='/api/restore-evidence':
                    artifacts=[dict(key=k,label=l,content=read_text(p),source=str(p.relative_to(ROOT)).replace('\\','/'),url='/evidence/'+k) for k,l,p in RESTORE_ARTIFACTS if p.is_file() and p.resolve().is_relative_to(ROOT)]
                    reports={key:json.loads(read_text(ROOT/'evidence/restore'/name)) if (ROOT/'evidence/restore'/name).exists() else None for key,name in [('storage','storage-verification.json'),('browser','browser-verification.json')]}
                    return self.send(200,dict(artifacts=artifacts,reports=reports))
                if route=='/api/evidence':
                    artifacts=[dict(key=k,label=l,content=read_text(p),source=str(p.relative_to(ROOT)).replace('\\','/'),url='/evidence/'+k) for k,l,p in ARTIFACTS if p.is_file() and p.resolve().is_relative_to(ROOT)]
                    reports={key:json.loads(read_text(ROOT/'evidence'/name)) if (ROOT/'evidence'/name).exists() else None for key,name in [('api','api-verification.json'),('browser','browser-verification.json'),('trace','trace-verification.json')]}
                    return self.send(200,dict(artifacts=artifacts,reports=reports))
                if route.startswith('/evidence/'):
                    for k,_,p in ARTIFACTS+RESTORE_ARTIFACTS:
                        if route=='/evidence/'+k and p.is_file() and p.resolve().is_relative_to(ROOT):return self.send(200,read_text(p),'text/plain; charset=utf-8',p.name)
                    raise Problem(404,'文件不存在')
                static={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/process':'process.html','/process.js':'process.js','/favicon.svg':'favicon.svg','/restore':'restore.html','/restore.js':'restore.js','/restore.css':'restore.css','/restore-build':'restore-build.html','/restore-build.js':'restore-build.js','/restore-build.css':'restore-build.css'}
                if route not in static:raise Problem(404,'页面不存在')
                path=(PUBLIC/static[route]).resolve()
                if not path.is_relative_to(PUBLIC) or not path.is_file():raise Problem(404,'页面尚未准备好')
                return self.send(200,path.read_bytes(),(mimetypes.guess_type(path)[0] or 'application/octet-stream')+'; charset=utf-8')
            data=self.body()
            if self.command=='POST' and route=='/api/restore/preview':return self.send(200,self.server.restore.preview(data.get('backup')))
            if self.command=='POST' and route=='/api/restore/apply':return self.send(200,self.server.restore.apply(data))
            if self.command=='POST' and route=='/api/restore/undo':return self.send(200,self.server.restore.undo(data))
            if self.command=='PUT' and route=='/api/settings':return self.send(200,store.update('settings','workspace',data))
            if self.command=='PUT' and route.startswith('/api/projects/'):return self.send(200,store.update('projects',route.rsplit('/',1)[-1],data))
            if self.command=='POST' and route=='/api/tasks':return self.send(201,store.add_task(data))
            if route.startswith('/api/tasks/'):
                key=route.rsplit('/',1)[-1]
                if self.command=='PUT':return self.send(200,store.update('tasks',key,data))
                if self.command=='DELETE':return self.send(200,store.delete_task(key,data))
            raise Problem(404,'接口不存在')
        except Problem as exc:self.send(exc.status,dict(error=exc.message,current=exc.current))
        except sqlite3.OperationalError:self.send(503,{'error':'暂时无法保存或读取，请稍后重试；输入仍会保留'})
        except (OSError,sqlite3.DatabaseError,ValueError):self.send(500,{'error':'本地数据暂时不可用，请检查服务后重试'})

    do_GET=dispatch
    do_POST=dispatch
    do_PUT=dispatch
    do_DELETE=dispatch

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=5215);parser.add_argument('--db',required=True);parser.add_argument('--demo-backup');args=parser.parse_args()
    from restore import RestoreService
    store=Store(args.db,json.loads((ROOT/'app/catalog.json').read_text(encoding='utf-8')))
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler);server.store=store
    server.restore=RestoreService(store);server.demo_backup=Path(args.demo_backup).resolve() if args.demo_backup else None
    server.host=f'127.0.0.1:{server.server_port}';server.origin='http://'+server.host
    print('Research workbench at '+server.origin,flush=True)
    try:server.serve_forever()
    finally:server.server_close()

if __name__=='__main__':main()
