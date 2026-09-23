"use strict";
(() => {
  const stages = [
    { label: "识别输入", title: "先判断，这是一个邮箱。", description: "程序通过格式规则识别输入，把它交给邮箱字段查询。这个步骤只判断格式，不验证邮箱归属。", detail: "准备查询的条件", value: "邮箱 = alice@example.com", count: "尚未开始检索" },
    { label: "第一轮查询", title: "邮箱相同，找到记录 A。", description: "在已有数据库中精确匹配 alice@example.com，命中记录 A。程序从 A 中发现手机号 13000000000，把它作为下一轮的查询条件。", detail: "新发现的关联标识", value: "手机号 = 13000000000", count: "已发现 1 条记录" },
    { label: "第二轮查询", title: "用手机号，再找到记录 B。", description: "记录 B 使用相同的手机号，因此也被找到。此时发现了 QQ 12345，但已经达到默认两轮深度；不会再用 QQ 查找记录 C。", detail: "到达默认深度，停止扩展", value: "保留 A、B；C 未进入结果", count: "已发现 2 条记录" },
    { label: "脱敏输出", title: "把 A、B 的信息打码后返回。", description: "先合并重复记录，再把个人字段分别打码、聚合。下面展示部分输出字段；不会输出记录 C 的邮箱。", detail: "", value: "", count: "输出 A、B 的脱敏字段" }
  ];
  const scenarios = [
    ["使用在线入口", "先区分“使用服务”和“安装代码”。", "作者网站提供在线入口。下载仓库不会让你获得作者的真实数据，自查也不必先搭建一套服务。", "了解在线自查的使用入口。", "在线数据覆盖、查询效果及实际数据处理方式，本次均未验证。", "把在线服务独立评估，不因代码开源就推定服务质量。"],
    ["部署自己的服务", "程序能跑起来，数据仍需准备。", "仓库附带 8 条个人示例记录，适合了解接口。要获得实际查询覆盖面，还需要自己的数据方案。", "查询、两轮关联和脱敏后端，可据此构建原型。", "真实数据、导入与更新，以及页面、访问控制和运行维护。", "先明确数据来源和需求，再决定部署；仅有代码无法复制作者网站的数据覆盖。"],
    ["核查已有数据", "有数据时，它可以成为原型起点。", "如果我们已经拥有且有权使用相关数据，可以用它验证标识匹配、跨记录关联和脱敏展示是否符合核查需求。", "减少基础查询接口和结果整理的开发工作。", "数据索引、关联归属、逐条来源，以及查询上限和权限管理。", "先用小规模数据验证准确性与性能，再考虑扩大使用范围。"],
    ["借鉴实现方式", "最可复用的是查询组织方式。", "从首轮记录提取标识、分层扩展、按记录去重，再按字段整理输出。这个设计可以启发我们自己的检索工具。", "分层关联查询和响应脱敏的具体实现参考。", "按自己的数据模型重做适配，并修正本次发现的问题。", "将它作为独立的信息检索案例；目前未验证与其他研究项目的直接集成。"]
  ];
  let stage = 0;
  const byId = id => document.getElementById(id);
  const stageButtons = [...document.querySelectorAll("[data-stage]")];
  const recordStates = ["等待查询", "等待查询", "等待查询"];
  function renderStage(next) {
    stage = next;
    const data = stages[stage];
    byId("stage-label").textContent = `STEP 0${stage + 1} / ${data.label}`;
    byId("stage-title").textContent = data.title;
    byId("stage-description").textContent = data.description;
    byId("stage-detail").hidden = stage === 3;
    byId("stage-detail").querySelector("span").textContent = data.detail;
    byId("stage-detail").querySelector("strong").textContent = data.value;
    byId("masked-output").hidden = stage !== 3;
    byId("found-count").textContent = data.count;
    byId("step-progress").textContent = `0${stage + 1} / 04`;
    byId("next-step").firstChild.textContent = stage === 3 ? "再看一遍 " : "下一步 ";
    stageButtons.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.stage) === stage)));
    ["a", "b", "c"].forEach((letter, index) => {
      const record = byId(`record-${letter}`);
      const hit = index === 0 ? stage >= 1 : index === 1 && stage >= 2;
      record.classList.toggle("hit", hit);
      record.classList.toggle("masked", hit && stage === 3);
      record.classList.toggle("future", index === 2 && stage >= 2);
      record.querySelector(".record-state").textContent = hit ? (stage === 3 ? "纳入脱敏输出" : `第 ${index + 1} 轮命中`) : (index === 2 && stage >= 2 ? "超过默认深度，未查询" : recordStates[index]);
    });
    byId("link-ab").classList.toggle("active", stage >= 2);
  }
  stageButtons.forEach(button => button.addEventListener("click", () => renderStage(Number(button.dataset.stage))));
  byId("next-step").addEventListener("click", () => renderStage((stage + 1) % stages.length));
  byId("reset-demo").addEventListener("click", () => renderStage(0));
  document.querySelectorAll("[data-scenario]").forEach(button => button.addEventListener("click", () => {
    const data = scenarios[Number(button.dataset.scenario)];
    ["scenario-label", "scenario-title", "scenario-summary", "scenario-gain", "scenario-gap", "scenario-advice"].forEach((id, index) => { byId(id).textContent = data[index]; });
    document.querySelectorAll("[data-scenario]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  }));
  renderStage(0);
})();
