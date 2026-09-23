import { knowledgeGroups } from '../site/knowledge-data.mjs';
import { writeFile } from 'node:fs/promises';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function lines(value, max) {
  const result = []; let row = ''; let width = 0;
  for (const char of String(value)) {
    const size = char.charCodeAt(0) > 255 ? 1 : .57;
    if (width + size > max && row && !'，、；。！？”）'.includes(char)) { result.push(row); row = ''; width = 0; }
    row += char; width += size;
  }
  if (row) result.push(row);
  return result;
}
function text(value, x, y, {size=21, color='#263b55', max=17, weight=400, gap=29}={}) {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}">${lines(value,max).map((line,index)=>`<tspan x="${x}" dy="${index ? gap : 0}">${esc(line)}</tspan>`).join('')}</text>`;
}
const backgrounds = ['#edf6f1','#edf3fc','#f3eef8'];
const colors = ['#295e4b','#2c528c','#6e4f87'];
const xs = [260,692,1124];
const shortTaglines = ['覆盖员工全生命周期','谁能做什么、影响谁','能提交，也能正确纠错','计算当时适用的规则','不同角色，共用数据','从能运行到可维护'];
const count = knowledgeGroups.reduce((sum,g)=>sum+g.items.length,0);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1140" viewBox="0 0 1600 1140" role="img" aria-labelledby="title desc">
<title id="title">Frappe HR：业务能力、技术实现与学习价值全景图</title><desc id="desc">六组能力，${count}个学习维度。权限与流程约束协作，时间与规则决定计算，框架支撑界面、集成、任务和演进。</desc>
<style>text{font-family:"Segoe UI","Microsoft YaHei","Noto Sans CJK SC",sans-serif}</style>
<rect width="1600" height="1140" rx="0" fill="#f6f8fc"/>
<rect x="0" y="0" width="1600" height="185" fill="#172942"/>
${text('FRAPPE HR / 能力与价值全景',52,40,{size:17,color:'#afc6e5',max:80})}
${text('一套企业系统，值得学习的不只是页面。',52,89,{size:37,color:'#ffffff',weight:600,max:50})}
${text(`6 组能力 · ${count} 个学习维度     业务解决问题 → 技术承载规则 → 我们复用设计`,54,126,{size:20,color:'#ccdaec',max:100})}
${text('招聘 · 入职 · 档案 · 请假 · 排班考勤 · 薪酬 · 报销 · 培训绩效 · 离职',54,162,{size:19,color:'#b3c8e3',max:100})}
${text('能力领域',66,220,{size:18,color:'#647894',max:15})}
${['业务 / 能做什么','技术 / 如何实现','价值 / 值得学习'].map((label,i)=>text(label,xs[i]+15,220,{size:20,color:colors[i],weight:600,max:30})).join('')}
${knowledgeGroups.map((g,i)=>{const y=240+i*120;return `<rect x="44" y="${y}" width="1512" height="110" rx="10" fill="#ffffff"/>
${text(`0${i+1}`,66,y+28,{size:16,color:'#7c93b0',max:10})}
${text(g.title,66,y+58,{size:22,weight:600,max:8})}
${text(shortTaglines[i],66,y+91,{size:15,color:'#70829a',max:12,gap:19})}
${[g.business,g.technical,g.learning].map((content,c)=>`<rect x="${xs[c]}" y="${y+10}" width="392" height="72" rx="7" fill="${backgrounds[c]}"/>${text(content,xs[c]+16,y+37,{size:21,color:colors[c],max:17.2,gap:28})}`).join('')}
${text('→',660,y+51,{size:23,color:'#9caabd',max:3})}${text('→',1092,y+51,{size:23,color:'#9caabd',max:3})}
${text(g.items.map(item=>item.title).join('  /  '),276,y+101,{size:15,color:'#6d7f98',max:105})}`;}).join('')}
<rect x="44" y="970" width="1512" height="62" rx="9" fill="#e8eef7"/>
${text('技术底座',66,1008,{size:18,color:'#506887',max:12})}
${text('HRMS · 人事与薪酬业务',260,1008,{size:20,max:35})}
${text('ERPNext · 企业基础与财务',692,1008,{size:20,max:35})}
${text('Frappe · 模型、权限、接口、任务',1124,1008,{size:20,max:35})}
${text('核心价值：让不同角色在规则与权限内协作，得到可追溯的业务结果。',52,1070,{size:23,weight:600,max:100})}
${text('源码研究 / v16  ·  角色范围需配置  ·  台账不等于防篡改  ·  工资单修正与重算需明确策略  ·  上线需验证并发、恢复与地区适配',52,1109,{size:16,color:'#72849d',max:140})}
</svg>`;
await writeFile(new URL('../site/capability-map.svg',import.meta.url),svg,'utf8');
await writeFile(new URL('../assets/capability-map.svg',import.meta.url),svg,'utf8');
console.log(`Generated capability map: ${knowledgeGroups.length} groups, ${count} dimensions`);
