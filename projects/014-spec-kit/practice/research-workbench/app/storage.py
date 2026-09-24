"""Validated record updates with durable SQLite transactions."""
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import date
from pathlib import Path

class Problem(Exception):
    def __init__(self, status, message, current=None):
        self.status, self.message, self.current = status, message, current

def string(value, label, minimum, maximum):
    if not isinstance(value, str): raise Problem(400, label+'必须是文字')
    value=value.strip()
    if not minimum <= len(value) <= maximum: raise Problem(400, f'{label}需为 {minimum}–{maximum} 个字符')
    return value

class Store:
    def __init__(self, path, catalog):
        self.path=Path(path);self.path.parent.mkdir(parents=True,exist_ok=True)
        self.catalog=catalog;self.tags={tag for p in catalog['projects'] for tag in p['tags']}
        with self.connection(True) as db:
            for table in ('settings','projects','tasks'):
                db.execute(f'CREATE TABLE IF NOT EXISTS {table} (id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL)')
            settings=dict(name='我的研究空间',goal='',focus=[],view='all',configured=False)
            db.execute('INSERT OR IGNORE INTO settings VALUES (?,?,1)',('workspace',json.dumps(settings,ensure_ascii=False)))
            for p in catalog['projects']:
                record={**p,'note':'','status':'pending'}
                db.execute('INSERT OR IGNORE INTO projects VALUES (?,?,1)',(p['id'],json.dumps(record,ensure_ascii=False)))
            db.execute('CREATE TABLE IF NOT EXISTS control (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)')
            maximum=max(db.execute(f'SELECT COALESCE(MAX(version),1) FROM {table}').fetchone()[0] for table in ('settings','projects','tasks'))
            db.execute('INSERT OR IGNORE INTO control VALUES (1,?)',(json.dumps(dict(revision=maximum,undo=None)),))

    @contextmanager
    def connection(self, write=False):
        db=sqlite3.connect(self.path,timeout=2,isolation_level=None)
        try:
            db.execute('BEGIN IMMEDIATE' if write else 'BEGIN')
            yield db
            db.execute('COMMIT')
        except Exception:
            if db.in_transaction: db.execute('ROLLBACK')
            raise
        finally: db.close()

    @staticmethod
    def decode(row): return {**json.loads(row[0]),'version':row[1]}

    def get(self, db, table, key):
        row=db.execute(f'SELECT data,version FROM {table} WHERE id=?',(key,)).fetchone()
        if row is None: raise Problem(404,'记录不存在，请刷新后重试')
        return self.decode(row)

    def control(self, db):
        value=json.loads(db.execute('SELECT data FROM control WHERE id=1').fetchone()[0])
        value.setdefault('restoreEpoch',0)
        return value

    def save_control(self, db, value):
        db.execute('UPDATE control SET data=? WHERE id=1',(json.dumps(value,ensure_ascii=False),))

    def advance(self, db):
        control=self.control(db)
        control['revision']+=1
        self.save_control(db,control)
        return control['revision']

    def state_from(self, db):
        return dict(settings=self.get(db,'settings','workspace'),
                    projects=[self.decode(r) for r in db.execute('SELECT data,version FROM projects ORDER BY id')],
                    tasks=[self.decode(r) for r in db.execute('SELECT data,version FROM tasks ORDER BY rowid')],
                    snapshotAt=self.catalog['snapshotAt'],revision=self.control(db)['revision'],restoreEpoch=self.control(db)['restoreEpoch'])

    def state(self):
        with self.connection() as db:return self.state_from(db)

    def update(self, table, key, payload):
        version=payload.get('version')
        if type(version) is not int or version < 1: raise Problem(400,'版本无效，请重新读取')
        with self.connection(True) as db:
            old=self.get(db,table,key)
            if version != old['version']: raise Problem(409,'这条记录已在另一页面更新；草稿已保留，请重新读取后再编辑',old)
            value={k:v for k,v in old.items() if k!='version'}
            if table=='settings':
                focus=payload.get('focus')
                if not isinstance(focus,list) or len(focus)>8 or any(not isinstance(t,str) or t not in self.tags for t in focus): raise Problem(400,'请选择最多 8 个已有关注方向')
                if payload.get('view') not in ('all','focus'):raise Problem(400,'默认视图无效')
                if type(payload.get('configured')) is not bool:raise Problem(400,'定制状态无效')
                value.update(name=string(payload.get('name'),'空间名称',1,40),goal=string(payload.get('goal'),'研究目标',0,200),focus=list(dict.fromkeys(focus)),view=payload['view'],configured=payload['configured'])
            elif table=='projects':
                if payload.get('status') not in ('pending','active','decided'):raise Problem(400,'跟进状态无效')
                value.update(note=string(payload.get('note'),'应用判断',0,2000),status=payload['status'])
            else:
                if type(payload.get('done')) is not bool:raise Problem(400,'任务状态无效')
                value['done']=payload['done']
            db.execute(f'UPDATE {table} SET data=?,version=version+1 WHERE id=? AND version=?',(json.dumps(value,ensure_ascii=False),key,version))
            self.advance(db)
            return {**value,'version':version+1}

    def add_task(self, payload):
        title=string(payload.get('title'),'任务标题',1,120)
        due=payload.get('due','')
        if not isinstance(due,str):raise Problem(400,'截止日期无效')
        if due:
            try:
                if date.fromisoformat(due).isoformat()!=due:raise ValueError()
            except ValueError:raise Problem(400,'请输入真实的截止日期')
        key=payload.get('projectId')
        if not isinstance(key,str):raise Problem(400,'所属项目无效')
        with self.connection(True) as db:
            self.get(db,'projects',key)
            epoch=payload.get('restoreEpoch',0)
            if type(epoch) is not int or epoch!=self.control(db)['restoreEpoch']:
                raise Problem(409,'空间已恢复或撤销过；任务草稿已保留，请重新读取项目后再添加')
            item=dict(id=str(uuid.uuid4()),projectId=key,title=title,due=due,done=False)
            version=self.advance(db)
            db.execute('INSERT INTO tasks VALUES (?,?,?)',(item['id'],json.dumps(item,ensure_ascii=False),version))
            return {**item,'version':version}

    def delete_task(self,key,payload):
        version=payload.get('version')
        if type(version) is not int or version < 1:raise Problem(400,'版本无效')
        with self.connection(True) as db:
            current=self.get(db,'tasks',key)
            if version!=current['version']:raise Problem(409,'任务已更新，请刷新后重试',current)
            db.execute('DELETE FROM tasks WHERE id=? AND version=?',(key,version))
            self.advance(db)
            return {'deleted':True}
