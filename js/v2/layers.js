// 2.0 界面层清单。
// 坐标全部来自 PSD（2400 x 1350），渲染时统一除以 PSD_SCALE 得到逻辑坐标。
// 替换美术只需覆盖 美术/2.0/<目录>/<图层名>.png，不需要改这里的位置。

export const PSD_SCALE = 2;
export const CANVAS = { width: 2400, height: 1350 };
export const LOGICAL = {
  width: CANVAS.width / PSD_SCALE,
  height: CANVAS.height / PSD_SCALE
};

export const ART_ROOT = "./美术/2.0/";

const box = (x, y, w, h) => ({ x, y, w, h });
const layer = (name, shape, color, extra = {}) => ({ name, box: shape, color, ...extra });

// 六位买家的半身立绘，各自一张图，按当前买家显示。
export const BUYER_PORTRAIT_LAYERS = {
  paper_crane: "买家_纸鹤收藏",
  blue_ledger: "买家_蓝账本",
  velvet_broker: "买家_绒布经纪人",
  old_fox: "买家_旧货狐狸",
  seven_warehouse: "买家_七号仓库",
  midnight_radio: "买家_午夜电台"
};

function buyerPortraitLayers() {
  return [
    layer("买家_纸鹤收藏", box(1146, 215, 621, 1073), null, {
      role: "buyerPortrait", hidden: true
    }),
    layer("买家_蓝账本", box(1132, 218, 716, 1132), null, {
      role: "buyerPortrait", hidden: true
    }),
    layer("买家_绒布经纪人", box(1060, 203, 841, 1147), null, {
      role: "buyerPortrait", hidden: true
    }),
    layer("买家_旧货狐狸", box(1080, 217, 672, 1133), null, {
      role: "buyerPortrait", hidden: true
    }),
    layer("买家_七号仓库", box(1095, 218, 753, 1132), null, {
      role: "buyerPortrait", hidden: true
    }),
    layer("买家_午夜电台", box(1170, 202, 602, 1132), null, {
      role: "buyerPortrait", hidden: true
    })
  ];
}

// 常驻状态栏与日历缩略，三个界面共用同一坐标和资源。
function statusLayers() {
  return [
    layer("日历", box(44, 11, 309, 207), null, {
      art: "common", bind: "calendar", role: "calendar"
    }),
    layer("日历_天数", box(59, 58, 278, 62), null, {
      artless: true, bind: "calendarDay", role: "status", follow: "日历"
    }),
    layer("日历_趋势", box(59, 124, 278, 62), null, {
      artless: true, bind: "calendarTrend", role: "status", follow: "日历"
    }),
    layer("余额", box(371, 11, 349, 100), null, {
      art: "common", bind: "cash", role: "status", follow: "日历"
    }),
    layer("麻烦值", box(747, 11, 349, 100), null, {
      art: "common", bind: "trouble", role: "status", follow: "日历"
    }),
    layer("信誉值", box(1128, 11, 349, 100), null, {
      art: "common", bind: "reputation", role: "status", follow: "日历"
    })
  ];
}

// 店铺内的子视图层。默认隐藏，按当前操作切换。
function shopOverlays() {
  return [
    layer("物品详情窗口", box(525, 11, 1341, 1318), null, {
      role: "sheet", hidden: true, panel: "itemDetail"
    }),
    // 物品信息窗沿用详情窗底板，尺寸与详情窗一致。
    layer("物品信息窗口", box(525, 11, 1341, 1318), null, {
      artName: "物品详情窗口", role: "sheet", hidden: true, panel: "inspectionRecord"
    }),
    layer("出售页面", box(777, 190, 793, 970), null, {
      role: "sheet", hidden: true, panel: "listing"
    }),
    layer("商城页面", box(546, 129, 1308, 982), null, {
      role: "sheet", hidden: true, panel: "mall"
    }),
    // 商城界面顶部那条索引栏，点一下切到万物通检索页。
    layer("商城索引栏", box(552, 250, 738, 102), null, {
      artless: true, role: "mallSearch", hidden: true
    }),
    layer("万物通页面", box(546, 129, 1308, 982), null, {
      role: "sheet", hidden: true, panel: "universal"
    }),
    // 搜索框压在万物通页面上，当前词条写在框里。
    layer("搜索_搜索框", box(821, 660, 758, 90), null, {
      hidden: true, panel: "universalSearch"
    }),
    // 搜索窗口顶部那条索引栏，点一下切回购买窗口。
    layer("万物通索引栏", box(903, 253, 352, 47), null, {
      artless: true, role: "univIndex", hidden: true
    }),
    // 记事本三个书签压在书底下面，只露出书页外的部分；点亮哪个就翻到哪一页。
    // 美术文件里「选中」态单独出图，文件名没有统一的分隔符，这里用 artName 指过去。
    layer("书签_买家故事_收起", box(1682, 362, 101, 136), null, {
      artName: "书签_买家故事未选", role: "nbTab", tab: "story", hidden: true
    }),
    layer("书签_买家故事_选中", box(1715, 362, 101, 136), null, {
      artName: "书签_买家故事", role: "nbTab", tab: "story", hidden: true
    }),
    layer("书签_图鉴_收起", box(1682, 545, 101, 141), null, {
      artName: "书签_图鉴", role: "nbTab", tab: "book", hidden: true
    }),
    layer("书签_图鉴_选中", box(1713, 545, 102, 141), null, {
      artName: "书签_图鉴选中", role: "nbTab", tab: "book", hidden: true
    }),
    layer("书签_店铺升级_收起", box(1682, 730, 101, 139), null, {
      artName: "书签_店铺升级", role: "nbTab", tab: "upgrade", hidden: true
    }),
    layer("书签_店铺升级_选中", box(1713, 731, 102, 140), null, {
      artName: "书签_升级选中", role: "nbTab", tab: "upgrade", hidden: true
    }),
    // 书底先画，左右两页盖在上面，内容分别写进两页。
    layer("记事本页面", box(681, 293, 1071, 817), null, { hidden: true }),
    layer("记事本_左页", box(711, 319, 483, 757), null, {
      hidden: true, panel: "notebookLeft"
    }),
    layer("记事本_右页", box(1205, 321, 510, 755), null, {
      hidden: true, panel: "notebookRight"
    }),
    // 三角标翻到下一位买家，只有买家故事页会亮。
    layer("记事本_三角标", box(1613, 965, 74, 81), null, {
      role: "nbNextBuyer", hidden: true
    }),
    // 关闭键单独一层，压在书页上方，位置沿用原来的窗口关闭键。
    layer("记事本_关闭", box(1672, 309, 64, 64), null, {
      artless: true, role: "sheet", hidden: true
    }),
    // 日历展开 PSD 没给底图，按规则先用通用UI按键的九宫格边框（CSS 里做）。
    layer("日历展开", box(560, 220, 1280, 910), null, {
      artless: true, role: "sheet", hidden: true, panel: "calendar"
    }),
    layer("检视台弹层", box(238, 145, 1925, 1061), null, {
      role: "sheet", hidden: true, panel: "inspect"
    }),
    layer("物品视图", box(348, 265, 721, 828), null, {
      role: "inspectView", hidden: true, panel: "inspectItem"
    }),
    // 操作区不再用深蓝底板，文字直接写在检视台的浅色台面上。
    layer("操作区", box(1312, 252, 745, 860), null, {
      artless: true,
      role: "inspectOps", hidden: true, panel: "inspectOps"
    }),
    layer("工具带", box(1109, 254, 166, 900), null, {
      artless: true,
      role: "inspectBelt", hidden: true, panel: "toolBelt"
    }),
    layer("工具_清洁", box(1109, 254, 166, 153), null, {
      hidden: true, tool: "clean", role: "tool", label: "清洁刷"
    }),
    layer("工具_电路", box(1109, 432, 166, 153), null, {
      hidden: true, tool: "circuit", role: "tool", label: "电路修复"
    }),
    layer("工具_放大镜", box(1109, 602, 166, 154), null, {
      hidden: true, tool: "magnifier", role: "tool", label: "放大镜"
    }),
    layer("工具_伪造", box(1109, 772, 166, 157), null, {
      hidden: true, tool: "forge", role: "tool", label: "伪造处理"
    }),
    layer("工具_完成", box(1109, 944, 166, 159), null, {
      hidden: true, tool: "done", role: "tool", label: "完成检视"
    }),
    layer("收纳盒窗口", box(718, 101, 964, 1159), null, {
      role: "sheet", hidden: true, panel: "keepsake"
    }),
    // 收纳盒确认框 PSD 也没有，先用通用UI按键边框顶上。
    layer("收纳盒确认", box(760, 470, 880, 300), null, {
      artless: true, role: "sheet", hidden: true, panel: "keepsakeAsk"
    })
  ];
}

export const TOOL_LAYERS = [
  "工具_清洁",
  "工具_电路",
  "工具_放大镜",
  "工具_伪造",
  "工具_完成"
];

export const SCENES = {
  // ---------- 游戏开始界面 ----------
  start: {
    title: "开始游戏",
    layers: [
      layer("背景", box(0, 0, 2400, 1350), "#2A1712"),
      layer("标题", box(96, 54, 1458, 436), null),
      layer("开始游戏按键", box(930, 434, 518, 199), null, { role: "startNew" }),
      layer("载入游戏按键", box(930, 717, 518, 199), null, { role: "startLoad" })
    ]
  },

  // ---------- 拍卖界面 ----------
  auction: {
    title: "拍卖行",
    layers: [
      layer("背景", box(0, 0, 2400, 1350), "#2A1712"),
      layer("拍卖场", box(0, 0, 2400, 1350), null),
      layer("拍卖台", box(580, 616, 436, 381), null),
      layer("当前箱子", box(606, 430, 386, 194), null, { role: "lot", bind: "lot" }),
      ...statusLayers(),
      layer("箱子信息面板", box(1352, 281, 619, 622), null, { panel: "lotInfo" }),
      layer("出价信息栏", box(183, 281, 338, 321), null),
      layer("买家一出价", box(183, 281, 338, 100), null, {
        artless: true, bind: "bidOne", role: "status", follow: "出价信息栏"
      }),
      layer("买家二出价", box(183, 394, 338, 100), null, {
        artless: true, bind: "bidTwo", role: "status", follow: "出价信息栏"
      }),
      layer("玩家出价", box(183, 501, 338, 101), null, {
        artless: true, bind: "bidPlayer", role: "status", follow: "出价信息栏"
      }),
      // 出价信息栏里的三位出价者（两位竞争对手 + 玩家）作为教学高亮的目标组。
      // PSD 没给这一组的独立美术，这里用一层空框套住出价信息栏。
      layer("竞争对手组", box(183, 281, 338, 321), null, {
        artless: true, role: "competitors"
      }),
      layer("加价", box(1277, 1028, 394, 151), null, { role: "bid", label: "加价" }),
      layer("放弃", box(1671, 1028, 378, 151), null, { role: "pass", label: "放弃" }),
      layer("成交印章", box(1003, 470, 394, 151), null, {
        role: "stamp", hidden: true, label: "成交"
      }),
      layer("今日结束牌", box(1003, 500, 394, 151), null, {
        role: "endPlate", hidden: true, label: "今日拍卖已结束\n返回店铺"
      }),
      layer("黑匣广告海报", box(856, 159, 689, 919), null, {
        role: "loanPoster", hidden: true, panel: "loan"
      }),
      // 海报本身是纯美术，贷款按钮单独排在海报下沿。
      layer("借款操作栏", box(848, 1088, 690, 100), null, {
        artless: true, role: "loanActions", hidden: true, panel: "loanActions"
      }),
      layer("小黑", box(206, 645, 552, 464), null, { role: "mascot", hidden: true })
    ]
  },

  // ---------- 拍卖后处置界面（未拆封） ----------
  disposal: {
    title: "处置台",
    layers: [
      layer("背景", box(0, 0, 2400, 1350), "#2E3236"),
      layer("箱子", box(266, 431, 934, 688), null, { role: "lot", bind: "lot" }),
      ...statusLayers(),
      layer("原封转卖", box(1416, 278, 816, 296), null, {
        role: "route", route: "resale", panel: "route"
      }),
      layer("现场开箱", box(1411, 579, 821, 304), null, {
        role: "route", route: "onsite", panel: "route"
      }),
      layer("带回家", box(1416, 898, 807, 301), null, {
        role: "route", route: "home", panel: "route"
      }),
      layer("小黑", box(206, 645, 552, 464), null, { role: "mascot", hidden: true }),
      layer("货架容量不足", box(1003, 560, 394, 151), null, {
        role: "notice", hidden: true, label: "货架容量不足"
      })
    ]
  },

  // ---------- 拍卖后处置界面（选择现场开箱后） ----------
  disposal_open: {
    title: "现场开箱",
    layers: [
      layer("背景", box(0, 0, 2400, 1350), "#2E3236"),
      layer("箱子", box(267, 428, 905, 683), null, {
        role: "lot", opened: true, bind: "lot", panel: "onsiteBox"
      }),
      ...statusLayers(),
      layer("预览面板", box(1423, 231, 793, 912), null, { panel: "onsite" }),
      layer("全部卖给现场", box(1471, 959, 352, 127), null, {
        role: "onsiteSell", label: "全部卖给现场"
      }),
      layer("全部带回家", box(1825, 961, 337, 127), null, {
        role: "onsiteHome", label: "全部带回家"
      }),
      layer("小黑", box(206, 645, 552, 464), null, { role: "mascot", hidden: true })
    ]
  },

  // ---------- 店铺界面（第一部分只做场景骨架） ----------
  shop: {
    title: "我的店铺",
    layers: [
      layer("背景", box(0, 0, 2400, 1350), "#20262C"),
      layer("店铺背景", box(0, 0, 2400, 1348), null),
      layer("货架", box(0, 166, 569, 1184), null),
      layer("货架_计数", box(71, 850, 435, 29), null, {
        artless: true, bind: "shelfCount", role: "status", follow: "货架"
      }),
      // 货架格口跟着货架图层走，窗口比例变化时不会和货架错位。
      layer("货架上层物品格", box(71, 254, 435, 582), null, {
        artless: true, grid: "items", panel: "shelfItems", follow: "货架"
      }),
      layer("货架下层箱子区", box(71, 880, 435, 417), null, {
        artless: true, grid: "boxes", panel: "shelfBoxes", follow: "货架"
      }),
      layer("橱窗", box(569, 101, 669, 772), null, { role: "window", panel: "window" }),
      ...buyerPortraitLayers(),
      layer("桌面", box(467, 1026, 1933, 324), null, { panel: "desk" }),
      layer("电脑", box(1753, 572, 433, 513), null, { role: "computer" }),
      layer("记事本", box(1983, 1091, 389, 157), null, { role: "notebook" }),
      layer("收纳盒", box(642, 962, 288, 199), null, { role: "keepsake" }),
      layer("拍卖锤", box(893, 966, 287, 322), null, { role: "hammer", label: "前往拍卖场" }),
      layer("营业牌", box(1855, 3, 481, 195), null, { role: "closeDay", label: "营业中" }),
      // 买家对话放在弹层之前，弹层打开时盖住对话。
      layer("买家对话气泡", box(1331, 34, 954, 324), "#E9E9E9", {
        artless: true, hidden: true, panel: "buyerSpeech"
      }),
      // 选项本身用木牌美术做底，不要额外的纯色占位底。
      layer("玩家选项一", box(1903, 288, 381, 100), null, {
        artless: true, hidden: true, role: "reply", label: "选项一"
      }),
      layer("玩家选项二", box(1903, 409, 381, 100), null, {
        artless: true, hidden: true, role: "reply", label: "选项二"
      }),
      layer("玩家选项三", box(1903, 530, 381, 99), null, {
        artless: true, hidden: true, role: "reply", label: "选项三"
      }),
      // 常驻状态栏放在弹层之前，弹层打开时盖住它。
      ...statusLayers(),
      ...shopOverlays()
    ]
  }
};

export function artPath(sceneName, layerData) {
  const dir = layerData.art || sceneName;
  // artName 用于复用别的窗口底图（例如物品信息窗沿用物品详情窗的底板）。
  return `${ART_ROOT}${dir}/${layerData.artName || layerData.name}.png`;
}

// 画面外的留白用当前场景的底色填充，避免出现黑边。
export const SCENE_BACKDROP = {
  start: "#2A1712",
  auction: "#2A1712",
  disposal: "#203b4a",
  disposal_open: "#203b4a",
  shop: "#203b4a"
};
