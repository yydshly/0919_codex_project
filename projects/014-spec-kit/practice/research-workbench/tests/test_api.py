import json
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class WorkbenchAPI(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db = str(Path(self.tmp.name)/'test.sqlite3')
        self.start()
        self.addCleanup(self.stop)

    def start(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); self.port=sock.getsockname()[1]
        self.base=f'http://127.0.0.1:{self.port}'
        self.proc=subprocess.Popen([sys.executable,str(ROOT/'app/server.py'),'--port',str(self.port),'--db',self.db],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        for _ in range(80):
            if self.proc.poll() is not None:
                raise RuntimeError(self.proc.stderr.read().decode(errors='replace'))
            try:
                self.request('/api/state'); return
            except OSError: time.sleep(.05)
        raise RuntimeError('Service did not start')

    def stop(self):
        self.proc.terminate(); self.proc.wait(timeout=5)
        self.proc.stderr.close()

    def request(self,path,method='GET',data=None,headers=None):
        h={'Content-Type':'application/json','Origin':self.base}; h.update(headers or {})
        req=urllib.request.Request(self.base+path,data=None if data is None else json.dumps(data).encode(),method=method,headers=h)
        try:
            with urllib.request.urlopen(req,timeout=8) as response:
                raw=response.read(); content=response.headers.get('Content-Type','')
                return response.status, json.loads(raw) if 'json' in content else raw.decode()
        except urllib.error.HTTPError as e:
            return e.code,json.loads(e.read())

    def state(self): return self.request('/api/state')[1]
    def project(self): return self.state()['projects'][0]

    def test_01_real_catalog(self):
        state=self.state(); self.assertEqual(len(state['projects']),16)
        self.assertTrue(any('spec-kit' in p['source'] for p in state['projects']))
        self.assertTrue(all(p['metadataPath'] for p in state['projects']))

    def test_02_customization_restart(self):
        s=self.state()['settings']; s.update(name='我的研究室',goal='比较实际可用价值',focus=[],view='all',configured=True)
        code,saved=self.request('/api/settings','PUT',s);self.assertEqual(code,200)
        p=self.project(); code,p=self.request('/api/projects/'+p['id'],'PUT',dict(note='真实中文\n第二行',status='active',version=p['version']));self.assertEqual(code,200)
        code,t=self.request('/api/tasks','POST',dict(projectId=p['id'],title='验证下一步',due='2026-10-01'));self.assertEqual(code,201)
        self.stop();self.start()
        state=self.state();self.assertEqual(state['settings'],saved)
        self.assertEqual(state['projects'][0]['note'],'真实中文\n第二行');self.assertEqual(state['tasks'][0],t)

    def test_03_validation_preserves_state(self):
        s=self.state()['settings'];base=self.state()
        for name in ['', '字'*41]:
            self.assertEqual(self.request('/api/settings','PUT',{**s,'name':name})[0],400)
        p=self.project()
        for payload in [dict(note='字'*2001,status='active'),dict(note='ok',status='invalid')]:
            self.assertEqual(self.request('/api/projects/'+p['id'],'PUT',{**payload,'version':p['version']})[0],400)
        for payload in [dict(title='',due=''),dict(title='t',due='2026-02-30'),dict(title='t'*121,due='')]:
            self.assertEqual(self.request('/api/tasks','POST',{**payload,'projectId':p['id']})[0],400)
        self.assertEqual(self.state(),base)

    def test_04_project_and_settings_conflicts(self):
        p=self.project();payload=dict(note='先保存',status='active',version=p['version'])
        self.assertEqual(self.request('/api/projects/'+p['id'],'PUT',payload)[0],200)
        self.assertEqual(self.request('/api/projects/'+p['id'],'PUT',{**payload,'note':'旧覆盖'})[0],409)
        self.assertEqual(self.project()['note'],'先保存')
        s=self.state()['settings'];s['name']='first'
        self.assertEqual(self.request('/api/settings','PUT',s)[0],200)
        self.assertEqual(self.request('/api/settings','PUT',s)[0],409)

    def test_05_task_lifecycle_conflict(self):
        p=self.project();code,t=self.request('/api/tasks','POST',dict(projectId=p['id'],title='任务',due=''))
        self.assertEqual(code,201);url='/api/tasks/'+t['id']
        code,done=self.request(url,'PUT',dict(done=True,version=t['version']));self.assertEqual(code,200)
        self.assertEqual(self.request(url,'DELETE',dict(version=t['version']))[0],409)
        code,again=self.request(url,'PUT',dict(done=False,version=done['version']));self.assertFalse(again['done'])
        self.assertEqual(self.request(url,'DELETE',dict(version=again['version']))[0],200)
        self.assertEqual(self.state()['tasks'],[])

    def test_06_export_complete(self):
        p=self.project();self.request('/api/projects/'+p['id'],'PUT',dict(note='我的用途',status='decided',version=p['version']))
        code,data=self.request('/api/export.json');self.assertEqual(code,200);self.assertEqual(len(data['projects']),16)
        report=self.request('/api/report.md')[1];self.assertIn('我的用途',report);self.assertIn('Spec Kit',report)

    def test_07_private_files_and_origin(self):
        for path in ['/app/storage.py','/../server.py','/%2e%2e/server.py','/test.sqlite3','/.specify/feature.json']:
            self.assertEqual(self.request(path)[0],404,path)
        s=self.state()['settings']
        for origin in ['null','http://evil.example','']:
            self.assertEqual(self.request('/api/settings','PUT',s,{'Origin':origin})[0],403)
        self.assertEqual(self.request('/api/settings','PUT',s,{'Content-Type':'text/plain'})[0],415)
        self.assertEqual(self.request('/api/settings','PUT',{'name':'x'*70000})[0],413)

    def test_08_evidence_is_real(self):
        code,e=self.request('/api/evidence');self.assertEqual(code,200)
        spec=next(a for a in e['artifacts'] if a['key']=='spec')
        self.assertEqual(spec['content'],(ROOT/'specs/001-custom-workbench/spec.md').read_text(encoding='utf-8-sig'))

if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(WorkbenchAPI))
    report=dict(suite='API / SQLite / restart',tests=result.testsRun,passed=result.testsRun-len(result.failures)-len(result.errors),failures=[dict(test=str(t),error=e) for t,e in result.failures+result.errors],completedAt=time.strftime('%Y-%m-%dT%H:%M:%S%z'))
    name='api-baseline.json' if not (ROOT/'app/server.py').exists() else 'api-verification.json'
    (ROOT/'evidence'/name).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    sys.exit(not result.wasSuccessful())
