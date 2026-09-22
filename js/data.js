export const CONFIG = {
  maxDays: 5,
  lotsPerDay: 2,
  maxBoxesPerRun: 10,
  startingCash: 800,
  debtTarget: 15000,
  maxTrouble: 10,
  quickSaleMultiplier: 0.6,
  highSaleMultiplier: 1,
  bidIncrement: 0.1,
  storageKey: "last-box-v0.5-stage-3-save",
  workingStorageKey: "last-box-v0.5-stage-3-working",
  brokerName: "黑匣信贷",
  firstPayment: 1800,
  paymentIntervalDays: 7,
  gameMinutesPerSecond: 2.5,
  idleReminderSeconds: 15
};

export const DESKTOP_APPS = [
  {
    id: "mail",
    name: "邮件",
    icon: "mail",
    area: "dock",
    windowTitle: "收件箱",
    defaultSize: { width: 680, height: 560 },
    description: "查看贷款和平台消息。"
  },
  {
    id: "calendar",
    name: "日历",
    icon: "calendar",
    area: "dock",
    windowTitle: "日历",
    defaultSize: { width: 660, height: 540 },
    description: "查看还款日并申请应急贷款。"
  },
  {
    id: "auction",
    name: "线上拍卖",
    icon: "auction",
    area: "desktop",
    windowTitle: "线上失物拍卖",
    defaultSize: { width: 820, height: 600 },
    description: "参加每日行李箱拍卖。"
  },
  {
    id: "shop",
    name: "我的店铺",
    icon: "shop",
    area: "desktop",
    windowTitle: "我的店铺",
    defaultSize: { width: 840, height: 620 },
    description: "管理库存、上架商品和买家私信。"
  },
  {
    id: "folder",
    name: "文件夹",
    icon: "folder",
    area: "desktop",
    windowTitle: "藏品文件夹",
    defaultSize: { width: 720, height: 540 },
    description: "查看自留藏品及属性。"
  },
  {
    id: "universal",
    name: "万物通",
    icon: "universal",
    area: "desktop",
    windowTitle: "万物通",
    defaultSize: { width: 860, height: 640 },
    description: "搜索物品关键词并购买道具。"
  },
  {
    id: "item-detail",
    name: "物品详情",
    icon: "folder",
    area: "system",
    windowTitle: "物品详情",
    defaultSize: { width: 720, height: 560 },
    description: "物品资料与关键词"
  }
];

export const STAGE_TWO_DATA = {
  news: {
    id: "first_auction",
    title: "线上失物拍卖即将开始",
    effect: "两只无人认领行李箱已经上架",
    duration: "今天",
    detail:
      "今晚将进行一场无人认领行李箱拍卖。箱子来源和内容均未完整登记，成交后可以选择原封转卖、现场开箱或带回家。平台提醒：高价值物品和来源不明物品可能带来额外风险。"
  },
  auctionBox: {
    id: "stage2_auction_box",
    destination: "苏黎世",
    appearance: "锁具损坏",
    appearanceDescription: "锁扣被人撬过，里面的东西可能被动过手脚。",
    startingPrice: 180,
    competitors: [
      {
        id: "rival_old_zhou",
        name: "铁皮箱老周",
        budget: 260,
        aggression: 0.55
      },
      {
        id: "rival_mimi",
        name: "不眨眼咪咪",
        budget: 320,
        aggression: 0.7
      }
    ],
    items: [
      {
        id: "stage2_silver_ring",
        name: "旧银戒",
        category: "luxury",
        baseValue: 300,
        onsitePrice: 310,
        description: "旧式戒托内刻着一个不完整的字母。",
        keywords: ["刻字 L", "旧式戒托"]
      }
    ]
  },
  dailyAuctionBoxes: [
    {
      id: "daily_paris",
      destination: "巴黎",
      appearance: "磨损",
      appearanceDescription: "边角掉色，轮子发涩，像是被拖过很多次。",
      startingPrice: 220,
      competitors: [
        { id: "rival_lina", name: "一锤定音莉娜", budget: 360, aggression: 0.75 },
        { id: "rival_hu", name: "旧货胡叔", budget: 300, aggression: 0.45 }
      ],
      items: [
        {
          id: "fashion_catalog",
          name: "限量时装目录",
          category: "common",
          baseValue: 280,
          onsitePrice: 220,
          description: "封面已经褪色，内页夹着一张订货单。",
          keywords: ["限量编号", "旧书页"]
        },
        {
          id: "perfume_bottle",
          name: "未开封香水",
          category: "luxury",
          baseValue: 650,
          onsitePrice: 560,
          source: "某位匿名收藏家赠送",
          description: "瓶身没有品牌，只贴着一枚手写标签。",
          keywords: ["私人调制", "封条完整"]
        }
      ]
    },
    {
      id: "daily_tokyo",
      destination: "东京",
      appearance: "完整",
      appearanceDescription: "外壳非常整洁，锁扣还能正常使用。",
      startingPrice: 260,
      competitors: [
        { id: "rival_mimi", name: "不眨眼咪咪", budget: 430, aggression: 0.68 },
        { id: "rival_seven", name: "七号买家", budget: 500, aggression: 0.72 }
      ],
      items: [
        {
          id: "compact_camera",
          name: "复古数码相机",
          category: "common",
          baseValue: 430,
          onsitePrice: 340,
          effect: "买家初始信任 +10",
          effectKey: "buyer_trust",
          description: "存储卡还在，最后一张照片拍的是空房间。",
          keywords: ["旧式镜头", "最后照片"]
        },
        {
          id: "phone_strap",
          name: "手工手机挂绳",
          category: "junk",
          baseValue: 70,
          onsitePrice: 45,
          description: "挂绳上缝着一个很小的字母。",
          keywords: ["手写字母", "旧挂绳"]
        }
      ]
    },
    {
      id: "daily_cairo",
      destination: "开罗",
      appearance: "撕裂",
      appearanceDescription: "箱体侧面裂开一道口子，有人似乎翻找过里面。",
      startingPrice: 190,
      competitors: [
        { id: "rival_old_zhou", name: "铁皮箱老周", budget: 310, aggression: 0.52 },
        { id: "rival_seven", name: "七号买家", budget: 420, aggression: 0.74 }
      ],
      items: [
        {
          id: "stone_rubbing",
          name: "石刻拓印",
          category: "common",
          baseValue: 330,
          onsitePrice: 250,
          source: "某位匿名收藏家赠送",
          description: "纸张很脆，角落写着一段无法辨认的编号。",
          keywords: ["石刻编号", "旧拓印"]
        },
        {
          id: "brass_compass",
          name: "黄铜罗盘",
          category: "luxury",
          baseValue: 720,
          onsitePrice: 640,
          effect: "在线成交价格 +10%",
          effectKey: "sale_bonus",
          description: "指针停在错误的方向，外壳却异常干净。",
          keywords: ["黄铜标记", "方向异常"]
        }
      ]
    },
    {
      id: "daily_remote",
      destination: "偏远地区",
      appearance: "明显异味",
      appearanceDescription: "一股陈旧的味道，箱子底部贴着已经过期的托运单。",
      startingPrice: 160,
      competitors: [
        { id: "rival_hu", name: "旧货胡叔", budget: 260, aggression: 0.42 },
        { id: "rival_lina", name: "一锤定音莉娜", budget: 370, aggression: 0.78 }
      ],
      items: [
        {
          id: "field_notebook",
          name: "野外记录本",
          category: "common",
          baseValue: 240,
          onsitePrice: 180,
          description: "记录被雨水泡过，只有几页还能看清。",
          keywords: ["坐标编号", "雨水痕迹"]
        },
        {
          id: "silver_flask",
          name: "旧银酒壶",
          category: "luxury",
          baseValue: 680,
          onsitePrice: 590,
          source: "某位匿名收藏家赠送",
          effect: "成功售出后额外增加 1 点信誉",
          effectKey: "reputation_bonus",
          description: "壶底刻着一个被故意磨掉的姓氏。",
          keywords: ["磨损姓名", "旧银标记"]
        },
        {
          id: "sealed_vials",
          name: "无标签密封药瓶",
          category: "special",
          baseValue: 1600,
          onsitePrice: null,
          description: "瓶身没有任何标签，封口来自非医疗渠道。",
          keywords: ["无标签批次", "灰色渠道"],
          risk: "违禁品",
          specialType: "contraband"
        }
      ]
    }
  ],
  starterItems: [
    {
      id: "starter_camera",
      name: "旧数码相机",
      category: "common",
      status: "unviewed",
      baseValue: 360,
      onsitePrice: 280,
      description: "外壳磨得很旧，快门仍然可以按下。",
      keywords: ["编号 K-12", "旧式镜头"]
    },
    {
      id: "starter_lamp",
      name: "旧台灯",
      category: "common",
      status: "unviewed",
      baseValue: 120,
      onsitePrice: 90,
      description: "灯罩边缘缺了一小块，灯泡还能亮。",
      keywords: ["黄铜底座", "旧灯罩"]
    },
    {
      id: "starter_radio",
      name: "便携收音机",
      category: "common",
      status: "unviewed",
      baseValue: 310,
      onsitePrice: 250,
      description: "旋钮有些松动，短波频道还能收到声音。",
      keywords: ["短波刻度", "旧式外壳"]
    },
    {
      id: "starter_watch",
      name: "停走的旧腕表",
      category: "common",
      status: "unviewed",
      baseValue: 450,
      onsitePrice: 360,
      description: "表带已经褪色，背面刻着一串很浅的数字。",
      keywords: ["腕表刻字", "停走机芯"]
    },
    {
      id: "starter_box",
      name: "小型工具箱",
      category: "common",
      status: "unviewed",
      baseValue: 260,
      onsitePrice: 210,
      description: "工具并不齐全，底层压着一张手写维修单。",
      keywords: ["维修单据", "旧式工具"]
    }
  ],
  folderItemPool: [
    {
      id: "starter_work_pass",
      name: "旧工作证",
      category: "collection",
      effect: "所有在线交易的买家初始信任 +5",
      effectKey: "buyer_trust_global",
      description: "照片已经褪色，证件编号仍然清楚。",
      keywords: ["编号 A-03", "旧证件"]
    },
    {
      id: "starter_bank_notebook",
      name: "旧账本",
      category: "collection",
      effect: "在线成交手续费由 10% 降为 5%",
      effectKey: "fee_reduction",
      description: "前后数页被撕掉，剩余数字却排列得很整齐。",
      keywords: ["手写账目", "银行印章"]
    },
    {
      id: "starter_display_stand",
      name: "旧展示架",
      category: "collection",
      effect: "所有在线成交价格提高 5%",
      effectKey: "sale_bonus_global",
      description: "支架可以折叠，边缘贴着已经褪色的价签。",
      keywords: ["展示编号", "旧价签"]
    },
    {
      id: "starter_legal_card",
      name: "律师名片",
      category: "collection",
      effect: "处理麻烦值的费用降低 100",
      effectKey: "trouble_discount",
      description: "名片上的电话号码被重新写过一次。",
      keywords: ["律师姓名", "旧电话号码"]
    }
  ],
  clueItemPool: [
    {
      id: "clue_locker_receipt",
      name: "旧寄存柜收据",
      category: "collection",
      clue: true,
      sellable: false,
      clueStage: 1,
      description: "纸边已经发脆，编号处残留着被水浸过的蓝色墨迹。",
      keywords: ["K-12", "褪色印章"]
    },
    {
      id: "clue_torn_ticket",
      name: "缺角旧车票",
      category: "collection",
      clue: true,
      sellable: false,
      clueStage: 2,
      description: "目的地一栏被撕掉了，背面写着一串很轻的日期。",
      keywords: ["旧车站", "残缺日期"]
    }
  ],
  itemEffectPool: [
    {
      effect: "在线成交手续费降低 5%",
      effectKey: "fee_reduction"
    },
    {
      effect: "在线成交价格提高 5%",
      effectKey: "sale_bonus_global"
    },
    {
      effect: "现场出售总收入提高 10%",
      effectKey: "onsite_bonus_global"
    },
    {
      effect: "买家初始信任 +5",
      effectKey: "buyer_trust_global"
    },
    {
      effect: "成功售出后额外增加 1 点信誉",
      effectKey: "reputation_bonus"
    }
  ],
  shopCollectionItems: [
    {
      id: "shop_buyer_list",
      name: "旧客户名单",
      category: "collection",
      baseValue: 480,
      effect: "所有在线交易的买家初始信任 +5",
      effectKey: "buyer_trust_global",
      description: "纸页被翻得发毛，几位买家的名字旁画着不同颜色的记号。",
      keywords: ["客户姓名", "旧通讯录"]
    },
    {
      id: "shop_auction_hammer",
      name: "掉漆拍卖槌",
      category: "collection",
      baseValue: 560,
      effect: "原封转卖报价提高 8%",
      effectKey: "resale_bonus",
      description: "槌柄上留着许多握手留下的磨痕。",
      keywords: ["拍卖编号", "槌柄刻痕"]
    },
    {
      id: "shop_filter_lens",
      name: "鉴定放大镜",
      category: "collection",
      baseValue: 620,
      effect: "万物通搜索额外确认一条信息",
      effectKey: "research_bonus",
      description: "镜片边缘有一道细裂纹，焦点仍然清楚。",
      keywords: ["镜片刻度", "鉴定工具"]
    },
    {
      id: "shop_hidden_compartment",
      name: "夹层保险箱",
      category: "collection",
      baseValue: 720,
      effect: "每件物品每天的保管费降低 5",
      effectKey: "storage_guard",
      description: "外表像普通工具箱，底部却藏着一个很薄的夹层。",
      keywords: ["夹层结构", "旧保险编号"]
    },
    {
      id: "shop_insurance_folder",
      name: "保险文件袋",
      category: "collection",
      baseValue: 500,
      effect: "下一次警察查扣罚款降低 50%",
      effectKey: "insurance_reduction",
      description: "封口处的印章已经模糊，条款里却有一条醒目的赔偿记录。",
      keywords: ["保险编号", "赔偿条款"]
    }
  ],
  collectionCombos: [
    {
      id: "quick_market",
      name: "快速周转",
      itemIds: ["starter_display_stand", "shop_auction_hammer"],
      effectKey: "combo_quick_cash",
      effect: "原封转卖和现场出售总收入提高 8%"
    },
    {
      id: "buyer_network",
      name: "旧客户网络",
      itemIds: ["starter_work_pass", "shop_buyer_list"],
      effectKey: "combo_buyer_network",
      effect: "所有买家初始信任额外 +5"
    },
    {
      id: "clean_ledger",
      name: "干净账本",
      itemIds: ["starter_bank_notebook", "starter_legal_card"],
      effectKey: "combo_clean_books",
      effect: "在线手续费再降低 3%，麻烦处理费用再降低 50"
    }
  ],
  hiddenArchetypes: [
    {
      id: "quick_cash",
      threshold: 6,
      effectKey: "archetype_quick_cash",
      hint: "你正在频繁追求当天回款"
    },
    {
      id: "negotiation",
      threshold: 6,
      effectKey: "archetype_negotiation",
      hint: "你正在建立稳定的线上买家关系"
    },
    {
      id: "debt",
      threshold: 4,
      effectKey: "archetype_debt",
      hint: "你越来越依赖贷款维持周转"
    },
    {
      id: "storage",
      threshold: 6,
      effectKey: "archetype_storage",
      hint: "你习惯把物品留到更合适的时机"
    },
    {
      id: "compliant",
      threshold: 4,
      effectKey: "archetype_compliant",
      hint: "你更愿意通过正规渠道处理风险"
    },
    {
      id: "risk",
      threshold: 4,
      effectKey: "archetype_risk",
      hint: "你正在接触更危险但利润更高的交易"
    }
  ],
  mallProducts: [
    {
      id: "service_lawyer",
      type: "service",
      name: "律师服务",
      price: 900,
      description: "立刻降低 2 点麻烦，并解除第一阶段警察调查。",
      effect: "麻烦值 -2，调查警告解除"
    },
    {
      id: "service_protection",
      type: "service",
      name: "保护服务",
      price: 650,
      description: "下一次匿名威胁会自动被保护人员处理。",
      effect: "抵消一次威胁事件"
    },
    {
      id: "service_cleanup",
      type: "service",
      name: "数据清理",
      price: 420,
      description: "降低 1 点麻烦，并清除一次伪造交易的曝光风险。",
      effect: "麻烦值 -1，伪造护航 1 次"
    },
    {
      id: "service_insurance",
      type: "service",
      name: "保险服务",
      price: 700,
      description: "下一次警察查扣产生的罚款降低一半。",
      effect: "下一次查扣罚款 -50%"
    },
    {
      id: "collection_buyer_list",
      type: "collection",
      name: "旧客户名单",
      price: 850,
      description: "增加一名长期联系的买家名单。",
      effect: "买家初始信任 +5",
      itemTemplateId: "shop_buyer_list"
    },
    {
      id: "collection_auction_hammer",
      type: "collection",
      name: "掉漆拍卖槌",
      price: 980,
      description: "来自旧拍卖行的槌子，熟悉成交节奏。",
      effect: "原封转卖报价 +8%",
      itemTemplateId: "shop_auction_hammer"
    },
    {
      id: "collection_filter_lens",
      type: "collection",
      name: "鉴定放大镜",
      price: 1050,
      description: "能帮助万物通确认额外一条物品资料。",
      effect: "搜索额外确认 1 条信息",
      itemTemplateId: "shop_filter_lens"
    },
    {
      id: "collection_hidden_compartment",
      type: "collection",
      name: "夹层保险箱",
      price: 1200,
      description: "减少保管物品产生的日常费用。",
      effect: "保管费每件降低 5",
      itemTemplateId: "shop_hidden_compartment"
    },
    {
      id: "collection_insurance_folder",
      type: "collection",
      name: "保险文件袋",
      price: 880,
      description: "下一次查扣时提供赔偿依据。",
      effect: "查扣罚款 -50%",
      itemTemplateId: "shop_insurance_folder"
    },
    {
      id: "collection_work_pass",
      type: "collection",
      name: "旧工作证",
      price: 620,
      description: "能证明旧交易身份的基础收藏品。",
      effect: "买家初始信任 +5",
      itemTemplateId: "starter_work_pass"
    },
    {
      id: "collection_bank_notebook",
      type: "collection",
      name: "旧账本",
      price: 760,
      description: "减少在线成交手续费的旧账本。",
      effect: "在线手续费降低 5%",
      itemTemplateId: "starter_bank_notebook"
    },
    {
      id: "collection_display_stand",
      type: "collection",
      name: "旧展示架",
      price: 700,
      description: "能提高在线展示效果的旧支架。",
      effect: "在线成交价格 +5%",
      itemTemplateId: "starter_display_stand"
    },
    {
      id: "collection_legal_card",
      type: "collection",
      name: "律师名片",
      price: 580,
      description: "处理麻烦时能联系到一位旧律师。",
      effect: "麻烦处理费用 -100",
      itemTemplateId: "starter_legal_card"
    },
    {
      id: "fake_blank_label",
      type: "fake",
      name: "空白标签",
      price: 160,
      description: "可以自行填写商品名称和来源。",
      effect: "报价上限 +25%，曝光风险 22%",
      priceMultiplier: 1.25,
      exposureChance: 0.22,
      forgeryType: "label"
    },
    {
      id: "fake_packaging",
      type: "fake",
      name: "虚假包装",
      price: 240,
      description: "模仿正规包装，让商品看起来保存得更好。",
      effect: "报价上限 +35%，曝光风险 28%",
      priceMultiplier: 1.35,
      exposureChance: 0.28,
      forgeryType: "packaging"
    },
    {
      id: "fake_material",
      type: "fake",
      name: "替代材料",
      price: 190,
      description: "替换明显缺失的零件，外观更难被察觉。",
      effect: "报价上限 +42%，曝光风险 36%",
      priceMultiplier: 1.42,
      exposureChance: 0.36,
      forgeryType: "material"
    },
    {
      id: "fake_source",
      type: "fake",
      name: "伪造来源文件",
      price: 340,
      description: "给普通物品补上一段看似完整的私人来源。",
      effect: "报价上限 +60%，曝光风险 44%",
      priceMultiplier: 1.6,
      exposureChance: 0.44,
      forgeryType: "source"
    }
  ],
  forgeryTargets: [
    {
      id: "collector",
      name: "收藏型买家",
      description: "更容易接受来源文件和旧标签，但对故事真实性敏感。",
      buyerIds: ["paper_crane", "midnight_radio"],
      compatibleTypes: ["source", "label"],
      riskMultiplier: 1.08,
      rewardMultiplier: 1.12
    },
    {
      id: "quick_sale",
      name: "低价快销",
      description: "关注价格和速度，包装与替代材料更容易蒙混过去。",
      buyerIds: ["old_fox", "blue_ledger"],
      compatibleTypes: ["packaging", "material"],
      riskMultiplier: 0.82,
      rewardMultiplier: 1
    },
    {
      id: "strict_reviewer",
      name: "审核型买家",
      description: "核验最严格，但一旦成交能接受更高的伪造溢价。",
      buyerIds: ["seven_warehouse"],
      compatibleTypes: ["source", "material"],
      riskMultiplier: 1.35,
      rewardMultiplier: 1.38
    }
  ],
  contrabandConfig: {
    depositRateRange: [0.4, 0.6],
    riskWindowDays: [2, 3],
    payoutMultipliers: [1, 0.82, 0.68, 0.55],
    baseInvestigationChance: 0.12,
    attentionChanceStep: 0.11
  },
  visitorTemplates: [
    {
      id: "collector",
      type: "collector",
      name: "收藏家",
      dayRange: [5, 8],
      message: "一位收藏家想查看你留下的藏品，并愿意为准备充分的卖家支付高价。",
      acceptLabel: "展示藏品",
      declineLabel: "拒绝会面"
    },
    {
      id: "auditor",
      type: "auditor",
      name: "平台审核员",
      dayRange: [6, 9],
      message: "平台审核员要求检查你的标签、价格和交易记录。",
      acceptLabel: "配合审核",
      declineLabel: "拖延审核"
    },
    {
      id: "appraiser",
      type: "appraiser",
      name: "鉴定师",
      dayRange: [5, 9],
      message: "一名鉴定师愿意免费检查一件库存物品，补全它的真实资料。",
      acceptLabel: "接受鉴定",
      declineLabel: "暂不鉴定"
    },
    {
      id: "investigator",
      type: "investigator",
      name: "调查员",
      dayRange: [7, 11],
      message: "调查员对来源不明的物品很感兴趣，要求你说明库存情况。",
      acceptLabel: "配合检查",
      declineLabel: "拒绝检查"
    },
    {
      id: "wholesaler",
      type: "wholesaler",
      name: "收购商",
      dayRange: [4, 8],
      message: "一名收购商愿意一次性买走库存里的普通物品和垃圾。",
      acceptLabel: "批量出售",
      declineLabel: "保留库存"
    },
    {
      id: "mystery_buyer",
      type: "mystery_buyer",
      name: "神秘买家",
      dayRange: [8, 12],
      message: "神秘买家只对来源特殊的物品感兴趣，报价很高，但不会留下记录。",
      acceptLabel: "秘密交易",
      declineLabel: "拒绝交易"
    }
  ],
  listingTags: [
    "旧物",
    "编号 K-12",
    "可收藏",
    "来源不明",
    "金属",
    "私人来源",
    "待鉴定",
    "旧式镜头"
  ],
  runRules: [
    {
      id: "collector_heat",
      name: "收藏热",
      description: "奢侈品售价提高，但公开出售会增加麻烦。",
      effect: "luxury_price"
    },
    {
      id: "strict_review",
      name: "严格审查",
      description: "未验证标签更容易引起买家怀疑。",
      effect: "tag_review"
    },
    {
      id: "cash_shortage",
      name: "现金紧缺",
      description: "现场报价提高，贷款处理费用增加。",
      effect: "onsite_bonus"
    },
    {
      id: "counterfeit_flood",
      name: "假货泛滥",
      description: "奢侈品价格波动加大，验证标签更重要。",
      effect: "luxury_volatility"
    },
    {
      id: "mystery_buyers",
      name: "神秘买家活跃",
      description: "买家初始信任提高，特殊物品更容易被询问。",
      effect: "buyer_trust"
    },
    {
      id: "logistics_break",
      name: "物流中断",
      description: "在线买家到达速度变慢，现场出售更重要。",
      effect: "slow_buyers"
    }
  ],
  newsTemplates: [
    {
      id: "luxury_up",
      title: "奢侈品需求上涨",
      label: "奢侈品升值",
      effect: "奢侈品在线成交价格提高 15%",
      detail: "收藏买家开始提高报价，但公开出售也可能引来调查。",
      category: "luxury",
      multiplier: 1.15,
      durationRange: [4, 7]
    },
    {
      id: "common_up",
      title: "普通旧货需求上升",
      label: "普通旧货升",
      effect: "普通物品在线成交价格提高 12%",
      detail: "二手市场和维修店最近开始集中收购普通物品。",
      category: "common",
      multiplier: 1.12,
      durationRange: [4, 7]
    },
    {
      id: "junk_down",
      title: "垃圾处理费用上涨",
      label: "垃圾处理贵",
      effect: "垃圾物品价格降低 20%",
      detail: "城市垃圾处理费用提高，普通买家拒绝接收低价值杂物。",
      category: "junk",
      multiplier: 0.8,
      durationRange: [4, 7]
    },
    {
      id: "strict_market",
      title: "平台开始集中审核",
      label: "平台严审",
      effect: "未验证标签的买家信任降低",
      detail: "虚假描述和来源不明物品正在被平台重点检查。",
      category: "all",
      multiplier: 1,
      durationRange: [4, 7]
    }
  ],
  threatTemplates: [
    {
      id: "debt_collector",
      title: "讨债人上门",
      presentation: "message",
      message: "一个没有报出姓名的人站在店门外，要求你立刻处理一笔私人欠款。",
      escalation: "对方开始拍门，并声称下一次不会只提醒。",
      target: "cash",
      amountRange: [450, 850],
      complyLabel: "支付现金",
      resistLabel: "拒绝开门"
    },
    {
      id: "cargo_grabber",
      title: "抢货者堵门",
      presentation: "alarm",
      message: "两名陌生人堵在仓库入口，点名要拿走你库存里最值钱的东西。",
      escalation: "对方开始搬动货架，库存可能被整批带走。",
      target: "item",
      amountRange: [0, 0],
      complyLabel: "交出物品",
      resistLabel: "强行阻拦"
    },
    {
      id: "fake_buyer",
      title: "冒充买家",
      presentation: "chat",
      message: "一个买家要求你立刻取消正在进行的挂单，否则会向平台举报虚假描述。",
      escalation: "对方已经向平台提交了投诉预览，挂单随时可能被冻结。",
      target: "listing",
      amountRange: [300, 600],
      complyLabel: "取消挂单",
      resistLabel: "坚持交易"
    },
    {
      id: "stalker",
      title: "跟踪者",
      presentation: "surveillance",
      message: "监控画面里有人反复经过店铺，对方知道你今天收了多少钱。",
      escalation: "对方发来一张店铺后门的照片。",
      target: "cash",
      amountRange: [350, 700],
      complyLabel: "支付封口费",
      resistLabel: "切断监控"
    },
    {
      id: "black_hand",
      title: "黑吃黑",
      presentation: "glitch",
      message: "一条加密消息要求你交出一件来源不明的物品，称它能让你免掉一次调查。",
      escalation: "对方远程锁住了店铺的挂单页面。",
      target: "item",
      amountRange: [0, 0],
      complyLabel: "交出物品",
      resistLabel: "留下证据反制"
    }
  ],
  endings: {
    debt_free: {
      type: "HE",
      title: "无债一身轻",
      subtitle: "全部贷款结清",
      text:
        "最后一张还款回执从打印机里滑出来。店铺还在，行李箱还会继续出现，但这一局你终于不再替债务工作。"
    },
    trouble_overload: {
      type: "BE",
      title: "麻烦吞没了店铺",
      subtitle: "麻烦值达到上限",
      text:
        "调查、威胁和报复在同一天找上门。店铺被迫停业，你留下的只有一堆无法解释的交易记录。"
    }
  },
  riskPhrases: [
    "我保证",
    "绝对真实",
    "肯定没问题",
    "不用检查",
    "来源百分百可靠",
    "百分百保证",
    "我编一个",
    "随便定的",
    "拍照反光"
  ],
  buyerProfiles: [
    {
      id: "paper_crane",
      displayId: "纸鹤-17",
      name: "纸鹤收藏",
      avatar: "crane",
      initialTrust: 58,
      style: "谨慎但讲道理",
      voice: "礼貌完整",
      preference: "来源、姓名、故事",
      verificationFocus: ["source", "name", "proof"],
      verificationRate: 0.22,
      deceptionReward: 3,
      questionLead: "请问，",
      questionSuffix: "",
      opening: "我看到了你上架的物品，想先确认几个细节。",
      resultFeedback: {
        accepted: "资料和故事能对上，我愿意收下。",
        rejected: "抱歉，关键信息对不上，我只能取消。"
      }
    },
    {
      id: "blue_ledger",
      displayId: "蓝账-204",
      name: "蓝账本",
      avatar: "ledger",
      initialTrust: 52,
      style: "精明，喜欢压价",
      voice: "短句数字导向",
      preference: "价格、利润、手续费",
      verificationFocus: ["price", "record"],
      verificationRate: 0.12,
      deceptionReward: 2,
      questionLead: "",
      questionSuffix: "",
      opening: "报价我看到了，不过还有几件事需要你说明。",
      resultFeedback: {
        accepted: "数字没问题，成交。",
        rejected: "账算不平，交易取消。"
      }
    },
    {
      id: "old_fox",
      displayId: "狐狸-08",
      name: "旧货狐狸",
      avatar: "fox",
      initialTrust: 62,
      style: "爽快，讨厌废话",
      voice: "口语直接",
      preference: "快速成交、低价",
      verificationFocus: ["urgency", "packaging", "price"],
      verificationRate: 0.1,
      deceptionReward: 4,
      questionLead: "",
      questionSuffix: " 直接说。",
      opening: "东西看着还行，回答清楚我就下单。",
      resultFeedback: {
        accepted: "成，痛快。",
        rejected: "不痛快，我不要了。"
      }
    },
    {
      id: "seven_warehouse",
      displayId: "七号仓-13",
      name: "七号仓库",
      avatar: "seven",
      initialTrust: 45,
      style: "神秘，问题很多",
      voice: "冷静技术化",
      preference: "编号、批次、严格核验",
      verificationFocus: ["code", "record", "proof", "packaging"],
      verificationRate: 0.32,
      deceptionReward: 2,
      questionLead: "核验项：",
      questionSuffix: " 请给出可查证信息。",
      opening: "我对这件物品有兴趣，但来源和记录要核对。",
      resultFeedback: {
        accepted: "核验结束，批准交易。",
        rejected: "核验失败，交易中止。"
      }
    },
    {
      id: "velvet_broker",
      displayId: "绒布-31",
      name: "绒布经纪人",
      avatar: "velvet",
      initialTrust: 55,
      style: "价格导向，讨厌含糊回答",
      voice: "商业客套",
      preference: "压价、批量交易",
      verificationFocus: ["price", "source", "feature"],
      verificationRate: 0.18,
      deceptionReward: 3,
      questionLead: "在继续之前，",
      questionSuffix: "",
      opening: "价格可以谈，前提是物品信息足够准确。",
      resultFeedback: {
        accepted: "这笔可以入账。",
        rejected: "口径不一致，无法继续。"
      }
    },
    {
      id: "midnight_radio",
      displayId: "午夜-77",
      name: "午夜电台",
      avatar: "radio",
      initialTrust: 60,
      style: "喜欢物品故事，也容易怀疑来源",
      voice: "叙述化情绪强",
      preference: "旧物故事、来源真实性",
      verificationFocus: ["source", "story", "name"],
      verificationRate: 0.24,
      deceptionReward: 3,
      questionLead: "我想先听听你的说法。",
      questionSuffix: " 最好是能查证的部分。",
      opening: "我想听听这件东西的来历，最好是能查证的部分。",
      resultFeedback: {
        accepted: "故事有出处，成交。",
        rejected: "叙述里缺了关键证据，这次到此为止。"
      }
    }
  ],
  buyerQuestionTemplates: {
    code: {
      text: "你能确认这件物品的编号吗？",
      optionCount: 3
    },
    name: {
      text: "物品上磨损的姓名是什么？",
      optionCount: 3
    },
    source: {
      text: "你能确认这件物品的来源吗？",
      optionCount: 3
    },
    feature: {
      text: "物品上的特殊标记或特征是什么？",
      optionCount: 3
    },
    record: {
      text: "这件物品有过公开交易记录吗？",
      optionCount: 2
    },
    condition: {
      text: "物品目前还能正常使用吗？",
      optionCount: 2
    },
    packaging: {
      text: "原来的包装或托运标签还在吗？",
      optionCount: 2
    },
    owner: {
      text: "上一任主人的身份是否明确？",
      optionCount: 2
    },
    urgency: {
      text: "你目前的出售时间安排是什么？",
      optionCount: 2
    },
    proof: {
      text: "你有可以证明来源的资料吗？",
      optionCount: 3
    },
    price: {
      text: "这个价格还有商量的余地吗？",
      optionCount: 3
    },
    story: {
      text: "这件东西有值得说明的来历吗？",
      optionCount: 3
    }
  },
  buyerQuestionPool: [
    {
      id: "number",
      kind: "code",
      text: "你能确认这件物品的编号吗？",
      replies: [
        { id: "confirm", text: "我在万物通查到了编号 {code} 的公开记录。", trust: 25 },
        { id: "uncertain", text: "编号已经磨损，我没有查过。", trust: -15 },
        { id: "cancel", text: "编号可能是假的。", trust: -25 }
      ]
    },
    {
      id: "proof",
      kind: "source",
      text: "你能确认这件物品的来源吗？",
      replies: [
        { id: "record", text: "有，万物通里能找到对应来源信息。", trust: 25 },
        { id: "memory", text: "只有口头记忆，没有资料。", trust: -10 },
        { id: "unknown", text: "来源无法确认，我可以如实说明。", trust: 5 }
      ]
    },
    {
      id: "reason",
      text: "你为什么现在急着出售？",
      replies: [
        { id: "cash", text: "我需要现金，但物品来源没有问题。", trust: 15 },
        { id: "cleanup", text: "这是别人留下的东西，我只是清理库存。", trust: 5 },
        { id: "rush", text: "别问这么多，买不买？", trust: -25, risk: "vague" }
      ]
    },
    {
      id: "condition",
      text: "物品背面有一道划痕，你之前检查过吗？",
      replies: [
        { id: "checked", text: "检查过，不影响主要功能。", trust: 20 },
        { id: "new", text: "我拿到时就是这样。", trust: 5 },
        { id: "hide", text: "那只是拍照反光。", trust: -20, risk: "deceptive" }
      ]
    },
    {
      id: "previous_owner",
      kind: "source",
      text: "你知道上一任主人是谁吗？",
      replies: [
        { id: "unknown", text: "不知道，只知道箱子来源。", trust: 10 },
        { id: "guess", text: "我猜是收藏家。", trust: -5, risk: "vague" },
        {
          id: "refuse",
          text: "这和交易没有关系。",
          trust: -15,
          risk: "vague"
        }
      ]
    },
    {
      id: "authenticity",
      kind: "proof",
      text: "你能保证它不是仿制品吗？",
      replies: [
        { id: "evidence", text: "我可以提供搜索到的依据。", trust: 25 },
        {
          id: "promise",
          text: "我保证是真的。",
          trust: -5,
          risk: "deceptive"
        },
        { id: "uncertain", text: "不能百分百保证，但风险我会说明。", trust: 10 }
      ]
    },
    {
      id: "storage",
      text: "你保存了多久？有没有受潮？",
      replies: [
        { id: "dry", text: "一直放在干燥处，没有受潮。", trust: 20 },
        { id: "short", text: "刚拿到不久，还没仔细检查。", trust: 5 },
        { id: "unknown", text: "不清楚，箱子原本就是封着的。", trust: -5 }
      ]
    },
    {
      id: "final_price",
      kind: "price",
      text: "这个价格还有商量的余地吗？",
      replies: [
        { id: "firm", text: "价格已经考虑过风险，暂时不降。", trust: 10 },
        { id: "small", text: "可以小幅调整，但不能太多。", trust: 20 },
        { id: "free", text: "你想给多少都行。", trust: -15 }
      ]
    },
    {
      id: "packaging",
      kind: "generic",
      text: "原来的包装和托运标签还在吗？",
      replies: [
        { id: "kept", text: "还在，我会和物品一起提供。", trust: 15 },
        { id: "partial", text: "只剩一部分包装。", trust: 5 },
        { id: "lost", text: "都已经扔掉了。", trust: -8 }
      ]
    },
    {
      id: "history",
      kind: "code",
      text: "这件物品的编号有过公开交易记录吗？",
      replies: [
        { id: "found", text: "有，万物通里能找到相关记录。", trust: 25 },
        { id: "none", text: "没有查到记录。", trust: -5 },
        { id: "unchecked", text: "我没搜索过。", trust: -15 }
      ]
    },
    {
      id: "story",
      kind: "generic",
      text: "这件东西有什么特别的故事吗？",
      replies: [
        { id: "real", text: "有一份旧资料能说明它的来历。", trust: 15 },
        { id: "simple", text: "没有故事，就是普通失物。", trust: 5 },
        {
          id: "fake",
          text: "我编一个你爱听的故事。",
          trust: -20,
          risk: "deceptive"
        }
      ]
    },
    {
      id: "current_listing",
      kind: "price",
      text: "我见过类似的物品，你的价格为什么更高？",
      replies: [
        { id: "details", text: "因为来源和状态都更清楚。", trust: 18 },
        { id: "market", text: "我参考了近期市场报价。", trust: 20 },
        {
          id: "random",
          text: "价格是我随便定的。",
          trust: -20,
          risk: "deceptive"
        }
      ]
    }
  ]
};

export const DESTINATION_LABEL_STATES = [
  {
    id: "CLEAR",
    name: "标签清晰",
    short: "完整",
    weight: 60
  },
  {
    id: "PARTIAL",
    name: "标签部分损坏",
    short: "残缺",
    weight: 25
  },
  {
    id: "MISSING",
    name: "标签完全缺失",
    short: "无法辨认",
    weight: 15
  }
];

export const DESTINATIONS = [
  {
    id: "tokyo",
    name: "东京",
    short: "TYO",
    themeWeights: {
      influencer: 50,
      honeymoon: 25,
      doctor: 10,
      retired_rich: 15
    }
  },
  {
    id: "paris",
    name: "巴黎",
    short: "PAR",
    themeWeights: {
      honeymoon: 50,
      retired_rich: 25,
      influencer: 20,
      doctor: 5
    }
  },
  {
    id: "cairo",
    name: "开罗",
    short: "CAI",
    themeWeights: {
      honeymoon: 45,
      retired_rich: 20,
      doctor: 18,
      influencer: 17
    }
  },
  {
    id: "zurich",
    name: "苏黎世",
    short: "ZRH",
    themeWeights: {
      doctor: 45,
      retired_rich: 35,
      honeymoon: 10,
      influencer: 10
    }
  },
  {
    id: "remote",
    name: "偏远地区",
    short: "???",
    themeWeights: {
      influencer: 35,
      honeymoon: 30,
      retired_rich: 20,
      doctor: 15
    }
  }
];

export const APPEARANCES = [
  {
    id: "INTACT",
    name: "完整",
    short: "外观完整",
    description: "箱面平整，锁扣还能正常工作。通常更贵，但未必更值。",
    priceMultiplier: 1.28,
    categoryBias: {
      junk: 0.65,
      common: 1.1,
      luxury: 1.35,
      special: 0.7
    }
  },
  {
    id: "WORN",
    name: "磨损",
    short: "明显磨损",
    description: "边角掉色，轮子发涩。像是陪主人走过不少地方。",
    priceMultiplier: 1,
    categoryBias: {
      junk: 1,
      common: 1.15,
      luxury: 1,
      special: 0.9
    }
  },
  {
    id: "TORN",
    name: "撕裂",
    short: "箱体撕裂",
    description: "侧边裂开一道口子，里层也许被翻过，也许还藏着夹层。",
    priceMultiplier: 0.86,
    categoryBias: {
      junk: 1.3,
      common: 0.95,
      luxury: 0.85,
      special: 1.25
    }
  },
  {
    id: "BROKEN_LOCK",
    name: "锁具损坏",
    short: "锁扣损坏",
    description: "锁扣被人撬过，里面的东西可能被动过手脚。",
    priceMultiplier: 0.92,
    categoryBias: {
      junk: 1.15,
      common: 1,
      luxury: 1.05,
      special: 1.45
    }
  },
  {
    id: "SMELLY",
    name: "明显异味",
    short: "散发异味",
    description: "一股温热、陈旧又说不上来的味道。最好别凑太近。",
    priceMultiplier: 0.72,
    categoryBias: {
      junk: 1.7,
      common: 0.75,
      luxury: 0.55,
      special: 1.55
    }
  }
];

export const CATEGORY_INFO = {
  junk: {
    name: "垃圾",
    short: "垃圾",
    accent: "junk"
  },
  common: {
    name: "普通物品",
    short: "普通",
    accent: "common"
  },
  luxury: {
    name: "奢侈品",
    short: "奢侈",
    accent: "luxury"
  },
  special: {
    name: "特殊物品",
    short: "特殊",
    accent: "special"
  }
};

export const COMPETITOR_TEMPLATES = [
  {
    id: "zhou",
    name: "铁皮箱老周",
    role: "保守型",
    accent: "blue",
    aggression: 0.48,
    budgetMultiplier: [1.35, 2.15]
  },
  {
    id: "lina",
    name: "一锤定音莉娜",
    role: "冲动型",
    accent: "red",
    aggression: 0.76,
    budgetMultiplier: [1.7, 2.8]
  },
  {
    id: "mimi",
    name: "不眨眼咪咪",
    role: "收藏型",
    accent: "purple",
    aggression: 0.62,
    budgetMultiplier: [1.55, 3.1]
  },
  {
    id: "hu",
    name: "旧货胡叔",
    role: "低价型",
    accent: "green",
    aggression: 0.4,
    budgetMultiplier: [1.2, 2]
  },
  {
    id: "seven",
    name: "七号买家",
    role: "神秘型",
    accent: "yellow",
    aggression: 0.68,
    budgetMultiplier: [1.6, 3.4]
  }
];

export const OWNER_THEMES = [
  {
    id: "honeymoon",
    name: "蜜月旅客",
    subtitle: "照片很多，纪念品更多",
    accent: "rose",
    itemIds: [
      "instant_camera",
      "wedding_rings",
      "love_letter",
      "postcards",
      "bridal_jewelry"
    ]
  },
  {
    id: "influencer",
    name: "失意网红",
    subtitle: "镜头比人先到现场",
    accent: "cyan",
    itemIds: [
      "ring_light",
      "portable_camera",
      "designer_bag",
      "endorsement_contract",
      "backup_phone"
    ]
  },
  {
    id: "doctor",
    name: "沉默医生",
    subtitle: "每样东西都像病历附件",
    accent: "blue",
    itemIds: [
      "old_stethoscope",
      "anonymous_records",
      "medicine_case",
      "old_scissors",
      "clinic_sign"
    ]
  },
  {
    id: "retired_rich",
    name: "退休富豪",
    subtitle: "低调到只剩值钱的东西",
    accent: "yellow",
    itemIds: [
      "gold_watch",
      "antique_tea_set",
      "stock_documents",
      "old_will",
      "small_painting"
    ]
  }
];

export const ITEM_TEMPLATES = [
  {
    id: "instant_camera",
    name: "旧拍立得",
    category: "common",
    baseValue: 380,
    ownerTheme: "honeymoon",
    description: "还剩两张相纸。取景框里贴着两颗画歪的心。"
  },
  {
    id: "wedding_rings",
    name: "一对对戒",
    category: "luxury",
    baseValue: 1650,
    ownerTheme: "honeymoon",
    description: "内圈刻着日期，却没有姓名。"
  },
  {
    id: "love_letter",
    name: "未寄出的情书",
    category: "common",
    baseValue: 120,
    ownerTheme: "honeymoon",
    description: "写到第三页时突然停笔，纸上留下一个压扁的咖啡印。"
  },
  {
    id: "postcards",
    name: "一叠纪念明信片",
    category: "junk",
    baseValue: 28,
    ownerTheme: "honeymoon",
    description: "每张都写了同一句话：这里的风真大。"
  },
  {
    id: "bridal_jewelry",
    name: "新娘首饰盒",
    category: "luxury",
    baseValue: 1180,
    ownerTheme: "honeymoon",
    description: "盒子是空的，但夹层里卡着一只珍珠耳环。"
  },
  {
    id: "ring_light",
    name: "环形补光灯",
    category: "common",
    baseValue: 240,
    ownerTheme: "influencer",
    description: "灯圈上贴着一张写着“今晚必火”的便利贴。"
  },
  {
    id: "portable_camera",
    name: "便携相机",
    category: "common",
    baseValue: 520,
    ownerTheme: "influencer",
    description: "存储卡还在，最后一支视频只拍到了机场天花板。"
  },
  {
    id: "designer_bag",
    name: "名牌包",
    category: "luxury",
    baseValue: 1680,
    ownerTheme: "influencer",
    description: "外观保养得很好，内衬却有一块洗不掉的蓝色墨迹。"
  },
  {
    id: "endorsement_contract",
    name: "被取消的代言合同",
    category: "common",
    baseValue: 300,
    ownerTheme: "influencer",
    description: "签字页完好，最后一页盖着醒目的作废章。"
  },
  {
    id: "backup_phone",
    name: "备用手机",
    category: "common",
    baseValue: 760,
    ownerTheme: "influencer",
    description: "没有密码，桌面上只有一个未命名的录音应用。"
  },
  {
    id: "old_stethoscope",
    name: "旧听诊器",
    category: "common",
    baseValue: 190,
    ownerTheme: "doctor",
    description: "耳塞已经发硬，金属部分仍擦得很亮。"
  },
  {
    id: "anonymous_records",
    name: "匿名病历",
    category: "common",
    baseValue: 280,
    ownerTheme: "doctor",
    description: "姓名被仔细剪掉，只留下几行反复出现的日期。"
  },
  {
    id: "medicine_case",
    name: "无标签药盒",
    category: "junk",
    baseValue: 36,
    ownerTheme: "doctor",
    description: "药片按颜色分类，每一格都贴着不同城市的缩写。"
  },
  {
    id: "old_scissors",
    name: "旧手术剪",
    category: "common",
    baseValue: 160,
    ownerTheme: "doctor",
    description: "刃口没有锈，手柄上却缠着一圈老旧的胶布。"
  },
  {
    id: "clinic_sign",
    name: "私人诊所铭牌",
    category: "luxury",
    baseValue: 920,
    ownerTheme: "doctor",
    description: "铜制铭牌很沉，边角留着被强行撬下的划痕。"
  },
  {
    id: "gold_watch",
    name: "金表",
    category: "luxury",
    baseValue: 2350,
    ownerTheme: "retired_rich",
    description: "表盘背面刻着不属于卖家名字的首字母。"
  },
  {
    id: "antique_tea_set",
    name: "古董茶具",
    category: "luxury",
    baseValue: 1280,
    ownerTheme: "retired_rich",
    description: "六只茶杯里只有一只重新沾过水。"
  },
  {
    id: "stock_documents",
    name: "股票文件",
    category: "common",
    baseValue: 430,
    ownerTheme: "retired_rich",
    description: "大部分已经失效，最下面夹着一张最近的转账凭条。"
  },
  {
    id: "old_will",
    name: "反复修改的遗嘱",
    category: "common",
    baseValue: 330,
    ownerTheme: "retired_rich",
    description: "同一个继承人名字被写了三次，又被划掉三次。"
  },
  {
    id: "small_painting",
    name: "小型收藏画",
    category: "luxury",
    baseValue: 1780,
    ownerTheme: "retired_rich",
    description: "画框背面写着“别让第二个人看见”。"
  }
];
