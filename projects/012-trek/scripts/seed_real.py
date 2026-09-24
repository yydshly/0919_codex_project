"""Populate a loopback-only upstream TREK through its real REST API.
Synthetic travel records; real Kyoto locations. Never run against a public instance.
"""
import json, urllib.request, urllib.error, http.cookiejar
from pathlib import Path
from xian_server import read_env

BASE = 'http://127.0.0.1:3212'
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def login_payload():
    email, password = read_env()
    return {'email': email, 'password': password}
def api(path, data=None, method=None):
    req = urllib.request.Request(BASE+'/api'+path, data=json.dumps(data).encode() if data is not None else None,
        headers={'Content-Type':'application/json','Origin':BASE}, method=method or ('POST' if data is not None else 'GET'))
    try:
        with opener.open(req, timeout=60) as res: return json.load(res)
    except urllib.error.HTTPError as e: raise RuntimeError(f'{path}: {e.code} {e.read().decode()}')

def main():
    user=api('/auth/login', login_payload())
    print('Authenticated', list(user))
    api('/auth/me/settings', {'username':'Lin'}, 'PUT')
    api('/settings', {'key':'language','value':'zh'}, 'PUT')
    trips=api('/trips')['trips']
    if any(t['title']=='京都三日 · 三人同行实测' for t in trips):
        raise SystemExit('Scenario already exists; preserving user edits.')
    trip=api('/trips', {'title':'京都三日 · 三人同行实测','description':'原版 TREK 功能实测｜真实京都地点；人物、费用与预订均为演示数据，不代表实际交易。','start_date':'2026-11-06','end_date':'2026-11-08','currency':'JPY'})['trip']
    tid=trip['id']; p=f'/trips/{tid}'
    days=api(p+'/days')['days']; print('Trip',tid,'days',len(days))
    for day,title in zip(days,['东山步行 · 清水寺与祇园','岚山漫游 · 竹林与渡月桥','伏见稻荷 · 市场与返程']):
        api(p+f"/days/{day['id']}",{'title':title},'PUT')
        api(p+f"/days/{day['id']}/transport",{'transport_mode':'walking'},'PUT')
    guests=[api(p+'/guests',{'name':n}) for n in ['阿青','小周']]
    members=api(p+'/members')['members']; print('Members',json.dumps(members,ensure_ascii=False))
    mids=[user['user']['id']]+[m.get('user_id',m.get('id')) for m in members]
    cats=api('/categories')['categories']; print('Categories',[(c['id'],c['name']) for c in cats])
    cat=next((c['id'] for c in cats if c['name'] in ['Sightseeing','景点','Attraction']),cats[0]['id'])
    stops=[
      (0,'清水寺',34.9949,135.7850,'09:00','10:30','京都市东山区清水1丁目294','建议早到；从清水舞台俯瞰京都。'),
      (0,'二年坂・三年坂',34.9975,135.7808,'10:45','12:00','京都市东山区清水','石板坡道慢行，途中午餐。'),
      (0,'八坂神社',35.0037,135.7785,'14:00','15:00','京都市东山区祇园町北侧625','步行前往祇园，预留拍照时间。'),
      (0,'祇园・花见小路',35.0015,135.7750,'16:00','17:00','京都市东山区祇园町南侧','街区散步，请尊重当地摄影规则。'),
      (1,'岚山竹林小径',35.0176,135.6717,'09:00','10:00','京都市右京区嵯峨天龙寺','早晨看竹林，下午回市区。'),
      (1,'天龙寺',35.0158,135.6737,'10:15','11:30','京都市右京区嵯峨天龙寺芒ノ马场町68','庭园参观；票价仅在示例账单中假设。'),
      (1,'渡月桥',35.0095,135.6770,'13:00','14:00','京都市右京区岚山','沿桂川散步。'),
      (2,'伏见稻荷大社',34.9671,135.7727,'08:30','10:30','京都市伏见区深草薮之内町68','穿过千本鸟居，按体力决定登山长度。'),
      (2,'锦市场',35.0050,135.7649,'12:00','13:30','京都市中京区锦小路通','三人分别付款，晚上统一分账。'),
      (2,'京都站',34.9858,135.7588,'16:00','17:00','京都市下京区东盐小路町','预留转车时间；演示不含真实车票。')]
    places=[]; assignments=[]
    for d,name,lat,lng,start,end,address,notes in stops:
        place=api(p+'/places',{'name':name,'lat':lat,'lng':lng,'address':address,'notes':notes,'category_id':cat,'place_time':start,'end_time':end})['place']; places.append(place)
        a=api(p+f"/days/{days[d]['id']}/assignments",{'place_id':place['id']})
        assignments.append(a)
    hotel=api(p+'/places',{'name':'京都站附近住宿（演示）','lat':34.9877,'lng':135.7595,'address':'京都站北侧区域，非真实酒店预订','notes':'两晚住宿示例；未向酒店发送任何信息。','stop_type':'hotel'})['place']
    api(p+'/accommodations',{'place_id':hotel['id'],'start_day_id':days[0]['id'],'end_day_id':days[2]['id'],'check_in':'18:00','check_out':'08:00','confirmation':'DEMO-NOT-A-BOOKING','notes':'演示记录，无实际预订'})
    api(p+'/reservations',{'title':'京都站返程列车（演示）','type':'train','day_id':days[2]['id'],'reservation_time':'17:30','location':'京都站','status':'confirmed','confirmation_number':'DEMO-ONLY','notes':'非真实车次与订单，仅演示预订集中管理。'})
    expenses=[('两晚住宿（三人合计）',36000,'住宿',0),('交通通票（三人合计）',6000,'交通',1),('第一日晚餐（三人合计）',9000,'餐饮',2),('庭园门票（三人合计）',1500,'门票',0)]
    for name,total,category,who in expenses:
        api(p+'/budget',{'name':name,'category':category,'total_price':total,'currency':'JPY','exchange_rate':1,'payers':[{'user_id':mids[who],'amount':total}],'member_ids':mids,'note':'假设支出，用于验证三人均分，不是实时价格。'})
    for name,category,checked,weight in [('护照与复印件','证件',True,80),('交通卡','证件',True,10),('充电宝','电子设备',False,250),('充电线','电子设备',True,60),('折叠伞','随身物品',False,230),('舒适步行鞋','随身物品',False,600),('薄外套','衣物',False,400)]:
        api(p+'/packing',{'name':name,'category':category,'checked':checked,'weight_grams':weight,'quantity':1})
    evidence={'commit':'b98787f83698f3beee1b9a8475121c52f0caf07c','trip_id':tid,'days':days,'members':members,'places':len(places)+1,'assignments':assignments,'budget':api(p+'/budget'),'settlement':api(p+'/budget/settlement'),'scenario':'Synthetic transactions and people; real Kyoto coordinates; original TREK runtime.'}
    out=Path(__file__).resolve().parents[1]/'assets'/'real-evidence.json'
    out.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Seed complete; settlement:',json.dumps(evidence['settlement'],ensure_ascii=False))

if __name__=='__main__': main()
