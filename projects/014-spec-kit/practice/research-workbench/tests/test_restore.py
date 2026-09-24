"""Backup restore acceptance tests; each case uses an isolated temporary database."""
import copy
import json
import sqlite3
import sys
import tempfile
import time
import traceback
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'app'))
from storage import Store, Problem


class RestoreStorage(unittest.TestCase):
    def setUp(self):
        # Import here so the intentionally missing implementation is recorded in the baseline.
        from restore import RestoreService
        self.service_class = RestoreService
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'restore.sqlite3'
        self.catalog = json.loads((ROOT / 'app/catalog.json').read_text(encoding='utf-8'))
        self.store = Store(self.path, self.catalog)
        self.service = RestoreService(self.store)
        state = self.store.state()
        self.project_id = state['projects'][0]['id']
        self.store.update('settings', 'workspace', {
            **state['settings'], 'name': 'A版研究空间', 'goal': '保存中文研究目标',
            'focus': [self.catalog['projects'][0]['tags'][0]], 'view': 'focus', 'configured': True,
        })
        self.store.update('projects', self.project_id, {
            'version': state['projects'][0]['version'], 'note': 'A版判断\n第二行', 'status': 'active',
        })
        self.task_a = self.store.add_task({
            'projectId': self.project_id, 'title': 'A版任务', 'due': '2026-10-01',
        })
        self.backup_a = self.backup()

    def backup(self):
        return {'schemaVersion': 1, 'exportedAt': '2026-09-22T00:00:00+00:00',
                **copy.deepcopy(self.store.state())}

    @staticmethod
    def personal(state):
        return {
            'settings': {k: state['settings'][k] for k in ('name', 'goal', 'focus', 'view', 'configured')},
            'projects': [{'id': p['id'], 'note': p['note'], 'status': p['status']}
                         for p in sorted(state['projects'], key=lambda item: item['id'])],
            'tasks': [{k: t[k] for k in ('id', 'projectId', 'title', 'due', 'done')}
                      for t in state['tasks']],
        }

    def become_b(self):
        state = self.store.state()
        self.store.update('settings', 'workspace', {
            **state['settings'], 'name': 'B版当前空间', 'goal': 'B版目标', 'focus': [], 'view': 'all',
        })
        project = next(p for p in state['projects'] if p['id'] == self.project_id)
        self.store.update('projects', self.project_id, {
            'version': project['version'], 'note': 'B版判断', 'status': 'decided',
        })
        task = self.store.state()['tasks'][0]
        self.store.update('tasks', task['id'], {'version': task['version'], 'done': True})
        self.store.add_task({'projectId': self.project_id, 'title': '仅B版存在的任务', 'due': ''})
        return self.store.state()

    def request(self, backup=None):
        backup = copy.deepcopy(self.backup_a if backup is None else backup)
        preview = self.service.preview(backup)
        return {'backup': backup, 'revision': preview['revision'], 'digest': preview['digest'],
                'confirmed': True}

    def restore_a(self):
        return self.service.apply(self.request())

    def assert_problem(self, status, operation):
        with self.assertRaises(Problem) as caught:
            operation()
        self.assertEqual(caught.exception.status, status, caught.exception.message)

    def database_dump(self):
        with closing(sqlite3.connect(self.path)) as db:
            return '\n'.join(db.iterdump())

    def insert_failure_trigger(self):
        with closing(sqlite3.connect(self.path)) as db:
            db.execute("CREATE TRIGGER reject_restore_tasks BEFORE INSERT ON tasks "
                       "BEGIN SELECT RAISE(ABORT, 'injected restore failure'); END")

    def test_01_preview_has_no_writes(self):
        """预览返回摘要且不改变任何数据库记录或原备份对象"""
        self.become_b()
        before = self.store.state()
        dump = self.database_dump()
        backup = copy.deepcopy(self.backup_a)
        preview = self.service.preview(backup)
        for key in ('revision', 'digest', 'current', 'incoming'):
            self.assertIn(key, preview)
        self.assertEqual(preview['revision'], before['revision'])
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.database_dump(), dump)
        self.assertEqual(backup, self.backup_a)

    def test_02_restore_restart_and_undo(self):
        """A导出→修改为B→恢复A→重启→撤销回B并保持任务顺序"""
        before = self.become_b()
        restored = self.restore_a()
        self.assertEqual(self.personal(restored['state']), self.personal(self.backup_a))
        self.assertEqual(self.personal(self.store.state()), self.personal(self.backup_a))
        self.assertGreater(self.store.state()['revision'], before['revision'])
        self.store = Store(self.path, self.catalog)
        self.service = self.service_class(self.store)
        self.assertEqual(self.personal(self.store.state()), self.personal(self.backup_a))
        status = self.service.status()
        self.assertTrue(status['available'])
        self.assertEqual(status['undoId'], restored['undoId'])
        result = self.service.undo({'undoId': restored['undoId'], 'confirmed': True})
        self.assertEqual(self.personal(result['state']), self.personal(before))
        self.assertEqual(self.personal(self.store.state()), self.personal(before))
        self.assertFalse(self.service.status()['available'])
        final = self.store.state()
        self.assert_problem(409, lambda: self.service.undo({'undoId': restored['undoId'], 'confirmed': True}))
        self.assertEqual(self.store.state(), final)

    def test_03_bad_fields_are_rejected(self):
        """错误类型、字数、枚举、标签与日期一律拒绝且不写入"""
        changes = [
            ('schemaVersion', True), ('schemaVersion', 2), ('schemaVersion', '1'),
            ('settings', []), ('projects', {}), ('tasks', {}),
            ('settings.name', ''), ('settings.name', '字' * 41),
            ('settings.goal', '字' * 201), ('settings.goal', None),
            ('settings.focus', ['不在当前目录的方向']),
            ('settings.focus', [self.catalog['projects'][0]['tags'][0]] * 9),
            ('settings.view', 'invalid'), ('settings.configured', 1),
            ('projects.0.note', '字' * 2001), ('projects.0.note', None),
            ('projects.0.status', 'invalid'),
            ('tasks.0.id', 'not-a-uuid'), ('tasks.0.title', ''),
            ('tasks.0.title', '字' * 121), ('tasks.0.done', 1),
            ('tasks.0.due', '2026-02-30'), ('tasks.0.due', '2026-1-01'),
            ('tasks.0.due', 20261001),
        ]
        before = self.store.state()
        for path, value in changes:
            with self.subTest(field=path, value=repr(value)[:60]):
                backup = copy.deepcopy(self.backup_a)
                parts = path.split('.')
                target = backup
                for part in parts[:-1]:
                    target = target[int(part)] if isinstance(target, list) else target[part]
                target[parts[-1]] = value
                self.assert_problem(400, lambda: self.service.preview(backup))
                self.assertEqual(self.store.state(), before)

    def test_04_missing_fields_are_rejected(self):
        """缺少必需顶层或个人字段不能被当作空白覆盖"""
        paths = ['schemaVersion', 'settings', 'projects', 'tasks', 'settings.name',
                 'settings.goal', 'settings.focus', 'settings.view', 'settings.configured',
                 'projects.0.id', 'projects.0.note', 'projects.0.status', 'tasks.0.id',
                 'tasks.0.projectId', 'tasks.0.title', 'tasks.0.due', 'tasks.0.done']
        before = self.store.state()
        for path in paths:
            with self.subTest(field=path):
                backup = copy.deepcopy(self.backup_a)
                parts = path.split('.')
                target = backup
                for part in parts[:-1]:
                    target = target[int(part)] if isinstance(target, list) else target[part]
                del target[parts[-1]]
                self.assert_problem(400, lambda: self.service.preview(backup))
                self.assertEqual(self.store.state(), before)

    def test_05_project_and_task_identity_validation(self):
        """未知、缺失、重复项目及重复任务和悬空任务引用整份拒绝"""
        candidates = []
        unknown = copy.deepcopy(self.backup_a)
        unknown['projects'][0]['id'] = '999-unknown-project'
        candidates.append(('unknown project', unknown))
        missing = copy.deepcopy(self.backup_a)
        missing['projects'].pop()
        candidates.append(('missing project', missing))
        duplicate = copy.deepcopy(self.backup_a)
        duplicate['projects'][-1] = copy.deepcopy(duplicate['projects'][0])
        candidates.append(('duplicate project', duplicate))
        duplicate_task = copy.deepcopy(self.backup_a)
        duplicate_task['tasks'].append(copy.deepcopy(duplicate_task['tasks'][0]))
        candidates.append(('duplicate task', duplicate_task))
        dangling = copy.deepcopy(self.backup_a)
        dangling['tasks'][0]['projectId'] = '999-unknown-project'
        candidates.append(('unknown task project', dangling))
        before = self.store.state()
        for title, backup in candidates:
            with self.subTest(case=title):
                self.assert_problem(400, lambda: self.service.preview(backup))
                self.assertEqual(self.store.state(), before)

    def test_06_task_count_limit(self):
        """1000项任务边界可预览，1001项拒绝且不写入"""
        backup = copy.deepcopy(self.backup_a)
        template = backup['tasks'][0]
        backup['tasks'] = [{**template, 'id': str(uuid.uuid4())} for _ in range(1000)]
        before = self.store.state()
        self.service.preview(backup)
        backup['tasks'].append({**template, 'id': str(uuid.uuid4())})
        self.assert_problem(400, lambda: self.service.preview(backup))
        self.assertEqual(self.store.state(), before)

    def test_07_catalog_metadata_is_preserved(self):
        """备份内伪造的目录事实与内部控制信息不能覆盖当前目录"""
        before = self.store.state()
        backup = copy.deepcopy(self.backup_a)
        backup['revision'] = 1
        backup['undo'] = {'undoId': 'forged'}
        for project in backup['projects']:
            for key in tuple(project):
                if key not in ('id', 'note', 'status', 'version'):
                    project[key] = ['伪造标签'] if isinstance(project[key], list) else '伪造元数据'
            project['version'] = 1
        result = self.service.apply(self.request(backup))
        for old, new in zip(before['projects'], result['state']['projects']):
            metadata = {k: v for k, v in old.items() if k not in ('note', 'status', 'version')}
            self.assertEqual({k: new[k] for k in metadata}, metadata)
        self.assertEqual(result['state']['snapshotAt'], before['snapshotAt'])
        self.assertNotEqual(result['undoId'], 'forged')

    def test_08_empty_tasks_replace_all_tasks(self):
        """空任务备份清空当前任务，撤销可以恢复全部任务"""
        before = self.become_b()
        backup = copy.deepcopy(self.backup_a)
        backup['tasks'] = []
        result = self.service.apply(self.request(backup))
        self.assertEqual(self.store.state()['tasks'], [])
        self.service.undo({'undoId': result['undoId'], 'confirmed': True})
        self.assertEqual(self.personal(self.store.state()), self.personal(before))

    def test_09_confirmation_and_digest_are_required(self):
        """未明确确认或确认数据与预览不同不能恢复"""
        request = self.request()
        before = self.store.state()
        for confirmation in (None, False, 'true', 1):
            with self.subTest(confirmed=confirmation):
                self.assert_problem(400, lambda: self.service.apply({**request, 'confirmed': confirmation}))
        changed = copy.deepcopy(request)
        changed['backup']['settings']['name'] = '预览后更换的内容'
        self.assert_problem(409, lambda: self.service.apply(changed))
        self.assert_problem(409, lambda: self.service.apply({**request, 'digest': '0' * 64}))
        self.assertEqual(self.store.state(), before)

    def test_10_every_write_invalidates_preview(self):
        """设置、项目、任务更新、新增和删除均使旧预览失效"""
        def update_settings():
            settings = self.store.state()['settings']
            self.store.update('settings', 'workspace', {**settings, 'goal': '预览后的编辑'})
        def update_project():
            project = self.store.state()['projects'][0]
            self.store.update('projects', project['id'], {**project, 'note': '预览后的编辑'})
        def update_task():
            task = self.store.state()['tasks'][0]
            self.store.update('tasks', task['id'], {'version': task['version'], 'done': not task['done']})
        def add_task():
            self.store.add_task({'projectId': self.project_id, 'title': '预览后新增', 'due': ''})
        def delete_task():
            task = self.store.state()['tasks'][-1]
            self.store.delete_task(task['id'], {'version': task['version']})
        for mutation in (update_settings, update_project, update_task, add_task, delete_task):
            with self.subTest(operation=mutation.__name__):
                request = self.request()
                mutation()
                before = self.store.state()
                self.assert_problem(409, lambda: self.service.apply(request))
                self.assertEqual(self.store.state(), before)

    def test_11_undo_is_blocked_by_later_writes(self):
        """恢复后新增记录使撤销失效且不覆盖新数据"""
        self.become_b()
        result = self.restore_a()
        self.store.add_task({'projectId': self.project_id, 'title': '恢复后新建', 'due': '', 'restoreEpoch': self.store.state()['restoreEpoch']})
        before = self.store.state()
        self.assertFalse(self.service.status()['available'])
        self.assert_problem(409, lambda: self.service.undo({'undoId': result['undoId'], 'confirmed': True}))
        self.assertEqual(self.store.state(), before)

    def test_12_changed_back_data_still_invalidates_preview_and_undo(self):
        """个人数据改动再改回仍不可重新激活旧预览和撤销"""
        request = self.request()
        settings = self.store.state()['settings']
        changed = self.store.update('settings', 'workspace', {**settings, 'name': '临时名称'})
        self.store.update('settings', 'workspace', {**settings, 'version': changed['version']})
        before = self.store.state()
        self.assertEqual(self.personal(before), self.personal(self.backup_a))
        self.assert_problem(409, lambda: self.service.apply(request))
        restored = self.restore_a()
        settings = self.store.state()['settings']
        changed = self.store.update('settings', 'workspace', {**settings, 'name': '另一个临时名称'})
        self.store.update('settings', 'workspace', {**settings, 'version': changed['version']})
        before = self.store.state()
        self.assert_problem(409, lambda: self.service.undo({'undoId': restored['undoId'], 'confirmed': True}))
        self.assertEqual(self.store.state(), before)

    def test_13_restore_and_undo_invalidate_old_record_versions(self):
        """恢复和撤销后旧项目与任务版本均不能误写或删除"""
        state_b = self.become_b()
        restored = self.restore_a()
        state_a = self.store.state()
        for state in (self.backup_a, state_b):
            old_project, old_task = state['projects'][0], state['tasks'][0]
            self.assert_problem(409, lambda: self.store.update('projects', old_project['id'], old_project))
            self.assert_problem(409, lambda: self.store.update('tasks', old_task['id'], old_task))
            self.assert_problem(409, lambda: self.store.delete_task(old_task['id'], old_task))
        self.assertEqual(self.store.state(), state_a)
        self.service.undo({'undoId': restored['undoId'], 'confirmed': True})
        after_undo = self.store.state()
        for state in (self.backup_a, state_b, state_a):
            old_project, old_task = state['projects'][0], state['tasks'][0]
            self.assert_problem(409, lambda: self.store.update('projects', old_project['id'], old_project))
            self.assert_problem(409, lambda: self.store.update('tasks', old_task['id'], old_task))
            self.assert_problem(409, lambda: self.store.delete_task(old_task['id'], old_task))
        self.assertEqual(self.store.state(), after_undo)

    def test_14_reintroduced_task_does_not_reuse_old_version(self):
        """删除后从备份重新出现的任务不能复用旧页面版本"""
        task = self.store.state()['tasks'][0]
        self.store.delete_task(task['id'], task)
        self.restore_a()
        before = self.store.state()
        self.assertEqual(before['tasks'][0]['id'], task['id'])
        self.assertGreater(before['tasks'][0]['version'], task['version'])
        self.assert_problem(409, lambda: self.store.update('tasks', task['id'], task))
        self.assert_problem(409, lambda: self.store.delete_task(task['id'], task))
        self.assertEqual(self.store.state(), before)

    def test_15_failed_restore_rolls_back_and_keeps_previous_undo(self):
        """恢复中途任务写入失败时所有数据与原可用撤销记录一起回滚"""
        self.become_b()
        self.restore_a()
        incoming = self.backup()
        incoming['settings']['name'] = '不应写入的名称'
        incoming['projects'][0]['note'] = '不应写入的判断'
        incoming['tasks'][0]['title'] = '不应写入的任务'
        request = self.request(incoming)
        before = self.store.state()
        status = self.service.status()
        self.insert_failure_trigger()
        with self.assertRaises((sqlite3.DatabaseError, Problem)):
            self.service.apply(request)
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.service.status(), status)

    def test_16_failed_undo_rolls_back(self):
        """撤销中途失败时保留恢复后的全部数据及可用撤销记录"""
        self.become_b()
        restored = self.restore_a()
        before = self.store.state()
        status = self.service.status()
        self.insert_failure_trigger()
        with self.assertRaises((sqlite3.DatabaseError, Problem)):
            self.service.undo({'undoId': restored['undoId'], 'confirmed': True})
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.service.status(), status)

    def test_17_parallel_restore_and_undo_are_single_use(self):
        """同时确认相同预览和同时撤销时各只有一次成功"""
        self.become_b()
        request = self.request()
        def apply_once(_):
            try:
                return 200, self.service.apply(copy.deepcopy(request))
            except Problem as error:
                return error.status, None
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(apply_once, range(2)))
        self.assertEqual(sorted(code for code, _ in outcomes), [200, 409])
        restore_result = next(value for code, value in outcomes if code == 200)
        def undo_once(_):
            try:
                return 200, self.service.undo({'undoId': restore_result['undoId'], 'confirmed': True})
            except Problem as error:
                return error.status, None
        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(undo_once, range(2)))
        self.assertEqual(sorted(code for code, _ in outcomes), [200, 409])

    def test_18_undo_requires_current_identifier_and_confirmation(self):
        """撤销必须明确确认且指向最近一次恢复"""
        first = self.restore_a()
        second = self.restore_a()
        before = self.store.state()
        self.assert_problem(400, lambda: self.service.undo({'undoId': second['undoId'], 'confirmed': False}))
        self.assert_problem(409, lambda: self.service.undo({'undoId': first['undoId'], 'confirmed': True}))
        self.assertEqual(self.store.state(), before)
        self.assertEqual(self.service.status()['undoId'], second['undoId'])

    def test_19_large_current_workspace_can_restore_and_undo(self):
        """当前1001项任务可恢复合法小备份，撤销完整找回1001项及其顺序"""
        large_backup = copy.deepcopy(self.backup_a)
        template = large_backup['tasks'][0]
        large_backup['tasks'] = [
            {**template, 'id': str(uuid.uuid4()), 'title': f'批量任务 {number:04d}'}
            for number in range(1000)
        ]
        self.service.apply(self.request(large_backup))
        self.store.add_task({
            'projectId': self.project_id, 'title': '当前空间的第1001项任务', 'due': '',
            'restoreEpoch': self.store.state()['restoreEpoch'],
        })
        before = self.store.state()
        self.assertEqual(len(before['tasks']), 1001)
        request = self.request()
        self.assertEqual(self.store.state(), before)
        restored = self.service.apply(request)
        self.assertEqual(self.personal(restored['state']), self.personal(self.backup_a))
        self.assertEqual(len(restored['state']['tasks']), 1)
        undone = self.service.undo({'undoId': restored['undoId'], 'confirmed': True})
        self.assertEqual(self.personal(undone['state']), self.personal(before))
        self.assertEqual(len(undone['state']['tasks']), 1001)
        self.assertEqual(self.personal(self.store.state()), self.personal(before))
        self.assertFalse(self.service.status()['available'])

    def test_20_old_restore_epochs_cannot_add_tasks(self):
        """恢复与撤销后旧代际及缺省代际新增任务409且零写入，当前代际可新增"""
        before_restore = self.become_b()
        original_epoch = before_restore['restoreEpoch']
        restored = self.restore_a()
        after_restore = self.store.state()
        restored_epoch = after_restore['restoreEpoch']
        self.assertGreater(restored_epoch, original_epoch)
        draft = {'projectId': self.project_id, 'title': '旧页面的任务草稿', 'due': ''}
        for payload in (draft, {**draft, 'restoreEpoch': original_epoch}):
            with self.subTest(stage='after restore', payload=payload):
                self.assert_problem(409, lambda: self.store.add_task(payload))
                self.assertEqual(self.store.state(), after_restore)
                self.assertTrue(self.service.status()['available'])
        self.assertEqual(Store(self.path, self.catalog).state()['restoreEpoch'], restored_epoch)

        self.service.undo({'undoId': restored['undoId'], 'confirmed': True})
        after_undo = self.store.state()
        undo_epoch = after_undo['restoreEpoch']
        self.assertGreater(undo_epoch, restored_epoch)
        for payload in (draft, {**draft, 'restoreEpoch': original_epoch},
                        {**draft, 'restoreEpoch': restored_epoch}):
            with self.subTest(stage='after undo', payload=payload):
                self.assert_problem(409, lambda: self.store.add_task(payload))
                self.assertEqual(self.store.state(), after_undo)
        self.assertEqual(Store(self.path, self.catalog).state()['restoreEpoch'], undo_epoch)
        added = self.store.add_task({**draft, 'title': '撤销后当前页面的新任务',
                                     'restoreEpoch': undo_epoch})
        after_add = self.store.state()
        self.assertEqual(after_add['tasks'][-1], added)
        self.assertEqual(len(after_add['tasks']), len(after_undo['tasks']) + 1)
        self.assertEqual(after_add['restoreEpoch'], undo_epoch)

        self.restore_a()
        latest = self.store.state()
        self.assert_problem(409, lambda: self.store.add_task({**draft, 'restoreEpoch': undo_epoch}))
        self.assertEqual(self.store.state(), latest)
        added = self.store.add_task({**draft, 'title': '恢复后当前页面的新任务',
                                     'restoreEpoch': latest['restoreEpoch']})
        self.assertEqual(self.store.state()['tasks'][-1], added)
        self.assertEqual(self.store.state()['restoreEpoch'], latest['restoreEpoch'])
        self.assertFalse(self.service.status()['available'])

    def test_21_exact_backup_byte_limit(self):
        """紧凑JSON备份精确5MiB可预览和恢复，多1字节413且不写入"""
        limit = 5 * 1024 * 1024
        backup = copy.deepcopy(self.backup_a)
        backup['ignored'] = ''

        def encoded(value):
            return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

        backup['ignored'] = 'x' * (limit - len(encoded(backup)))
        self.assertEqual(len(encoded(backup)), limit)
        # Round-trip actual UTF-8 JSON; Chinese fields ensure character count is not byte count.
        backup = json.loads(encoded(backup))
        before = self.store.state()
        request = self.request(backup)
        self.assertEqual(self.store.state(), before)
        self.assertEqual(request['digest'], self.service.preview(self.backup_a)['digest'])
        oversized = {**backup, 'ignored': backup['ignored'] + 'x'}
        self.assertEqual(len(encoded(oversized)), limit + 1)
        self.assert_problem(413, lambda: self.service.preview(oversized))
        self.assert_problem(413, lambda: self.service.apply({**request, 'backup': oversized}))
        self.assertEqual(self.store.state(), before)
        restored = self.service.apply(request)
        self.assertEqual(self.personal(restored['state']), self.personal(self.backup_a))
        self.assertNotIn('ignored', restored['state'])

    def test_22_legacy_database_revision_migration(self):
        """无control旧库迁移版本不低于全部旧行版本，恢复后旧行不能误保存"""
        legacy_path = Path(self.tmp.name) / 'legacy.sqlite3'
        original = self.store.state()
        versions = {'settings': 19, 'projects': 41, 'tasks': 87}
        rows = {'settings': [original['settings']], 'projects': original['projects'],
                'tasks': original['tasks']}
        with closing(sqlite3.connect(legacy_path)) as db:
            with db:
                for table, values in rows.items():
                    db.execute(f'CREATE TABLE {table} '
                               '(id TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL)')
                    for value in values:
                        key = 'workspace' if table == 'settings' else value['id']
                        data = {k: v for k, v in value.items() if k != 'version'}
                        db.execute(f'INSERT INTO {table} VALUES (?,?,?)',
                                   (key, json.dumps(data, ensure_ascii=False), versions[table]))
                self.assertIsNone(db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='control'").fetchone())

        legacy_store = Store(legacy_path, self.catalog)
        migrated = legacy_store.state()
        highest_version = max(versions.values())
        self.assertGreaterEqual(migrated['revision'], highest_version)
        self.assertEqual(migrated['restoreEpoch'], 0)
        self.assertEqual(self.personal(migrated), self.personal(original))
        self.assertEqual(migrated['settings']['version'], versions['settings'])
        self.assertTrue(all(p['version'] == versions['projects'] for p in migrated['projects']))
        self.assertTrue(all(t['version'] == versions['tasks'] for t in migrated['tasks']))
        legacy_service = self.service_class(legacy_store)
        preview = legacy_service.preview(self.backup_a)
        restored = legacy_service.apply({
            'backup': self.backup_a, 'revision': preview['revision'], 'digest': preview['digest'],
            'confirmed': True,
        })['state']
        self.assertGreater(restored['revision'], highest_version)
        for value in [restored['settings'], *restored['projects'], *restored['tasks']]:
            self.assertGreater(value['version'], highest_version)
        self.assert_problem(409, lambda: legacy_store.update(
            'settings', 'workspace', migrated['settings']))
        self.assert_problem(409, lambda: legacy_store.update(
            'projects', self.project_id, migrated['projects'][0]))
        self.assert_problem(409, lambda: legacy_store.update(
            'tasks', migrated['tasks'][0]['id'], migrated['tasks'][0]))
        self.assertEqual(legacy_store.state(), restored)


class EvidenceResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.items = []
        self.case_errors = {}

    def addSubTest(self, test, subtest, error):
        super().addSubTest(test, subtest, error)
        if error is not None:
            self.case_errors.setdefault(test.id(), []).append(
                {'case': str(subtest), 'error': ''.join(traceback.format_exception(*error))})

    def addFailure(self, test, error):
        super().addFailure(test, error)
        self.case_errors.setdefault(test.id(), []).append(
            {'error': ''.join(traceback.format_exception(*error))})

    def addError(self, test, error):
        super().addError(test, error)
        self.case_errors.setdefault(test.id(), []).append(
            {'error': ''.join(traceback.format_exception(*error))})

    def stopTest(self, test):
        errors = self.case_errors.get(test.id(), [])
        self.items.append({'test': test.id(), 'title': test.shortDescription() or test.id(),
                           'passed': not errors, 'errors': errors})
        super().stopTest(test)


if __name__ == '__main__':
    baseline = not (ROOT / 'app/restore.py').exists()
    result = unittest.TextTestRunner(verbosity=2, resultclass=EvidenceResult).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(RestoreStorage))
    passed = sum(item['passed'] for item in result.items)
    report = {'suite': 'Backup restore / SQLite / restart / conflict / atomic rollback',
              'phase': 'baseline' if baseline else 'verification', 'tests': result.testsRun,
              'passed': passed, 'failed': result.testsRun - passed, 'results': result.items,
              'completedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z')}
    output = ROOT / 'evidence/restore'
    output.mkdir(parents=True, exist_ok=True)
    name = 'storage-baseline.json' if baseline else 'storage-verification.json'
    (output / name).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    sys.exit(not result.wasSuccessful())
