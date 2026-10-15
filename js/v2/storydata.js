// 本文件由 tools/build_story_data.py 从《2.0 物品清单》和《2.0 买家详细故事文档》生成。
// 需要改线索物品、关键词或万物通结果时改文档，再重新跑一次脚本。

// 线索物品：每件只会开出一个，开出后解锁对应买家故事。
export const CLUE_ITEMS = [
  {
    id: "clue_手织毛衣",
    name: "手织毛衣",
    buyer: "纸鹤收藏",
    type: "core",
    discovery: "清洁和整理",
    operations: ["clean", "magnifier"],
    keywords: ["领口布标", "1986"],
    baseValue: 140,
    category: "junk"
  },
  {
    id: "clue_未寄出的邮寄单",
    name: "未寄出的邮寄单",
    buyer: "纸鹤收藏",
    type: "clue1",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["永和路 17 号", "福利院"],
    baseValue: 60,
    category: "junk"
  },
  {
    id: "clue_毛线记账本",
    name: "毛线记账本",
    buyer: "纸鹤收藏",
    type: "clue2",
    discovery: "纸张修复",
    operations: ["clean", "magnifier"],
    keywords: ["四十件毛衣", "每年一件"],
    baseValue: 190,
    category: "common"
  },
  {
    id: "clue_旧账本",
    name: "旧账本",
    buyer: "蓝账本",
    type: "core",
    discovery: "拆开夹页",
    operations: ["clean", "circuit", "magnifier"],
    keywords: ["夹页手写", "感谢信"],
    baseValue: 420,
    category: "common"
  },
  {
    id: "clue_手写转账单",
    name: "手写转账单",
    buyer: "蓝账本",
    type: "clue1",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["1996 年 7 月", "宏源纺织厂"],
    baseValue: 90,
    category: "junk"
  },
  {
    id: "clue_无名感谢信",
    name: "无名感谢信",
    buyer: "蓝账本",
    type: "clue2",
    discovery: "纸张修复",
    operations: ["clean", "magnifier"],
    keywords: ["何小满", "二十封"],
    baseValue: 60,
    category: "junk"
  },
  {
    id: "clue_旧行李箱",
    name: "旧行李箱",
    buyer: "旧货狐狸",
    type: "core",
    discovery: "放大镜检查",
    operations: ["clean", "magnifier"],
    keywords: ["箱内衬", "指纹"],
    baseValue: 380,
    category: "common"
  },
  {
    id: "clue_未寄出的报警回执",
    name: "未寄出的报警回执",
    buyer: "旧货狐狸",
    type: "clue1",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["失踪案", "十年前"],
    baseValue: 80,
    category: "junk"
  },
  {
    id: "clue_当票存根",
    name: "当票存根",
    buyer: "旧货狐狸",
    type: "clue2",
    discovery: "纸张修复",
    operations: ["clean", "magnifier"],
    keywords: ["老狐狸", "三次赎回"],
    baseValue: 70,
    category: "junk"
  },
  {
    id: "clue_超期寄存箱",
    name: "超期寄存箱",
    buyer: "七号仓库",
    type: "core",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["入库日期", "签名"],
    baseValue: 260,
    category: "common"
  },
  {
    id: "clue_旧值班表",
    name: "旧值班表",
    buyer: "七号仓库",
    type: "clue1",
    discovery: "放大镜",
    operations: ["clean", "magnifier"],
    keywords: ["X-09", "停业第二天"],
    baseValue: 90,
    category: "junk"
  },
  {
    id: "clue_手写入库单",
    name: "手写入库单",
    buyer: "七号仓库",
    type: "clue2",
    discovery: "纸张修复",
    operations: ["clean", "magnifier"],
    keywords: ["B-3 批", "补录"],
    baseValue: 80,
    category: "junk"
  },
  {
    id: "clue_十二件套银餐具",
    name: "十二件套银餐具",
    buyer: "绒布经纪人",
    type: "core",
    discovery: "清洁和校对",
    operations: ["clean", "magnifier"],
    keywords: ["十二件", "少一件"],
    baseValue: 1600,
    category: "luxury"
  },
  {
    id: "clue_拍卖行成交单",
    name: "拍卖行成交单",
    buyer: "绒布经纪人",
    type: "clue1",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["同样少一件", "连续三年"],
    baseValue: 120,
    category: "junk"
  },
  {
    id: "clue_修复店工单",
    name: "修复店工单",
    buyer: "绒布经纪人",
    type: "clue2",
    discovery: "放大镜",
    operations: ["clean", "magnifier"],
    keywords: ["缺口人为", "同一手法"],
    baseValue: 90,
    category: "junk"
  },
  {
    id: "clue_旧录音带",
    name: "旧录音带",
    buyer: "午夜电台",
    type: "core",
    discovery: "检查标签",
    operations: ["clean", "magnifier"],
    keywords: ["最后一次试录"],
    baseValue: 260,
    category: "common"
  },
  {
    id: "clue_手写节目单",
    name: "手写节目单",
    buyer: "午夜电台",
    type: "clue1",
    discovery: "标签检查",
    operations: ["clean", "magnifier"],
    keywords: ["1994 年 3 月"],
    baseValue: 110,
    category: "junk"
  },
  {
    id: "clue_电台工牌",
    name: "电台工牌",
    buyer: "午夜电台",
    type: "clue2",
    discovery: "放大镜",
    operations: ["clean", "magnifier"],
    keywords: ["周岚"],
    baseValue: 180,
    category: "common"
  },
];

// 每篇故事的万物通检索结果，键是关键词或关键词组合。
export const STORY_SEARCH = {
  "paper_crane": {
    results: {
      "领口布标": { type: "旧店记录", text: "布标出自一家已经停业的针织铺，同一批布标上写着一整批孩子的名字。" },
      "1986": { type: "旧新闻", text: "1986 年有一批困难家庭的孩子被送到市福利院，登记资料不完整。" },
      "永和路 17 号": { type: "旧地址", text: "永和路 17 号是当年的市福利院，院址已经搬迁。" },
      "福利院": { type: "档案", text: "福利院 1986 年的接收名册里有一个女孩，登记名和布标上的名字不同。" },
      "四十件毛衣": { type: "旧账本", text: "毛线店的销售记录显示，同一位客人连续四十年每年买一次同色毛线。" },
      "每年一件": { type: "帖子", text: "毛线店老板发帖回忆一位每年来买一斤红毛线的老太太。" },
    },
    combos: {
      "1986|领口布标": { type: "寻人帖", text: "一条旧帖在找 1986 年被送养的姐姐，提到的名字和布标上的一致。" },
      "四十件毛衣|福利院": { type: "矛盾记录", text: "名册里只有一个女孩，可毛衣件数比寄出的多一件。" },
    }
  },
  "blue_ledger": {
    results: {
      "夹页手写": { type: "财务档案", text: "宏源纺织厂旧账里夹着一页手写凭证，金额和工亡补助对不上。" },
      "感谢信": { type: "收信登记", text: "厂里的收信登记表上有一类未署名信件，连续二十年每年一封。" },
      "1996 年 7 月": { type: "旧新闻", text: "宏源纺织厂那年出过一起工伤事故，赔偿至今没有结清记录。" },
      "宏源纺织厂": { type: "新闻", text: "工厂倒闭清算，一批职工档案被归入杂项。" },
      "何小满": { type: "旧名单", text: "工亡职工何建军的女儿叫何小满，当年刚上小学。" },
      "二十封": { type: "帖子", text: "旧厂职工发帖回忆，每年都有一封没有署名的信寄到厂里。" },
    },
    combos: {
    }
  },
  "old_fox": {
    results: {
      "箱内衬": { type: "物证档案", text: "失踪案的物证清单里有一只行李箱，内衬上检出不属于箱主的指纹。" },
      "指纹": { type: "旧案记录", text: "十年前一宗失踪案至今未结，关键物证在移交途中丢失。" },
      "失踪案": { type: "新闻", text: "失踪案将在下周重启调查，警方重新征集线索。" },
      "十年前": { type: "旧案档案", text: "当年的报案人不是家属，是一位匿名男子。" },
      "老狐狸": { type: "旧货评价", text: "评价写“狐狸偶尔会做亏本买卖”，同一家当铺出现过三次同款箱子。" },
      "三次赎回": { type: "当铺记录", text: "同一只箱子被同一个人当掉又赎回三次，每次间隔一年。" },
    },
    combos: {
      "指纹|箱内衬": { type: "帖子", text: "旧货市场有人发帖说见过这只箱子，发帖时间在案发后一个月。" },
    }
  },
  "seven_warehouse": {
    results: {
      "入库日期": { type: "系统记录", text: "仓库停业后的第二天，系统里多出一条入库记录，操作员编号 X-09。" },
      "签名": { type: "档案", text: "登记栏的签名与在职员工存档比对，只有一个人的笔迹完全一致。" },
      "X-09": { type: "员工记录", text: "X-09 在停业前一周就已经离职。" },
      "停业第二天": { type: "旧新闻", text: "七号仓库停业当天发生火灾，官方记录里没有人员伤亡。" },
      "B-3 批": { type: "批次记录", text: "B-3 批原本应在停业前销毁，清单上没有销毁确认。" },
      "补录": { type: "档案", text: "补录权限只有主管一级才有，那位主管在停业前已经退休。" },
    },
    combos: {
      "入库日期|签名": { type: "矛盾记录", text: "那天仓库已经断电，卷帘门没有开启记录，可箱子的封条是新的。" },
    }
  },
  "velvet_broker": {
    results: {
      "十二件": { type: "成交记录", text: "成套银餐具的价格是散件总价的三倍。" },
      "少一件": { type: "同好帖", text: "有人统计过，市面上某几款成套器皿永远缺一件。" },
      "连续三年": { type: "帖子", text: "收藏论坛有人发帖问“为什么总是差一件”，回复被删除。" },
      "缺口人为": { type: "维修档案", text: "缺口是新伤，边缘有人为敲击痕迹。" },
      "同一手法": { type: "档案", text: "三家修复店收到过同类工单，描述完全一致。" },
    },
    combos: {
      "十二件|少一件": { type: "旧档案", text: "同一家拍卖行连续三年拍出“只差一件”的成套器皿，买家登记名不同。" },
      "同样少一件|少一件": { type: "拍卖记录", text: "三年内三套器皿，缺失的那一件型号各不相同。" },
    }
  },
  "midnight_radio": {
    results: {
      "最后一次试录": { type: "节目档案", text: "节目档案中没有该期正式播出记录。" },
      "1994 年 3 月": { type: "旧节目表", text: "主持人时段与录音日期接近。" },
      "周岚": { type: "员工记录", text: "周岚负责过一段未播出的试录。" },
    },
    combos: {
    }
  },
};

// 每篇故事的特殊会话：线索物品到手后买家的台词与三个玩家选项。
export const STORY_SPECIAL = {
  "paper_crane": {
    lines: ["这件不是给我的。我从来没穿过红毛衣。", "她织了四十年，一件都没有寄出去。", "@查到邮寄单", "地址写的是福利院。可我们家的地址，四十年没变过。"],
    options: [
      {
        text: "“你母亲为什么不去找她？”",
        reaction: "信任提高，买家沉默后继续交易",
        followUp: "后续通过福利院档案继续追查",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“这些毛衣现在很值钱。”",
        reaction: "信任下降，但当前成交价提高",
        followUp: "后续她会追问邮寄单和记账本",
        trust: -8,
        priceBoost: true,
        mayLeave: false,
        pause: false
      },
      {
        text: "“要不要先问问你母亲？”",
        reaction: "不产生现金，故事暂停",
        followUp: "买家之后回访",
        trust: 0,
        priceBoost: false,
        mayLeave: false,
        pause: true
      },
    ]
  },
  "blue_ledger": {
    lines: ["这一页不能给别人看。钱是我转的，签字也是我签的。", "@查到感谢信", "她一直知道。她只是从来不说。"],
    options: [
      {
        text: "“那家人知道吗？”",
        reaction: "信任提高",
        followUp: "他会说出感谢信的事",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“你在怕什么？”",
        reaction: "信任不变",
        followUp: "故事继续，但信息速度变慢",
        trust: 0,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“这页纸可以卖个好价钱。”",
        reaction: "信任下降",
        followUp: "他会直接压价",
        trust: -8,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
    ]
  },
  "old_fox": {
    lines: ["这箱子不登记，不拍照，直接给我。", "@查到报警回执", "当年报案的人是我。我报了案，然后跑了。"],
    options: [
      {
        text: "“你在躲谁？”",
        reaction: "信任提高",
        followUp: "他会提到下周重启的案子",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“箱子上有什么？”",
        reaction: "信任略降",
        followUp: "他会先要求看成色",
        trust: -3,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“货我可以卖给别人。”",
        reaction: "信任下降",
        followUp: "后续买家可能直接离开",
        trust: -8,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
    ]
  },
  "seven_warehouse": {
    lines: ["这一条记录不该存在。签名是我的，可我不记得那天来过。", "@查到值班表", "流程上那天不该有人。可我确实是最后一个走的。"],
    options: [
      {
        text: "“要不要查当天的监控？”",
        reaction: "信任提高",
        followUp: "他会给出仓库编码",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“你确定这不是你签的？”",
        reaction: "信任略降",
        followUp: "他会要求先看凭证",
        trust: -3,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“箱子和记录可以一起卖。”",
        reaction: "信任下降",
        followUp: "当前报价提高，后续关系恶化",
        trust: -8,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
    ]
  },
  "velvet_broker": {
    lines: ["这套是完整的，对吧。完整的东西才值得谈价。", "@查到成交单", "完整的东西太少。我只是让它们……更少一点。"],
    options: [
      {
        text: "“你手上有几套完整的？”",
        reaction: "信任提高",
        followUp: "他会提到自己那套",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“少一件也能卖。”",
        reaction: "信任下降",
        followUp: "当前收益提高，但他会立刻离店",
        trust: -8,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“为什么要毁掉那一件？”",
        reaction: "信任略降",
        followUp: "他会换个话题，故事继续",
        trust: -3,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
    ]
  },
  "midnight_radio": {
    lines: ["我母亲不是主持人。可我总觉得这段声音是她。", "@查到周岚", "这段录音不是她的，但那个人为什么用她的名字？"],
    options: [
      {
        text: "“我查到了另一名播音员。”",
        reaction: "信任提高",
        followUp: "进入真相路线",
        trust: 6,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“只卖录音带，节目单先留着。”",
        reaction: "信任下降",
        followUp: "当前报价提高",
        trust: -8,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
      {
        text: "“你想继续相信这是她吗？”",
        reaction: "信任略升",
        followUp: "进入开放式结局",
        trust: 3,
        priceBoost: false,
        mayLeave: false,
        pause: false
      },
    ]
  },
};
