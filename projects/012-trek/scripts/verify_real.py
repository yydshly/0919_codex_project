"""Read-only check of the completed original-app demo, after UI interactions."""
import json
from pathlib import Path
from seed_real import api, login_payload

api('/auth/login', login_payload())
trip=next(t for t in api('/trips')['trips'] if t['title']=='京都三日 · 三人同行实测')
p=f"/trips/{trip['id']}"
result={k:api(p+path) for k,path in [('days','/days'),('places','/places'),('packing','/packing'),('budget','/budget'),('settlement','/budget/settlement'),('reservations','/reservations')]}
assert len(result['days']['days'])==3
assert len(result['places']['places'])==11
assert sorted(f['amount'] for f in result['settlement']['flows'])==[9500,12500]
assert all(v['final']==18500 for v in result['settlement']['finalBudgets'])
items=result['packing']['items']
assert len(items)==7 and sum(bool(i['checked']) for i in items)==4
assert next(i for i in items if i['name']=='充电宝')['checked']
Path(__file__).resolve().parents[1].joinpath('assets/real-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Original TREK verified: 3 days, 11 places, 4/7 packed, equal shares 18,500 JPY; settlement 12,500 + 9,500 JPY.')
