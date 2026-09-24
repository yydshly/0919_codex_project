"""Create an isolated A-backup / B-current demo using the real HTTP product APIs."""
import argparse
import json
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--db',required=True)
    args=parser.parse_args()
    database=Path(args.db).resolve()
    if database.exists():raise SystemExit('Demo database already exists; refusing to overwrite it.')
    output=ROOT/'evidence/restore'
    output.mkdir(parents=True,exist_ok=True)
    child=subprocess.Popen([sys.executable,str(ROOT/'app/server.py'),'--port','0','--db',str(database)],
                           stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
                           creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    actions=[]
    try:
        line=child.stdout.readline().strip()
        if not line.startswith('Research workbench at '):raise RuntimeError('Demo service failed: '+child.stderr.read())
        base=line.split(' at ',1)[1]
        def request(path,method='GET',payload=None):
            data=json.dumps(payload,ensure_ascii=False).encode() if payload is not None else None
            req=urllib.request.Request(base+path,data=data,method=method,headers={'Origin':base,'Content-Type':'application/json'})
            with urllib.request.urlopen(req,timeout=10) as response:result=json.load(response)
            actions.append(dict(method=method,path=path))
            return result
        state=request('/api/state')
        project=next(p for p in state['projects'] if 'spec-kit' in p['id'])
        settings=request('/api/settings','PUT',{**state['settings'],'name':'A版 · 我保存的研究备份','goal':'了解 Spec Kit 怎样帮助 AI 按约定开发产品','configured':True})
        project=request('/api/projects/'+project['id'],'PUT',{**project,'note':'A版：准备试用 Spec Kit，用它约定需求、方案和验收。','status':'active'})
        request('/api/tasks','POST',dict(projectId=project['id'],title='A版任务：跑通一次 Spec Kit 真实开发',due='2026-09-30'))
        backup=request('/api/export.json')
        (output/'demo-backup.json').write_text(json.dumps(backup,ensure_ascii=False,indent=2),encoding='utf-8')
        request('/api/settings','PUT',{**settings,'name':'B版 · 当前演示空间'})
        request('/api/projects/'+project['id'],'PUT',{**project,'note':'B版：已完成试用，准备将 Spec Kit 用于更复杂的产品迭代。','status':'decided'})
        request('/api/tasks','POST',dict(projectId=project['id'],title='B版新增：比较 Spec Kit 和现有开发 Skill',due=''))
        final=request('/api/state')
        record=dict(createdAt=datetime.now(timezone.utc).isoformat(),sample='明确标记的教学样本；目录来自真实研究快照，个人内容为本次构造。',
                    database=str(database),backup='evidence/restore/demo-backup.json',actions=actions,
                    backupName=backup['settings']['name'],currentName=final['settings']['name'],backupTasks=len(backup['tasks']),currentTasks=len(final['tasks']))
        (output/'demo-setup.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(record,ensure_ascii=False))
    finally:
        child.terminate();child.wait(timeout=10)
        child.stdout.close();child.stderr.close()

if __name__=='__main__':main()
