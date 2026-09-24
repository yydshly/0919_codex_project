const views={
 map:['real-map.png','原版 TREK 京都地图与每日行程','实际加载京都底图与地点照片。开启「路线」后，显示道路走向，以及 657 米 / 8 分钟等逐段步行估计。','亲手试：在地图上找到清水寺','打开原版 →「计划」→ 点击第一天的「清水寺」查看详情。关闭详情后点击当天的「路线」，查看道路走向、分段距离与预计时间。'],
 budget:['real-budget-after.png','原版 TREK 新增午餐后的分账结果','一笔午餐保存后，总支出、每人份额、应收金额和结算建议一起更新。截图货币为日元 JPY。','亲手试：再记一笔共同消费','打开原版 →「费用」→「添加支出」。填入金额、付款人和参与者，保存后查看结算建议。金额由原版计算。'],
 packing:['real-packing.png','原版 TREK 行李准备清单','实测勾选充电宝，已完成数从 3/7 变为 4/7。刷新后仍然保留，记录存入本机 TREK 数据库。','亲手试：把折叠伞收进背包','打开原版 →「列表」→「行李清单」。勾选折叠伞，观察准备进度，再刷新验证保存结果。'],
 booking:['real-booking.png','原版 TREK 两晚住宿预订管理','住宿关联三日行程，显示入住与退房时间；返程列车在「交通」页。全部是演示记录，没有连接真实订单。','亲手试：查看住宿详情','打开原版 →「预订」。查看两晚住宿的入住、退房时间和备注；再到「交通」页查看返程列车。']
};
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
 const [src,alt,caption,title,copy]=views[button.dataset.view];
 document.querySelector('#product-image').src=src;document.querySelector('#product-image').alt=alt;
 document.querySelector('#full-image').href=src;document.querySelector('#product-caption').textContent=caption;
 document.querySelector('#try-title').textContent=title;document.querySelector('#try-copy').textContent=copy;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
