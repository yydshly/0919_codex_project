"""Validated, atomic replacement of personal records with durable single-use undo."""
import hashlib
import json
import uuid
from datetime import date
from storage import Problem, string


class RestoreService:
    def __init__(self, store):
        self.store=store
        self.project_ids={p['id'] for p in store.catalog['projects']}

    def normalize(self, backup):
        if not isinstance(backup,dict) or type(backup.get('schemaVersion')) is not int or backup['schemaVersion']!=1:
            raise Problem(400,'请选择研库导出的第 1 版 JSON 备份')
        if len(json.dumps(backup,ensure_ascii=False,separators=(',',':')).encode('utf-8'))>5*1024*1024:
            raise Problem(413,'备份超过 5 MiB，未修改任何记录')
        settings=backup.get('settings');projects=backup.get('projects');tasks=backup.get('tasks')
        if not isinstance(settings,dict) or not isinstance(projects,list) or not isinstance(tasks,list):
            raise Problem(400,'备份缺少完整的设置、项目或任务')
        focus=settings.get('focus')
        if not isinstance(focus,list) or len(focus)>8 or any(not isinstance(t,str) or t not in self.store.tags for t in focus):
            raise Problem(400,'备份关注方向必须是最多 8 个当前目录已有的标签')
        if settings.get('view') not in ('all','focus') or type(settings.get('configured')) is not bool:
            raise Problem(400,'备份的默认视图或定制状态无效')
        clean_settings=dict(name=string(settings.get('name'),'空间名称',1,40),goal=string(settings.get('goal'),'研究目标',0,200),
                            focus=list(dict.fromkeys(focus)),view=settings['view'],configured=settings['configured'])
        if len(projects)!=len(self.project_ids):raise Problem(400,'备份必须包含当前目录的全部项目，且各出现一次')
        clean_projects=[];seen=set()
        for p in projects:
            if not isinstance(p,dict):raise Problem(400,'备份项目格式无效')
            key=p.get('id')
            if not isinstance(key,str) or key not in self.project_ids or key in seen:raise Problem(400,'备份项目缺失、重复或不属于当前目录')
            if p.get('status') not in ('pending','active','decided'):raise Problem(400,'备份跟进状态无效')
            seen.add(key)
            clean_projects.append(dict(id=key,note=string(p.get('note'),'应用判断',0,2000),status=p['status']))
        if len(tasks)>1000:raise Problem(400,'本版恢复最多支持 1000 条任务')
        clean_tasks=[];task_ids=set()
        for t in tasks:
            if not isinstance(t,dict):raise Problem(400,'备份任务格式无效')
            key=t.get('id');project=t.get('projectId')
            try:
                if not isinstance(key,str) or str(uuid.UUID(key))!=key:raise ValueError()
            except ValueError:raise Problem(400,'备份任务标识必须是标准 UUID')
            if key in task_ids:raise Problem(400,'备份任务标识重复')
            if not isinstance(project,str) or project not in self.project_ids:raise Problem(400,'备份任务引用了未知项目')
            if type(t.get('done')) is not bool:raise Problem(400,'备份任务状态无效')
            due=t.get('due')
            if not isinstance(due,str):raise Problem(400,'备份截止日期无效')
            if due:
                try:
                    if date.fromisoformat(due).isoformat()!=due:raise ValueError()
                except ValueError:raise Problem(400,'备份截止日期不是真实的日期')
            task_ids.add(key)
            clean_tasks.append(dict(id=key,projectId=project,title=string(t.get('title'),'任务标题',1,120),due=due,done=t['done']))
        return dict(schemaVersion=1,settings=clean_settings,projects=sorted(clean_projects,key=lambda p:p['id']),tasks=clean_tasks)

    @staticmethod
    def digest(backup):
        raw=json.dumps(backup,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')
        return hashlib.sha256(raw).hexdigest()

    @staticmethod
    def summary(state):
        return dict(name=state['settings']['name'],notes=sum(bool(p['note']) for p in state['projects']),tasks=len(state['tasks']))

    def preview(self, backup):
        incoming=self.normalize(backup)
        with self.store.connection() as db:
            current=self.store.state_from(db)
            return dict(revision=current['revision'],digest=self.digest(incoming),current=self.summary(current),incoming=self.summary(incoming),
                        scope='替换空间设置、全部项目的个人判断与状态、全部任务；保留当前目录的名称、介绍、链接和标签。')

    def replace(self, db, personal, revision):
        db.execute('UPDATE settings SET data=?,version=? WHERE id=?',(json.dumps(personal['settings'],ensure_ascii=False),revision,'workspace'))
        for p in personal['projects']:
            old=self.store.get(db,'projects',p['id'])
            value={k:v for k,v in old.items() if k!='version'}
            value.update(note=p['note'],status=p['status'])
            db.execute('UPDATE projects SET data=?,version=? WHERE id=?',(json.dumps(value,ensure_ascii=False),revision,p['id']))
        db.execute('DELETE FROM tasks')
        for t in personal['tasks']:
            db.execute('INSERT INTO tasks VALUES (?,?,?)',(t['id'],json.dumps(t,ensure_ascii=False),revision))

    @staticmethod
    def snapshot(state):
        # Trusted current records may exceed the incoming-backup limit; undo must retain them all.
        return dict(settings={k:state['settings'][k] for k in ('name','goal','focus','view','configured')},
                    projects=[{k:p[k] for k in ('id','note','status')} for p in state['projects']],
                    tasks=[{k:t[k] for k in ('id','projectId','title','due','done')} for t in state['tasks']])

    def apply(self, payload):
        if payload.get('confirmed') is not True:raise Problem(400,'请明确确认替换预览中的个人记录')
        if type(payload.get('revision')) is not int or payload['revision']<1:raise Problem(400,'预览版本无效，请重新预览')
        with self.store.connection(True) as db:
            incoming=self.normalize(payload.get('backup'))
            control=self.store.control(db)
            if control['revision']!=payload['revision']:raise Problem(409,'预览后记录已更新，请重新读取并预览；本次未恢复任何数据')
            if payload.get('digest')!=self.digest(incoming):raise Problem(409,'备份与预览内容不一致，请重新预览')
            current=self.store.state_from(db)
            before=self.snapshot(current)
            revision=control['revision']+1
            undo_id=str(uuid.uuid4())
            self.replace(db,incoming,revision)
            self.store.save_control(db,dict(revision=revision,restoreEpoch=control['restoreEpoch']+1,undo=dict(undoId=undo_id,appliedRevision=revision,before=before)))
            result=dict(undoId=undo_id,state=self.store.state_from(db))
        return result

    def status(self):
        with self.store.connection() as db:
            control=self.store.control(db);undo=control.get('undo')
            available=bool(undo and undo['appliedRevision']==control['revision'])
            return dict(available=available,undoId=undo['undoId'] if available else None)

    def undo(self, payload):
        if payload.get('confirmed') is not True:raise Problem(400,'请明确确认撤销最近一次恢复')
        with self.store.connection(True) as db:
            control=self.store.control(db);undo=control.get('undo')
            if not undo or undo['undoId']!=payload.get('undoId') or undo['appliedRevision']!=control['revision']:
                raise Problem(409,'撤销已不可用：恢复后记录有更新，或该次恢复已经撤销；本次未修改数据')
            revision=control['revision']+1
            self.replace(db,undo['before'],revision)
            self.store.save_control(db,dict(revision=revision,restoreEpoch=control['restoreEpoch']+1,undo=None))
            result=dict(state=self.store.state_from(db))
        return result
