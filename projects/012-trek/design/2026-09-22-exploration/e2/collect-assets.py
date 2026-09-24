"""Read-only inspection of generated PNGs; writes metadata, never edits pixels."""
from pathlib import Path
from PIL import Image
import hashlib, json

root = Path(__file__).resolve().parent
references = json.loads((root/'data/references.json').read_text(encoding='utf-8'))
reviews = {
 'bell-tower': {'status':'候选 · 主要特征可辨', 'observations':['三道主要檐线、中央宝顶、紧凑楼身和砖台拱洞可辨。','以夜景照片转成日景插画，颜色与细部有生成补绘。'], 'limitations':['局部透明边缘存在彩色光边及淡残留，尚待清理。','未做测绘式比例、背面与建筑细部核验。']},
 'drum-tower': {'status':'候选 · 主要特征可辨', 'observations':['长屋脊、端部山墙、横向楼身和一排鼓保留下来。','可与钟楼的中央宝顶轮廓区分。'], 'limitations':['鼓的数量、栏杆、台阶与装饰属于简化和补绘。','主体右侧留白较小，透明边缘杂色仍待处理。']},
 'pagoda': {'status':'修正候选 · 七层可辨', 'observations':['首版错误为六层，并添加了缺乏证据的高砖台与栏杆。','二次生成后七层拱窗可辨，高台与栏杆已去除。'], 'limitations':['底部在原照片中被遮挡，当前低底缘不代表实测基础。','塔刹、砌体细部和透明边缘仍需进一步核验与修整。']},
 'terracotta': {'status':'候选 · 内部主题符号', 'observations':['陶俑军阵、夯土隔梁和坑内纵深关系可辨。','按历史内景生成了微缩剖块，而非景区建筑外观。'], 'limitations':['排列数量、陶俑细节、剖块形状经过重新组织。','不是一号坑真实平面、完整园区鸟瞰或实际导航范围。','透明边缘残留仍待处理。']},
}
origins = {'bell-tower':'exec-62d22daf-9e67-4ef3-b9e6-142efade3df3.png','drum-tower':'exec-2dd26dd5-24f4-4463-800d-b5eee5ac7a46.png','pagoda':'exec-8f41fbc2-e67a-4ff2-8693-a745e1bbf84f.png','terracotta':'exec-293969e5-fd1f-47d7-8ea9-fb92313d9b24.png'}
assets=[]
for key,review in reviews.items():
 path=root/'assets'/f'{key}.png'
 image=Image.open(path)
 alpha=image.getchannel('A')
 ref=next(p for p in references['places'] if p['id']==key)
 assets.append({'id':key,'placeId':key,'src':f'assets/{key}.png','width':image.width,'height':image.height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'alpha':{'hasTransparency':alpha.getextrema()[0]<255,'extrema':list(alpha.getextrema()),'nonzeroBounds':list(alpha.getbbox()),'visibleBox':list(alpha.point(lambda v:255 if v>=128 else 0).getbbox()),'note':'alpha >= 128 的边界仅描述像素，不代表自动识别建筑主体'},'referenceId':key,'referenceSrc':ref['src'],'referenceSha256':ref['sha256'],'sourceUrl':ref['sourceUrl'],'credit':ref['credit'],'license':ref['license'],'licenseUrl':ref['licenseUrl'],'generation':{'method':'built-in image_gen','model':None,'outputFile':origins[key],'version':'v2' if key=='pagoda' else 'v1','pixelEditsAfterGeneration':False},'visualReview':review})
manifest={'schemaVersion':'e2-assets-v1','createdAt':'2026-09-22','stage':'candidate','generation':{'method':'built-in image_gen','model':None,'modelNote':'工具未公开具体模型版本，未猜填','promptsFile':'data/prompts.json','fullLogFile':'data/generation-log.json','calls':5},'assets':assets,'rejectedCandidates':[{'placeId':'pagoda','src':'assets/pagoda-v1-rejected.png','reason':'只有六层可见拱窗，并新增无参考支持的高砖台及栏杆','replacement':'assets/pagoda.png','sha256':hashlib.sha256((root/'assets/pagoda-v1-rejected.png').read_bytes()).hexdigest()}],'reviewBoundary':'本轮为初步视觉对照，不等同建筑专家认证；透明边缘与整体审美尚待迭代。真实入口、票价、导航不在E2范围内。'}
(root/'data/asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'assets':len(assets),'transparent':sum(a['alpha']['hasTransparency'] for a in assets),'calls':5,'status':'candidate'},ensure_ascii=False))
