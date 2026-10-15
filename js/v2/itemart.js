// 物品美术：线索物品和非线索物品分成两个文件夹，按物品名称找图。
// 图放在 美术/物品2.0/<分类>/<物品名>.png，替换美术时覆盖同名文件即可。

export const ITEM_ART_ROOT = "./美术/物品2.0/";

// 少数物品的美术文件名和游戏里的名称不一致，在这里做映射。
const NAME_ALIAS = {
  匿名病历: "匿名病例",
  // 美术文件名写成「旧帐本」，游戏里按文档叫「旧账本」。
  旧账本: "旧帐本"
};

// 线索物品文件夹里目前有的图（有对应图才去线索目录找，避免多余的 404）。
const CLUE_ART_NAMES = new Set([
  "超期寄存箱",
  "当票存根",
  "电台工牌",
  "旧录音带",
  "旧行李箱",
  "旧帐本",
  "旧值班表",
  "毛线记账本",
  "拍卖行成交单",
  "十二件套银餐具",
  "手写节目单",
  "手写入库单",
  "手写转账单",
  "手织毛衣",
  "未寄出的报警回执",
  "未寄出的邮寄单",
  "无名感谢信",
  "修复店工单"
]);

export function itemArtName(item) {
  if (!item) {
    return null;
  }
  const name = item.name || item.label || "";
  return NAME_ALIAS[name] || name;
}

// 线索物品优先用线索图，其余用普通物品图；最后退回 1.0 的按 ID 图。
export function itemArtPaths(item) {
  const name = itemArtName(item);
  if (!name) {
    return [];
  }
  const paths = [];
  if (CLUE_ART_NAMES.has(name)) {
    paths.push(`${ITEM_ART_ROOT}线索物品/${encodeURIComponent(name)}.png`);
  }
  paths.push(`${ITEM_ART_ROOT}非线索物品/${encodeURIComponent(name)}.png`);
  if (item.templateId) {
    paths.push(`./美术/物品/by-id/${encodeURIComponent(item.templateId)}.png`);
  }
  return paths;
}

// 用途：图片元素，加载失败自动退回下一张。
export function itemArtHtml(item, className = "item-art-img") {
  const paths = itemArtPaths(item);
  if (!paths.length) {
    return "";
  }
  const rest = paths.slice(1);
  return `<img class="${className}" src="${paths[0]}" alt="" draggable="false"${
    rest.length ? ` data-fallback="${rest.join("|")}"` : ""
  } onerror="if(this.dataset.fallback){const list=this.dataset.fallback.split('|');this.src=list.shift();this.dataset.fallback=list.join('|');}else{this.remove();}" />`;
}

// 用途：背景图，多张按顺序叠加，前面加载失败会露出后面的。
export function itemArtBackground(item) {
  return itemArtPaths(item)
    .map((path) => `url('${path}')`)
    .join(", ");
}
