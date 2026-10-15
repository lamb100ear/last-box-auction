// 场景渲染：按层清单生成 DOM，一层对应一个元素和一个资源文件。

import {
  BUYER_PORTRAIT_LAYERS,
  LOGICAL,
  PSD_SCALE,
  SCENES,
  TOOL_LAYERS,
  artPath
} from "./layers.js";
import { capacityOf, hasCheckpoint } from "./state.js";
import {
  OPERATION_NAMES,
  QUALITY_LABEL,
  TOOLS,
  coversOf,
  ensureFacts,
  ensureInspection,
  ensureTruth,
  inspectionProgress,
  truthFields
} from "./inspect.js";
import {
  FORGERY_TARGETS,
  LISTING_TAGS,
  WINDOW_CAPACITY,
  activeListings,
  currentQuestion,
  referencePrice
} from "./listing.js";
import { ITEM_COMPOSITION_POOLS, ITEM_TEMPLATES, STAGE_TWO_DATA } from "../data.js";
import { mallStock } from "./mall.js";
import { greyValue } from "./shop.js";
import { STORIES, ensureNotebook, storyProgress } from "./notebook.js";
import { compendiumSummary, ensureCompendium } from "./compendium.js";
import { LEVELS, nextLevel, unlockedFor } from "./upgrade.js";
import { shouldForceCarryHome } from "./mascot.js";
import {
  ITEM_TRAITS,
  KEEPSAKE_CAPACITY,
  keepsakeModifiers,
  traitModeLabel,
  traitOf
} from "./keepsake.js";
import { itemArtBackground, itemArtHtml, itemArtPaths } from "./itemart.js";

const cache = new Map();
let lastViewport = { width: LOGICAL.width, height: LOGICAL.height };

// 这些图层只是场景陈设或常驻信息，不参与点击高亮。
const PASSIVE_ROLES = new Set([
  "status",
  "lot",
  "competitors",
  "auctioneer",
  "mascot",
  "buyerPortrait",
  "prop",
  "notice",
  "loanPoster",
  "sheet",
  "inspectView",
  "inspectOps",
  "inspectBelt"
]);

function build(sceneName) {
  const scene = SCENES[sceneName];
  const wrap = document.createElement("div");
  wrap.className = "scene";
  wrap.dataset.scene = sceneName;

  scene.layers.forEach((layerData, index) => {
    const el = document.createElement("div");
    el.className = "layer";
    el.dataset.name = layerData.name;
    el.style.left = `${layerData.box.x / PSD_SCALE}px`;
    el.style.top = `${layerData.box.y / PSD_SCALE}px`;
    el.style.width = `${layerData.box.w / PSD_SCALE}px`;
    el.style.height = `${layerData.box.h / PSD_SCALE}px`;
    el.style.zIndex = String(index);
    // 记录 PSD 设计坐标，窗口尺寸变化时按锚点重新排布。
    el.__box = layerData.box;
    if (layerData.color) {
      el.style.background = layerData.color;
    }
    if (layerData.role) {
      el.dataset.role = layerData.role;
      if (!PASSIVE_ROLES.has(layerData.role)) {
        el.classList.add("is-clickable");
      }
    }
    // 跟随层：位置永远贴着另一个图层（例如日历里的文字跟着日历走）。
    if (layerData.follow) {
      el.dataset.follow = layerData.follow;
    }
    if (layerData.route) {
      el.dataset.route = layerData.route;
    }
    if (layerData.tool) {
      el.dataset.tool = layerData.tool;
    }
    if (layerData.tab) {
      el.dataset.tab = layerData.tab;
    }
    if (layerData.hidden) {
      el.classList.add("is-hidden");
    }

    // 纯文字层不需要美术资源，避免多余的 404 请求。
    if (!layerData.artless) {
      const img = document.createElement("img");
      img.className = "art";
      img.alt = "";
      img.draggable = false;
      img.src = artPath(sceneName, layerData);
      img.addEventListener("error", () => img.remove());
      el.appendChild(img);
    } else {
      // 纯文字层不拦截鼠标，下面那一层的按键照常可点。
      el.classList.add("is-artless");
    }

    if (layerData.bind) {
      const value = document.createElement("span");
      value.className = "value";
      el.appendChild(value);
    }
    if (layerData.panel) {
      const panel = document.createElement("div");
      panel.className = "panel";
      el.appendChild(panel);
    }
    if (layerData.label) {
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = layerData.label;
      el.appendChild(label);
    }

    // 每个弹层右上角都有一个关闭按钮。
    if (layerData.role === "sheet") {
      const close = document.createElement("button");
      close.className = "sheet-close";
      close.dataset.role = "closeSheet";
      close.type = "button";
      close.setAttribute("aria-label", "关闭");
      close.textContent = "×";
      el.appendChild(close);
    }

    wrap.appendChild(el);
  });

  return wrap;
}

export function sceneRoot(sceneName) {
  if (!cache.has(sceneName)) {
    cache.set(sceneName, build(sceneName));
  }
  return cache.get(sceneName);
}

export function mountStage(stage, sceneName) {
  const root = sceneRoot(sceneName);
  if (!root.isConnected) {
    stage.appendChild(root);
  }
  cache.forEach((element, name) => {
    element.classList.toggle("is-active", name === sceneName);
  });
  const scale = Math.min(
    lastViewport.width / LOGICAL.width,
    lastViewport.height / LOGICAL.height
  );
  layoutLayers(scale, lastViewport);
  return root;
}

export function layer(sceneName, name) {
  return sceneRoot(sceneName).querySelector(`.layer[data-name="${name}"]`);
}

function setText(sceneName, name, text) {
  const el = layer(sceneName, name);
  if (!el) {
    return;
  }
  const value = el.querySelector(".value");
  if (value) {
    value.textContent = text;
  }
}

function setLabel(sceneName, name, text) {
  const el = layer(sceneName, name);
  if (!el) {
    return;
  }
  const label = el.querySelector(".label");
  if (label) {
    label.textContent = text;
  }
}

function setPanel(sceneName, name, html) {
  const el = layer(sceneName, name);
  if (!el) {
    return;
  }
  const panel = el.querySelector(".panel");
  if (panel) {
    panel.innerHTML = html;
  }
}

function setHidden(sceneName, name, hidden) {
  const el = layer(sceneName, name);
  if (el) {
    el.classList.toggle("is-hidden", Boolean(hidden));
  }
}

function setDisabled(sceneName, name, disabled) {
  const el = layer(sceneName, name);
  if (el) {
    el.classList.toggle("is-disabled", Boolean(disabled));
  }
}

function setActive(sceneName, name, active) {
  const el = layer(sceneName, name);
  if (el) {
    el.classList.toggle("is-active", Boolean(active));
  }
}

function setAttr(sceneName, name, key, value) {
  const el = layer(sceneName, name);
  if (el) {
    el.dataset[key] = value;
  }
}

// 贴边的阈值，小于这个距离视为贴住画布边缘。
const EDGE = 16;

// 单个轴上的排布：贴左、贴右、整条拉伸，其余按中心比例分布。
function placeAxis(pos, size, extent, total) {
  const lead = pos;
  const trail = extent - (pos + size);
  if (lead <= EDGE && trail <= EDGE) {
    return { pos: 0, size: total };
  }
  if (lead <= EDGE) {
    return { pos, size };
  }
  if (trail <= EDGE) {
    return { pos: total - trail - size, size };
  }
  return { pos: total / 2 + (pos - extent / 2), size };
}

function layoutLayers(scale, viewport) {
  const totalWidth = viewport.width / scale;
  const totalHeight = viewport.height / scale;
  cache.forEach((root) => {
    const layers = Array.from(root.querySelectorAll(".layer"));
    layers.forEach((element) => {
      const box = element.__box;
      if (!box) {
        return;
      }
      if (element.dataset.follow) {
        return;
      }
      const half = PSD_SCALE;
      const horizontal = placeAxis(
        box.x / half,
        box.w / half,
        LOGICAL.width,
        totalWidth
      );
      const vertical = placeAxis(
        box.y / half,
        box.h / half,
        LOGICAL.height,
        totalHeight
      );
      element.style.left = `${horizontal.pos}px`;
      element.style.width = `${horizontal.size}px`;
      element.style.top = `${vertical.pos}px`;
      element.style.height = `${vertical.size}px`;
    });
    // 跟随层按目标图层的实际位置偏移，窗口比例变化时不会跟丢。
    layers.forEach((element) => {
      const follow = element.dataset.follow;
      const box = element.__box;
      if (!follow || !box) {
        return;
      }
      const target = root.querySelector(`.layer[data-name="${follow}"]`);
      if (!target || !target.__box) {
        return;
      }
      const half = PSD_SCALE;
      const dx = (box.x - target.__box.x) / half;
      const dy = (box.y - target.__box.y) / half;
      element.style.left = `${(parseFloat(target.style.left) || 0) + dx}px`;
      element.style.top = `${(parseFloat(target.style.top) || 0) + dy}px`;
      element.style.width = `${box.w / half}px`;
      element.style.height = `${box.h / half}px`;
    });
  });
}

export function fitStage(canvasElement, viewport) {
  lastViewport = viewport;
  const scale = Math.min(viewport.width / LOGICAL.width, viewport.height / LOGICAL.height);
  canvasElement.style.transformOrigin = "0 0";
  canvasElement.style.transform = `scale(${scale})`;
  canvasElement.style.left = "0";
  canvasElement.style.top = "0";
  canvasElement.style.width = `${viewport.width / scale}px`;
  canvasElement.style.height = `${viewport.height / scale}px`;
  layoutLayers(scale, viewport);
}

function paintStatus(sceneName, state) {
  setText(sceneName, "余额", `余额 ¥${state.cash}`);
  setText(sceneName, "麻烦值", `麻烦 ${state.trouble} / 10`);
  setText(sceneName, "信誉值", `信誉 ${state.reputation}`);
  const remain = Math.max(0, (state.trendEndDay || state.day) - state.day + 1);
  // 日历里的两行文字分别写进 PSD 标出的两个文字区域。
  setText(sceneName, "日历", "");
  setText(sceneName, "日历_天数", `第 ${state.day} 天`);
  setText(sceneName, "日历_趋势", state.trend.name);
}

function paintAuction(state, ui) {
  const scene = "auction";
  paintStatus(scene, state);

  const sceneState = SCENES.auction;
  const lot = state.lots[state.lotIndex] || null;
  const finished = state.auction.status === "finished";

  setHidden(scene, "当前箱子", !lot || finished);
  if (lot) {
    setText(
      scene,
      "当前箱子",
      `第 ${state.lotIndex + 1} / ${state.lots.length} 箱\n${lot.size.label} · ${lot.weightKg}kg`
    );
  }

  setHidden(scene, "箱子信息面板", finished);
  if (!finished && lot) {
    setPanel(scene, "箱子信息面板", lotPanel(state, lot));
  }

  // 出价信息栏三行：买家一、买家二、玩家。
  const bids = state.auction.bids || {};
  const rows = [
    ["买家一出价", lot && lot.competitors[0]],
    ["买家二出价", lot && lot.competitors[1]]
  ];
  rows.forEach(([name, entry]) => {
    if (!entry) {
      setText(scene, name, "");
      return;
    }
    const leading = state.auction.leader === entry.id;
    const bid = bids[entry.id] || 0;
    setText(scene, name, `${entry.name}\n${bid ? `¥${bid}` : "观望"}${leading ? " · 领先" : ""}`);
  });
  const playerBid = bids.player || 0;
  setText(
    scene,
    "玩家出价",
    `你\n${playerBid ? `¥${playerBid}` : "未出价"}${
      state.auction.leader === "player" ? " · 领先" : ""
    }`
  );

  // 信贷海报打开时，加价/放弃让位给海报下方的借款按钮。
  setHidden(scene, "加价", finished || Boolean(ui.loan));
  setHidden(scene, "放弃", finished || Boolean(ui.loan));
  if (!finished && lot) {
    const amount = nextBidPreview(state);
    setLabel(scene, "加价", state.cash < amount ? `余额不足 ¥${amount}` : `加价 ¥${amount}`);
    setDisabled(scene, "加价", state.cash < amount);
    setLabel(scene, "放弃", "放弃本箱");
  }

  setHidden(scene, "成交印章", !ui.stamp);
  setHidden(scene, "今日结束牌", !finished);
  if (ui.loan) {
    setHidden(scene, "黑匣广告海报", false);
    // 海报是整张美术，参数和按钮都不写死在画面上。
    setPanel(scene, "黑匣广告海报", "");
  } else {
    setHidden(scene, "黑匣广告海报", true);
  }
  setHidden(scene, "借款操作栏", !ui.loan);
  if (ui.loan) {
    setPanel(scene, "借款操作栏", loanActionsHtml(ui.loan));
  }
  setHidden(scene, "小黑", !ui.loan);

  // 场景层保持可见，避免切换界面时露底。
  sceneState.layers.filter((entry) => entry.role === "status").forEach(() => {});
}

// 游戏开始界面：标题和两个按键都是 PSD 美术，这里只处理是否有存档。
function paintStart(state) {
  const scene = "start";
  setDisabled(scene, "载入游戏按键", !hasCheckpoint());
}

function nextBidPreview(state) {
  const price = state.auction.price || 0;
  return Math.max(price + 10, Math.ceil((price * 1.1) / 10) * 10);
}

function lotPanel(state, lot) {
  const leader =
    state.auction.leader === "player"
      ? "你"
      : state.auction.leader
        ? (lot.competitors.find((entry) => entry.id === state.auction.leader) || {}).name ||
          "竞争对手"
        : "无人应价";
  const amount = nextBidPreview(state);

  return `
    <div class="grid">
      <div class="col">
        <h4>第 ${state.lotIndex + 1} / ${state.lots.length} 箱</h4>
        <ul class="facts">
          <li>来源 ${lot.origin.label}</li>
          <li>航线 ${lot.route}</li>
          <li>${lot.size.label} · ${lot.weightKg}kg</li>
          <li>${lot.seal.label}</li>
          <li>外观 ${lot.appearance.label}</li>
          <li>寄存 ${lot.storageDays} 天</li>
          <li>批次 ${lot.batch}</li>
        </ul>
      </div>
      <div class="col">
        <h4>估值参考 ¥${lot.estimate.min} - ¥${lot.estimate.max}</h4>
        <p class="meta">可信度 ${lot.estimate.confidence}</p>
        ${lot.estimate.positiveFactors.map((text) => `<p class="pos">＋${text}</p>`).join("")}
        ${lot.estimate.riskFactors.map((text) => `<p class="risk">－${text}</p>`).join("")}
      </div>
    </div>
    <div class="bidline">
      <span>当前报价 <b>¥${state.auction.price}</b></span>
      <span>领先 <b>${leader}</b></span>
      <span>下一次 <b>¥${amount}</b></span>
    </div>
  `;
}

// 贷款按钮：海报上不写文字，两个按钮排在海报下沿。
function loanActionsHtml(loan) {
  return `<button class="btn primary loan-btn" data-role="takeLoan">立即借款</button>${
    loan.forced ? "" : '<button class="btn loan-btn" data-role="dismissLoan">放弃本次加价</button>'
  }`;
}

const ROUTE_CARDS = {
  resale: {
    title: "原封转卖",
    gain: "期望偏低，可能低于买入价",
    risk: "错过箱内高价值物品",
    next: "交易结束"
  },
  onsite: {
    title: "现场开箱",
    gain: "中等波动",
    risk: "现场压价，违禁品无人收购",
    next: "逐件报价"
  },
  home: {
    title: "带回家",
    gain: "上限最高",
    stock: "占用货架下层箱子格",
    risk: "保管费、买家放弃、调查",
    next: "打开箱子并检视"
  }
};

function routeCardHtml(route, extra = "") {
  const card = ROUTE_CARDS[route];
  return `
    <div class="card">
      <strong>${card.title}</strong>
      ${extra}
      ${card.time ? `<p>回款：${card.time}</p>` : ""}
      <p>收益：${card.gain}</p>
      ${card.stock ? `<p>库存：${card.stock}</p>` : ""}
      <p>风险：${card.risk}</p>
      <p>下一步：${card.next}</p>
    </div>
  `;
}

function paintDisposal(state, ui) {
  const scene = "disposal";
  paintStatus(scene, state);
  const won = state.pendingWon;
  if (!won) {
    return;
  }
  // 教学期的第一只箱子只能带回店铺。
  const forced = shouldForceCarryHome(state);
  const quote = resalePreview(state, won);
  const room = capacityOf(state);
  const boxFree = room.boxSlots - state.shelfBoxes.length;
  const itemFree = room.itemSlots - state.inventory.length;

  setText(scene, "箱子", `成交价 ¥${won.price}`);
  setPanel(scene, "原封转卖", routeCardHtml("resale", `<p class="quote">报价约 ¥${quote}</p>`));
  setPanel(scene, "现场开箱", routeCardHtml("onsite"));
  setPanel(
    scene,
    "带回家",
    routeCardHtml("home", `<p class="meta">箱子格 剩 ${Math.max(0, boxFree)} · 物品格 剩 ${Math.max(0, itemFree)}</p>`)
  );
  setHidden(scene, "货架容量不足", !ui.capacityWarning);
  setHidden(scene, "小黑", !ui.loan);
  setDisabled(scene, "原封转卖", forced);
  setDisabled(scene, "现场开箱", forced);
  if (forced) {
    setPanel(
      scene,
      "带回家",
      routeCardHtml("home", '<p class="meta">教学：先带回店铺学会处理流程</p>')
    );
  }
}

let lastQuoteKey = null;
let lastQuoteValue = 0;

function resalePreview(state, lot) {
  const key = `${lot.id}:${state.day}`;
  if (lastQuoteKey !== key) {
    // 预览报价固定一次，避免每次重绘都变。
    lastQuoteKey = key;
    lastQuoteValue = 0;
  }
  if (!lastQuoteValue) {
    const mid = (lot.estimate.min + lot.estimate.max) / 2;
    lastQuoteValue = Math.round((mid * 0.9) / 10) * 10;
  }
  return lastQuoteValue;
}

function paintOnsite(state, ui) {
  const scene = "disposal_open";
  paintStatus(scene, state);
  const offers = ui.onsiteOffers || [];
  const won = state.pendingWon;
  const rows = offers
    .map(
      (offer) => `
      <li class="offer${offer.sellable ? "" : " refused"}">
        <span class="name">${offer.name}</span>
        <span class="price">${offer.sellable ? `¥${offer.price}` : "拒绝收购"}</span>
      </li>`
    )
    .join("");
  const total = offers.reduce((sum, offer) => sum + offer.price, 0);
  const room = capacityOf(state);
  const itemFree = room.itemSlots - state.inventory.length;
  // 现场开箱是当众打开：箱内物品要摊在箱子里，而不是只在右侧列报价。
  const boxItems = (won ? won.items : [])
    .map((item) => {
      const offer = offers.find((entry) => entry.uid === item.uid);
      return `
        <div class="box-open-item${offer && !offer.sellable ? " refused" : ""}">
          ${itemArtHtml(item, "box-open-art")}
          <span class="box-open-name">${item.name}</span>
          <span class="box-open-price">${
            offer ? (offer.sellable ? `¥${offer.price}` : "无人收购") : ""
          }</span>
        </div>`;
    })
    .join("");
  setPanel(scene, "箱子", `<div class="box-open-row">${boxItems}</div>`);
  setPanel(
    scene,
    "预览面板",
    `<h4>现场报价</h4><ul class="offers">${rows}</ul>
     <p class="total">现场总报价 ¥${total}</p>
     <p class="meta">物品格剩余 ${Math.max(0, itemFree)} · 带回家需要 ${offers.length} 格</p>`
  );
  setLabel(scene, "全部卖给现场", `全部卖给现场 ¥${total}`);
  setLabel(scene, "全部带回家", "全部带回家");
  setDisabled(scene, "全部带回家", itemFree < offers.length);
}


const SHEET_LAYERS = {
  detail: ["物品详情窗口"],
  record: ["物品信息窗口"],
  listing: ["出售页面"],
  mall: ["商城页面"],
  notebook: [
    "书签_买家故事_收起",
    "书签_买家故事_选中",
    "书签_图鉴_收起",
    "书签_图鉴_选中",
    "书签_店铺升级_收起",
    "书签_店铺升级_选中",
    "记事本页面",
    "记事本_左页",
    "记事本_右页",
    "记事本_三角标",
    "记事本_关闭"
  ],
  universal: ["万物通页面", "搜索_搜索框", "万物通索引栏"],
  calendar: ["日历展开"],
  keepsake: ["收纳盒窗口"],
  keepsakeAsk: ["收纳盒确认"],
  inspect: [
    "检视台弹层",
    "物品视图",
    "操作区",
    "工具带",
    ...TOOL_LAYERS
  ]
};

// 打开弹层时压暗这些场景层，常驻状态栏和日历保持原亮度。
const SHOP_CONTENT_LAYERS = [
  "店铺背景",
  "买家",
  "桌面",
  "电脑",
  "橱窗",
  "收纳盒",
  "记事本",
  "拍卖锤",
  "营业牌",
  "货架",
  "货架上层物品格",
  "货架下层箱子区",
  "买家对话气泡",
  "玩家选项一",
  "玩家选项二",
  "玩家选项三"
];

function currentItem(state, ui) {
  return (
    state.inventory.find((item) => item.uid === ui.itemId) ||
    state.keepsakes.find((item) => item.uid === ui.itemId) ||
    (state.listings.find((entry) => entry.item && entry.item.uid === ui.itemId) || {}).item ||
    null
  );
}

// 物品编号在部分旧存档里可能缺失，缺了就只显示名称，不显示 undefined。
function codeTag(item) {
  return item && item.code ? `<b>${item.code}</b>` : "";
}

// 物品检视记录，放在桌面上点开物品时显示。
function inspectionRecordHtml(state, item) {
  if (!item) {
    return "<p>没有选中物品。</p>";
  }
  const inspection = ensureInspection(item);
  const progress = inspectionProgress(item);
  const rows = inspection.operations
    .map((id) => {
      const done = inspection.results[id];
      const label = done ? QUALITY_LABEL[done.quality] : "未完成";
      return `<li class="op-row${done ? " done" : ""}">
        <span class="op-name">${OPERATION_NAMES[id]}</span>
        <span class="op-state">${label}</span>
      </li>`;
    })
    .join("");
  const facts = ensureFacts(item).filter((fact) => fact.discovered);
  const truth = truthFields(item).filter((field) => ensureTruth(item).discovered[field.key]);
  const ref = referencePrice(state, item);
  return `
    <h4>${item.name}${item.code ? ` · ${item.code}` : ""}</h4>
    <p class="meta">检视 ${progress.done} / ${progress.total}${
      progress.completed ? " · 已检视" : ""
    } · 状态 ${item.condition.label} · ${item.appearance.label}</p>
    <ul class="op-list">${rows}</ul>
    <h4>已发现问题</h4>
    <ul class="facts">${
      facts.length || truth.length
        ? [
            ...facts.map((fact) => `<li>${fact.label}：${fact.value}</li>`),
            ...truth.map(
              (field) => `<li class="${field.tone}">${field.label}：${field.value}</li>`
            )
          ].join("")
        : "<li>还没有确认任何问题</li>"
    }</ul>
    <h4>万物通参考</h4>
    <ul class="facts">
      <li>参考售价 ¥${ref.min} - ¥${ref.max}</li>
      <li>当前趋势 ${state.trend.name}</li>
      <li>标签标注年代 ${ensureTruth(item).labelYear} 年</li>
      <li>买入价 ¥${item.acquisitionCost || 0}</li>
    </ul>
  `;
}

// 买家到店后，正在谈的物品会摆到桌面上。
function paintDesk(state) {
  const listing = state.buyer
    ? state.listings.find((entry) => entry.id === state.buyer.listingId)
    : null;
  if (!listing) {
    setPanel("shop", "桌面", "");
    return;
  }
  const item = listing.item;
  setPanel(
    "shop",
    "桌面",
    `<button class="desk-item" data-role="deskItem" data-item="${item.uid}" title="点击查看物品详细信息">
       ${itemArtHtml(item, "desk-item-art")}
       <b>${item.name}</b>
     </button>`
  );
}

function paintShelf(state) {
  const scene = "shop";
  const room = capacityOf(state);

  const boxes = state.shelfBoxes
    .map(
      (entry) => `
      <button class="box-card" data-role="box" data-box="${entry.id}" title="点击开箱">
        <span class="box-size">${entry.size.label}</span>
        <span class="box-info">${entry.items.length} 件</span>
      </button>`
    )
    .join("");
  setPanel(
    scene,
    "货架下层箱子区",
    `<div class="box-row">${boxes}</div>`
  );

  const slots = state.inventory.map((item) => {
    const progress = inspectionProgress(item);
    const flag = item.contraband
      ? "违禁品"
      : item.storyId
        ? progress.completed
          ? "线索 · 已检视"
          : `线索 ${progress.done}/${progress.total}`
        : progress.completed
          ? "已检视"
          : `${progress.done}/${progress.total}`;
    return `
      <button class="slot filled${item.contraband ? " danger" : ""}${item.storyId ? " clue" : ""}" data-role="item" data-item="${item.uid}" title="${item.name}">
        ${itemArtHtml(item, "slot-art")}
        <span class="slot-name">${item.name}</span>
        <span class="slot-flag">${flag}</span>
      </button>`;
  });
  for (let index = state.inventory.length; index < room.itemSlots; index += 1) {
    slots.push('<span class="slot empty"></span>');
  }
  setPanel(scene, "货架上层物品格", `<div class="slot-grid">${slots.join("")}</div>`);
  setText(
    scene,
    "货架_计数",
    `物品 ${state.inventory.length}/${room.itemSlots} · 箱子 ${state.shelfBoxes.length}/${room.boxSlots}`
  );
}

// 橱窗的四个展示位：每格只摆物品，格子里不放文字，详细信息挂在悬停提示里。
const WINDOW_SLOTS = [
  [55, 114],
  [183.5, 114],
  [55, 224],
  [183.5, 224]
];

function windowWaitText(listing) {
  if (listing.status === "talking") {
    return "买家已到店";
  }
  if (listing.arrivalKind === "quick") {
    return "买家很快会到";
  }
  if (listing.arrivalKind === "slow") {
    return "买家还要等一会儿";
  }
  return "今天没有合适买家，明天再来";
}

function paintWindow(state) {
  const listings = activeListings(state).slice(0, WINDOW_CAPACITY);
  if (!listings.length) {
    setPanel("shop", "橱窗", '<h4>橱窗</h4><p class="win-empty meta">暂时没有上架物品</p>');
    return;
  }
  const cells = listings
    .map((listing, index) => {
      const spot = WINDOW_SLOTS[index];
      const wait = windowWaitText(listing);
      const detail = `${listing.item.name} · ¥${listing.price} · 标签 ${listing.tags.join(" · ")} · ${wait}`;
      return `<div class="win-slot" style="left:${spot[0]}px;top:${spot[1]}px" title="${detail}">${itemArtHtml(
        listing.item,
        "window-art"
      )}</div>`;
    })
    .join("");
  setPanel("shop", "橱窗", `<h4>橱窗</h4>${cells}`);
}

function paintBuyer(state) {
  const scene = "shop";
  const buyer = state.buyer;
  const question = currentQuestion(state);
  // 六张买家立绘只显示当前买家那一张。
  Object.entries(BUYER_PORTRAIT_LAYERS).forEach(([profileId, layerName]) => {
    setHidden(scene, layerName, !buyer || buyer.profileId !== profileId);
  });
  setHidden(scene, "买家对话气泡", !buyer);

  if (buyer) {
    const finished = buyer.questionIndex >= buyer.questions.length;
    const detected = Boolean(buyer.detected);
    const reaction = buyer.feedback
      ? `<p class="speech hint">${buyer.feedback.text}${
          buyer.feedback.delta
            ? `（信任 ${buyer.feedback.delta > 0 ? "+" : ""}${buyer.feedback.delta}）`
            : ""
        }</p>`
      : "";
    const body = detected
      ? `<p class="speech bad">${buyer.detected}</p>
         <div class="actions"><button class="btn" data-role="buyerLeave">知道了</button></div>`
      : `${reaction || `<p class="speech">${buyer.opening}</p>`}
         ${
           finished
             ? `<div class="actions"><button class="btn primary" data-role="settleBuyer">给出答复</button></div>`
             : `<p class="speech">${question ? question.text : ""}</p>`
         }`;
    setPanel(
      scene,
      "买家对话气泡",
      `<div class="buyer-head">
         <b>${buyer.name}</b>
         <span>${buyer.displayId} · 信任 ${Math.round(buyer.trust)} · ${buyer.preference}</span>
         <span class="buyer-trait">性格 ${buyer.personality || "普通"}</span>
         ${buyer.pricePenalty ? `<span>挂牌价高于建议上限，初始信任 -${buyer.pricePenalty}</span>` : ""}
       </div>
       ${body}`
    );
  }

  ["玩家选项一", "玩家选项二", "玩家选项三"].forEach((name, index) => {
    const live =
      buyer && !buyer.detected && buyer.questionIndex < buyer.questions.length;
    const reply = live && question ? question.replies[index] : null;
    setHidden(scene, name, !reply);
    if (reply) {
      setLabel(scene, name, reply.text);
      setAttr(scene, name, "reply", reply.id);
    }
  });
}

function detailHtml(state, ui) {
  const item = currentItem(state, ui);
  if (!item) {
    return "<p>没有选中物品。</p>";
  }
  const progress = inspectionProgress(item);
  const facts = ensureFacts(item).filter((fact) => fact.discovered);
  const ref = referencePrice(state, item);
  const trait = traitOf(item);
  const risk = item.contraband
    ? "违禁品"
    : item.forgery
      ? "使用过伪造材料"
      : progress.completed
        ? "无"
        : "未完成检视";

  return `
    <h4>${item.name}</h4>
    ${itemArtHtml(item, "detail-art")}
    ${
      trait
        ? `<p class="hint">藏品属性「${trait.tag}」· ${traitModeLabel(item)}：${trait.effect}</p>`
        : ""
    }
    <div class="grid">
      <div class="col">
        <ul class="facts">
          <li>买入价 ¥${item.acquisitionCost ?? 0}</li>
          <li>状态 ${item.condition.label} · ${item.appearance.label}</li>
          <li>检视 ${progress.completed ? "已完成" : `${progress.done} / ${progress.total}`}</li>
          <li>风险 ${risk}</li>
          <li>参考售价 ¥${ref.min} - ¥${ref.max}</li>
          <li>当前趋势 ${state.trend.name}</li>
        </ul>
      </div>
      <div class="col">
        <h4>已确认事实</h4>
        <ul class="facts">${
          facts.length
            ? facts.map((fact) => `<li>${fact.label}：${fact.value}</li>`).join("")
            : "<li>还没有确认任何事实</li>"
        }</ul>
      </div>
    </div>
    <div class="actions">
      <button class="btn" data-role="openInspect">检视</button>
      <button class="btn primary" data-role="openListing" ${
        progress.completed && !item.contraband ? "" : "disabled"
      }>出售</button>
      ${trait ? '<button class="btn" data-role="keepItem">自留</button>' : ""}
      ${
        item.contraband
          ? `<button class="btn" data-role="greySell">灰色渠道 ¥${greyValue(item)}</button>
             <button class="btn" data-role="reportItem">上交</button>`
          : ""
      }
      <button class="btn" data-role="closeSheet">关闭</button>
    </div>
    <p class="meta">${
      item.contraband
        ? "违禁品不能走普通上架，可以出售给灰色渠道或上交。"
        : progress.completed
          ? "已完成检视，可以设置标签和价格。"
          : "完成全部检视操作后才能出售。"
    }</p>
  `;
}

function materialChips(state, ui, role) {
  const selected = ui.forge ? ui.forge.materialId : ui.draft && ui.draft.materialId;
  return Object.entries(state.fakeStock)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => {
      const product = mallStock().find((entry) => entry.id === id);
      const name = product ? product.name : id;
      return `<button class="chip-btn${selected === id ? " on" : ""}" data-role="${role}" data-material="${id}">${name} ×${count}</button>`;
    })
    .join("");
}

function targetChips(ui, role) {
  const selected = ui.forge ? ui.forge.targetId : ui.draft && ui.draft.targetId;
  return FORGERY_TARGETS.map(
    (target) =>
      `<button class="chip-btn${selected === target.id ? " on" : ""}" data-role="${role}" data-target="${target.id}">${target.name}</button>`
  ).join("");
}

// 收纳盒：四个格子，展示藏品属性；替换模式下点击格子即可替换。
function keepsakeHtml(state, ui) {
  const keepsakes = state.keepsakes || [];
  const mods = keepsakeModifiers(state);
  const picking = Boolean(ui.keepsakePick);
  const pickingItem = picking
    ? state.inventory.find((entry) => entry.uid === ui.keepsakePick)
    : null;
  const slots = keepsakes.map((item) => {
    const trait = traitOf(item);
    const body = `<b>${item.name}</b>
      <span class="keepsake-trait">${trait ? `${trait.tag} · ${traitModeLabel(item)}` : "无属性"}</span>`;
    if (!picking) {
      return `<span class="keepsake-slot">${body}</span>`;
    }
    return `<button class="keepsake-slot is-pickable" data-role="keepsakeSlot" data-keepsake="${
      item.uid
    }" title="点击以替换藏品">${body}<span class="keepsake-tip">点击以替换藏品</span></button>`;
  });
  for (let index = keepsakes.length; index < KEEPSAKE_CAPACITY; index += 1) {
    slots.push('<span class="keepsake-slot empty">空位</span>');
  }
  const ignored = mods.ignoredTags.length
    ? `<p class="hint">重复标签未生效：${mods.ignoredTags.join("、")}。同一标签只生效一次。</p>`
    : "";
  return `
    <h4>收纳盒 ${keepsakes.length} / ${KEEPSAKE_CAPACITY}</h4>
    ${
      picking && pickingItem
        ? `<p class="hint">要放进「${pickingItem.name}」，请点一个格子替换。</p>`
        : ""
    }
    <p class="meta">同一标签的自留藏品同时放在收纳盒里只生效一次，重复摆放不会叠加。</p>
    <p class="meta">生效中：${mods.activeTags.length ? mods.activeTags.join("、") : "暂无"}</p>
    ${ignored}
    <div class="keepsake-grid">${slots.join("")}</div>
    <div class="actions"><button class="btn" data-role="closeSheet">关闭</button></div>
  `;
}

// 收纳盒满时的确认框。
function keepsakeAskHtml(state, ui) {
  const item = state.inventory.find((entry) => entry.uid === ui.keepsakePick);
  const trait = traitOf(item);
  return `
    <h4>收纳盒已满，是否要进行替换？</h4>
    <p class="meta">${
      item
        ? `${item.name}的属性是「${trait ? trait.tag : "无"}」· ${
            trait ? traitModeLabel(item) : ""
          }：${trait ? trait.effect : ""}`
        : ""
    }</p>
    <p class="meta">选择「是」后点一个格子替换，被替换下来的藏品会回到货架。</p>
    <div class="actions">
      <button class="btn primary" data-role="keepsakeYes">是</button>
      <button class="btn" data-role="keepsakeNo">否</button>
    </div>
  `;
}

function listingHtml(state, ui) {
  const item = currentItem(state, ui);
  if (!item) {
    return "<p>没有选中物品。</p>";
  }
  const draft = ui.draft || { price: 0, tags: [], days: 1, materialId: null, targetId: null };
  const ref = referencePrice(state, item);
  const tags = LISTING_TAGS.map(
    (tag) =>
      `<button class="chip-btn${draft.tags.includes(tag) ? " on" : ""}" data-role="toggleTag" data-tag="${tag}">${tag}</button>`
  ).join("");
  const days = [1, 2, 3]
    .map(
      (day) =>
        `<button class="chip-btn${draft.days === day ? " on" : ""}" data-role="pickDays" data-days="${day}">${day} 天</button>`
    )
    .join("");
  return `
    <h4>出售 ${item.name}</h4>
    <p class="meta">参考售价 ¥${ref.min} - ¥${ref.max}，当前趋势 ${state.trend.name}</p>
    <div class="row">
      <span>价格</span>
      <input type="range" data-role="priceRange" min="${Math.max(
        10,
        ref.min - 200
      )}" max="${ref.max + 600}" step="10" value="${draft.price}" data-ref-max="${ref.max}" />
      <b class="price-read">¥${draft.price}</b>
    </div>
    <div class="chips">
      <button class="chip-btn" data-role="quickPrice" data-factor="1">参考价</button>
      <button class="chip-btn" data-role="quickPrice" data-factor="1.2">上浮 20%</button>
      <button class="chip-btn" data-role="quickPrice" data-factor="1.5">上浮 50%</button>
    </div>
    <div class="quote-warning-slot" data-role="quoteWarning">${quoteWarningHtml(
      draft.price,
      ref.max
    )}</div>
    <h4>标签（选两个）</h4>
    <div class="chips">${tags}</div>
    <h4>展示天数</h4>
    <div class="chips">${days}</div>
    ${
      item.forgery
        ? `<h4>伪造目标买家</h4>
           <p class="meta">已使用伪造材料，曝光风险 ${Math.round(item.forgery.exposure * 100)}%。</p>
           <div class="chips">${targetChips(ui, "pickTarget")}</div>`
        : '<p class="meta">没有使用伪造物。伪造需要在检视台用伪造工具完成。</p>'
    }
    <div class="actions">
      <button class="btn primary" data-role="confirmListing">确认出售</button>
      <button class="btn" data-role="closeSheet">取消</button>
    </div>
  `;
}

// 价格高于建议上限时的提示内容。
export function quoteWarningHtml(price, refMax) {
  if (!refMax || price <= refMax) {
    return "";
  }
  const overflow = (price - refMax) / Math.max(1, refMax);
  return `<div class="quote-warning">
    <b>当前售价高于建议上限</b>，成交后仍按你设定的价格结算，但买家放弃交易的概率会明显提高。
    超出 ${Math.round(overflow * 100)}%：买家初始信任 -${Math.min(
      20,
      Math.round(overflow * 40)
    )}，成交所需的信任门槛提高到 ${Math.min(83, Math.round(58 + Math.min(25, overflow * 40)))}。
  </div>`;
}

function mallHtml(state) {
  const rows = mallStock()
    .map((product) => {
      const owned = state.fakeStock[product.id] || 0;
      return `
      <li class="mall-row">
        <div class="mall-info">
          <b>${product.name}</b>
          <p class="meta">${product.effect}</p>
        </div>
        <div class="mall-buy">
          <span class="price-read">¥${product.price}</span>
          ${owned ? `<span class="meta">已有 ${owned}</span>` : ""}
          <button class="btn" data-role="buyProduct" data-product="${product.id}">购买</button>
        </div>
      </li>`;
    })
    .join("");
  return `
    <h4>电脑商城</h4>
    <p class="meta">余额 ¥${state.cash}</p>
    <ul class="mall-list">${rows}</ul>
    <div class="actions"><button class="btn" data-role="closeSheet">关闭</button></div>
  `;
}

function calendarHtml(state) {
  const remain = Math.max(0, state.trendEndDay - state.day + 1);
  const days = [];
  for (let index = -3; index <= 10; index += 1) {
    const day = state.day + index;
    if (day < 1) {
      continue;
    }
    const marked = day >= state.day && day <= state.trendEndDay;
    const due = state.nextPayment.dueDay === day;
    days.push(
      `<span class="cal-day${day === state.day ? " today" : ""}${
        marked ? " trend" : ""
      }${due ? " due" : ""}">${day}</span>`
    );
  }
  return `
    <h4>日历 · 第 ${state.day} 天</h4>
    <p>市场趋势 <b>${state.trend.name}</b>，剩余 ${remain} 天</p>
    <div class="cal-strip">${days.join("")}</div>
    <ul class="facts">
      <li>现金 ¥${state.cash}</li>
      <li>总债务 ¥${state.totalDebt}</li>
      <li>${
        state.nextPayment.dueDay
          ? `下次还款 第 ${state.nextPayment.dueDay} 天，金额 ¥${state.nextPayment.amount}${
              state.debtPlan && state.debtPlan.periods
                ? `（共 ${state.debtPlan.periods} 期，每 ${state.debtPlan.interval} 天一期）`
                : ""
            }`
          : "当前没有还款计划"
      }</li>
      <li>信誉 ${state.reputation} · 麻烦 ${state.trouble} / 10</li>
      <li>违禁品关注度 ${state.contrabandAttention} · 官方关系 ${state.officialRelation}</li>
      <li>已还款期数 ${state.paidPeriods} / ${(state.debtPlan && state.debtPlan.periods) || 0} · 逾期 ${state.overdueCount}</li>
    </ul>
    <div class="actions"><button class="btn" data-role="closeSheet">关闭</button></div>
  `;
}

function forgeHtml(state, ui) {
  const materials = materialChips(state, ui, "pickForgeMaterial");
  const targets = targetChips(ui, "pickForgeTarget");
  const item = currentItem(state, ui);
  const picked = ui.forge.materialId ? coversOf(ui.forge.materialId) : [];
  const covers = picked
    .map((key) => (ensureTruth(item).fields[key] || {}).label)
    .filter(Boolean);
  return `
    <div class="forge">
      <h4>伪造材料</h4>
      <div class="chips">${materials || '<span class="meta">没有伪造材料，先去电脑商城购买。</span>'}</div>
      ${covers.length ? `<p class="meta">会覆盖：${covers.join("、")}</p>` : ""}
      <h4>目标买家</h4>
      <div class="chips">${targets}</div>
      <p class="meta">在左侧物品视图里，把材料拖到虚线区域。</p>
      <div class="actions">
        <button class="btn primary" data-role="openForgeMall">去电脑商城买材料</button>
        <button class="btn" data-role="cancelForge">退出伪造</button>
      </div>
    </div>
  `;
}

function cleanStage(item, inspection) {
  const patches = inspection.clean.patches
    .map(
      (patch) => `
      <span class="dirt" data-dirt="${patch.id}" style="left:${patch.x * 100}%;top:${
        patch.y * 100
      }%;width:${patch.r * 200}%;height:${patch.r * 200}%;opacity:${(1 - patch.progress).toFixed(
        2
      )}"></span>`
    )
    .join("");
  return `
    <div class="item-stage" data-stage>
      <div class="item-art">${itemArtHtml(item)}
        <span class="item-art-caption">${item.name}${codeTag(item)}</span>
      </div>
      ${patches}
      <span class="brush" data-brush></span>
    </div>
    <p class="inspect-hint">按住左键在物品表面拖动，把污渍全部擦掉。</p>`;
}

function circuitStage(item, inspection) {
  const circuit = inspection.circuit;
  const screws = circuit.screws
    .map(
      (on, index) => `
      <button class="screw${on ? "" : " out"}" data-role="screw" data-index="${index}"
        style="left:${16 + index * 22}%;top:10%">${on ? "◍" : "○"}</button>`
    )
    .join("");
  const ghosts = circuit.coverOpen
    ? circuit.parts
        .filter((part) => !part.seated)
        .map(
          (part) =>
            `<span class="ghost" style="left:${part.slotX * 100}%;top:${
              part.slotY * 100
            }%">${part.label}</span>`
        )
        .join("")
    : "";
  const mounted = circuit.coverOpen
    ? circuit.parts
        .filter((part) => part.seated)
        .map(
          (part) =>
            `<span class="part mounted" data-role="mountedPart" data-part="${part.id}"
               style="left:${part.slotX * 100}%;top:${part.slotY * 100}%">${part.label}</span>`
        )
        .join("")
    : "";
  const tray = circuit.coverOpen
    ? circuit.parts
        .filter((part) => part.inTray)
        .map(
          (part) =>
            `<span class="part tray${part.broken ? " broken" : ""}" data-role="part" data-part="${
              part.id
            }">${part.label}${part.broken ? "（损坏）" : ""}</span>`
        )
        .join("")
    : "";
  const dirt =
    circuit.dirt && circuit.dirt.progress < 1
      ? `<span class="dirt" data-circuit-dirt style="left:${circuit.dirt.x * 100}%;top:${
          circuit.dirt.y * 100
        }%;width:28%;height:28%;opacity:${(1 - circuit.dirt.progress).toFixed(2)}"></span>`
      : "";
  const ready =
    circuit.coverOpen &&
    circuit.parts.every(
      (part) => !part.needsRemoval || part.reinstalled || part.broken
    ) &&
    (!circuit.dirt || circuit.dirt.progress >= 1);
  const notes = {
    damaged: "有零件已经损坏，装不回去，物品价值会下降。",
    dirt: "内部还有污渍，按住左键用清洁布擦掉。",
    order: `零件要按顺序装回：${(circuit.order || [])
      .map((id) => (circuit.parts.find((part) => part.id === id) || {}).label)
      .filter(Boolean)
      .join(" → ")}`
  };
  const complication = circuit.coverOpen && circuit.complication
    ? `<p class="hint">${notes[circuit.complication]}</p>`
    : "";
  const finalLabel = circuit.kind === "electronic" ? "通电测试" : "完成装机";
  return `
    <div class="item-stage circuit" data-stage>
      <div class="cover${circuit.coverOpen ? " open" : ""}" data-role="cover">外壳盖板</div>
      ${screws}
      ${dirt}
      ${ghosts}
      ${mounted}
      <div class="tray-slot">零件托盘 ${tray}</div>
    </div>
    <p class="inspect-hint">${
      circuit.coverOpen
        ? "把托盘里的零件拖回虚线槽位，然后完成收尾。"
        : "先点掉四颗螺丝，再取下外壳盖板。"
    }</p>
    ${complication}
    ${ready ? `<button class="btn primary" data-role="power">${finalLabel}</button>` : ""}`;
}

function magnifierStage(item, inspection) {
  const marks = inspection.magnifier.spots
    .filter((spot) => spot.found)
    .map((spot) => {
      const field = ensureTruth(item).fields[spot.key] || {};
      return `<span class="spot" style="left:${spot.x * 100}%;top:${spot.y * 100}%">${
        field.label || ""
      }</span>`;
    })
    .join("");
  return `
    <div class="item-stage" data-stage>
      <div class="item-art" data-art>${itemArtHtml(item)}
        <span class="item-art-caption">${item.name}${codeTag(item)}</span>
      </div>
      ${marks}
      <div class="lens" data-lens>
        <div class="lens-inner" data-lens-inner>
          <div class="item-art">${itemArtHtml(item)}
            <span class="item-art-caption">${item.name}${codeTag(item)}</span>
          </div>
        </div>
      </div>
    </div>
    <p class="inspect-hint">移动鼠标把放大镜对准物品表面，停留一下就能读出真实信息。</p>`;
}

function forgeStage(item, ui) {
  const material = mallStock().find((entry) => entry.id === ui.forge.materialId);
  return `
    <div class="item-stage" data-stage>
      <div class="item-art">${itemArtHtml(item)}
        <span class="item-art-caption">${item.name}${codeTag(item)}</span>
      </div>
      <span class="forge-target" data-forge-target></span>
      ${material ? `<span class="forge-piece" data-forge-piece>${material.name}</span>` : ""}
    </div>
    <p class="inspect-hint">${
      material ? "按住材料拖到虚线框内，越居中质量越高。" : "先在右侧选择一种伪造材料。"
    }</p>`;
}

function inspectStage(item, ui) {
  const inspection = ensureInspection(item);
  if (ui.inspectMode === "forge" && ui.forge) {
    return forgeStage(item, ui);
  }
  if (ui.inspectMode === "clean" && inspection.clean) {
    return cleanStage(item, inspection);
  }
  if (ui.inspectMode === "circuit" && inspection.circuit) {
    return circuitStage(item, inspection);
  }
  if (ui.inspectMode === "magnifier" && inspection.magnifier) {
    return magnifierStage(item, inspection);
  }
  return `
    <div class="item-stage" data-stage>
      <div class="item-art">${itemArtHtml(item)}
        <span class="item-art-caption">${item.name}${codeTag(item)}</span>
      </div>
    </div>
    <p class="inspect-hint">选择右侧工具开始操作。</p>`;
}

function inspectHtml(state, ui) {
  const item = currentItem(state, ui);
  if (!item) {
    return "<p>没有选中物品。</p>";
  }
  const inspection = ensureInspection(item);
  const progress = inspectionProgress(item);
  const rows = inspection.operations
    .map((id) => {
      const done = inspection.results[id];
      const label = done ? QUALITY_LABEL[done.quality] : "未完成";
      return `<li class="op-row${done ? " done" : ""}">
        <span class="op-name">${OPERATION_NAMES[id]}</span>
        <span class="op-state">${label}</span>
      </li>`;
    })
    .join("");
  const facts = ensureFacts(item).filter((fact) => fact.discovered);
  const truth = truthFields(item).filter((field) => ensureTruth(item).discovered[field.key]);
  const ref = referencePrice(state, item);
  const hints = {
    clean: "按住左键在物品上拖动，把污渍擦掉。",
    circuit: "先卸螺丝，再取外壳，最后把零件装回槽位。",
    magnifier: "移动放大镜扫过物品表面。",
    forge: "选好材料后，从左侧把材料拖到虚线区域。"
  };
  const cleanReady =
    ui.inspectMode === "clean" &&
    inspection.clean &&
    !inspection.results.clean &&
    inspection.clean.patches.every((patch) => patch.progress >= 1);
  const magnifierReady =
    ui.inspectMode === "magnifier" &&
    inspection.magnifier &&
    !inspection.results.magnifier &&
    inspection.magnifier.spots.every((spot) => spot.found);
  const readyAction =
    cleanReady || magnifierReady
      ? `<div class="actions"><button class="btn primary" data-role="finishOp">${
          cleanReady ? "确认清洁结果" : "确认检查结果"
        }</button></div>`
      : "";
  return `
    <div class="inspect-op-area">
      <h4 class="inspect-title">检视 ${item.name}</h4>
      <p class="meta">操作 ${progress.done} / ${progress.total}${
        progress.completed ? " · 已检视" : ""
      }</p>
      <ul class="op-list">${rows}</ul>
      ${
        ui.inspectMode
          ? `<p class="hint">${hints[ui.inspectMode] || ""}</p>`
          : '<p class="meta">选择右侧工具开始操作。</p>'
      }
      ${ui.inspectMessage ? `<p class="hint">${ui.inspectMessage}</p>` : ""}
      ${readyAction}
      ${ui.inspectMode === "forge" ? forgeHtml(state, ui) : ""}
      <h4 class="inspect-heading">已经发现问题</h4>
      <ul class="facts">${
        facts.length || truth.length
          ? [
              ...facts.map((fact) => `<li>${fact.label}：${fact.value}</li>`),
              ...truth.map(
                (field) => `<li class="${field.tone}">${field.label}：${field.value}</li>`
              )
            ].join("")
          : "<li>还没有确认任何问题</li>"
      }</ul>
      <h4 class="inspect-heading">万物通参考</h4>
      <ul class="facts">
        <li>参考售价 ¥${ref.min} - ¥${ref.max}</li>
        <li>当前趋势 ${state.trend.name}</li>
        <li>标签标注年代 ${ensureTruth(item).labelYear} 年</li>
      </ul>
    </div>
  `;
}

function paintTools(state, ui) {
  const item = currentItem(state, ui);
  const inspection = item ? ensureInspection(item) : null;
  const inInspect = ui.sheet === "inspect";
  TOOL_LAYERS.forEach((name) => {
    const tool = TOOLS.find((entry) => entry.layer === name);
    if (!tool) {
      return;
    }
    let usable = false;
    if (inInspect) {
      if (tool.id === "done") {
        usable = true;
      } else if (tool.id === "forge") {
        usable = Boolean(item) && inspection.completed && !item.contraband;
      } else if (tool.id === "circuit") {
        usable = Boolean(item) && inspection.operations.includes("circuit");
      } else {
        // 清洁和放大镜每件物品都有，必定显示。
        usable = true;
      }
    }
    setHidden("shop", name, !usable);
    setActive("shop", name, ui.inspectMode === tool.id);
    setAttr("shop", name, "tool", tool.id);
  });
}

function paintSheet(state, ui) {
  const scene = "shop";
  Object.keys(SHEET_LAYERS).forEach((key) => {
    const on = key === ui.sheet;
    SHEET_LAYERS[key].forEach((name) => {
      if (key === "inspect" && TOOL_LAYERS.includes(name)) {
        return;
      }
      setHidden(scene, name, !on);
    });
  });
  // 商城索引栏只跟着商城页面出现，点它切到万物通检索页。
  setHidden(scene, "商城索引栏", ui.sheet !== "mall");

  if (ui.sheet === "detail") {
    setPanel(scene, "物品详情窗口", detailHtml(state, ui));
  } else if (ui.sheet === "record") {
    setPanel(scene, "物品信息窗口", inspectionRecordHtml(state, currentItem(state, ui)));
  } else if (ui.sheet === "listing") {
    setPanel(scene, "出售页面", listingHtml(state, ui));
  } else if (ui.sheet === "mall") {
    setPanel(scene, "商城页面", mallHtml(state));
  } else if (ui.sheet === "notebook") {
    paintNotebook(state, ui);
  } else if (ui.sheet === "universal") {
    setPanel(scene, "万物通页面", universalHtml(state, ui));
    setPanel(scene, "搜索_搜索框", searchBoxHtml(ui));
  } else if (ui.sheet === "calendar") {
    setPanel(scene, "日历展开", calendarHtml(state));
  } else if (ui.sheet === "keepsake") {
    setPanel(scene, "收纳盒窗口", keepsakeHtml(state, ui));
  } else if (ui.sheet === "keepsakeAsk") {
    setPanel(scene, "收纳盒确认", keepsakeAskHtml(state, ui));
  } else if (ui.sheet === "inspect") {
    const item = currentItem(state, ui);
    setPanel(scene, "物品视图", item ? inspectStage(item, ui) : "<p>没有选中物品。</p>");
    setPanel(scene, "操作区", inspectHtml(state, ui));
    setPanel(scene, "工具带", "");
    applyInspectHint(state, ui, item);
  }
  // 工具层无论弹层是否打开都要刷新，否则关闭检视台后会残留。
  paintTools(state, ui);

  const dim = Boolean(ui.sheet);
  SHOP_CONTENT_LAYERS.forEach((name) => {
    const el = layer(scene, name);
    if (el) {
      el.classList.toggle("is-dimmed", dim);
    }
  });
}

// 检视台里标出下一步该点的按键，避免玩家不知道先做什么。
function applyInspectHint(state, ui, item) {
  const active = document.querySelector(".scene.is-active");
  if (!active) {
    return;
  }
  active.querySelectorAll(".is-hint").forEach((node) => node.classList.remove("is-hint"));
  if (!item) {
    return;
  }
  // 伪造模式下提示要指向伪造相关控件，而不是完成检视。
  if (ui.inspectMode === "forge") {
    const hasMaterial = Object.values(state.fakeStock || {}).some((count) => count > 0);
    if (!hasMaterial) {
      return;
    }
    if (!ui.forge || !ui.forge.materialId) {
      active
        .querySelectorAll('[data-role="pickForgeMaterial"]')
        .forEach((node) => node.classList.add("is-hint"));
      return;
    }
    if (!ui.forge.targetId) {
      active
        .querySelectorAll('[data-role="pickForgeTarget"]')
        .forEach((node) => node.classList.add("is-hint"));
      return;
    }
    return;
  }
  const inspection = ensureInspection(item);
  const pending = inspection.operations.find((id) => !inspection.results[id]);
  let selector = null;
  if (!pending) {
    selector = '[data-tool="done"]';
  } else if (pending === "clean") {
    selector = inspection.clean.patches.every((patch) => patch.progress >= 1)
      ? '[data-role="finishOp"]'
      : '[data-tool="clean"]';
  } else if (pending === "magnifier") {
    selector = inspection.magnifier.spots.every((spot) => spot.found)
      ? '[data-role="finishOp"]'
      : '[data-tool="magnifier"]';
  } else if (pending === "circuit") {
    const circuit = inspection.circuit;
    if (circuit.screws.some(Boolean)) {
      selector = '[data-role="screw"]';
    } else if (!circuit.coverOpen) {
      selector = '[data-role="cover"]';
    } else if (circuit.dirt && circuit.dirt.progress < 1) {
      selector = "[data-circuit-dirt]";
    } else if (
      circuit.parts.some(
        (part) => part.needsRemoval && !part.reinstalled && !part.broken
      )
    ) {
      selector = '[data-role="part"], [data-role="mountedPart"]';
    } else {
      selector = '[data-role="power"]';
    }
  }
  if (!selector) {
    return;
  }
  active.querySelectorAll(selector).forEach((node) => node.classList.add("is-hint"));
}

// 记事本：三个书签对应三页，每页内容分写左右两张书页。
// 书签只显示当前页的选中态，其余保持收起态。
const NOTEBOOK_BOOKMARKS = {
  story: ["书签_买家故事_收起", "书签_买家故事_选中"],
  book: ["书签_图鉴_收起", "书签_图鉴_选中"],
  upgrade: ["书签_店铺升级_收起", "书签_店铺升级_选中"]
};

function paintNotebook(state, ui) {
  const scene = "shop";
  const tab = ui.notebookTab || "story";
  Object.entries(NOTEBOOK_BOOKMARKS).forEach(([key, [idle, on]]) => {
    setHidden(scene, idle, key === tab);
    setHidden(scene, on, key !== tab);
  });
  // 三角标只在买家故事页亮着，用来翻到下一位买家。
  setHidden(scene, "记事本_三角标", tab !== "story");

  if (tab === "book") {
    setPanel(scene, "记事本_左页", itemCompendiumHtml(state));
    setPanel(scene, "记事本_右页", boxCompendiumHtml(state));
  } else if (tab === "upgrade") {
    setPanel(scene, "记事本_左页", upgradeLevelsHtml(state));
    setPanel(scene, "记事本_右页", upgradeActionHtml(state));
  } else {
    setPanel(scene, "记事本_左页", storyLeftHtml(state, ui));
    setPanel(scene, "记事本_右页", storyRightHtml(state, ui));
  }
}

function currentStory(ui) {
  const storyId = ui.storyId || STORIES[0].id;
  return STORIES.find((entry) => entry.id === storyId) || STORIES[0];
}

// 左页：买家相片在上，买家信息写在相片下方。
function storyLeftHtml(state, ui) {
  const story = currentStory(ui);
  const progress = storyProgress(state, story.id);
  // 相片文件名按买家名字命名：美术/2.0/shop/买家相片_<买家>.png
  const photo = `./美术/2.0/shop/${encodeURIComponent(`买家相片_${story.buyer}`)}.png`;
  return `
    <div class="nb-left">
      <span class="nb-photo" style="background-image:url('${photo}')"></span>
      <h4>${story.buyer}</h4>
      <p>${story.title}</p>
      <p>${story.theme}</p>
      <p>进度 ${progress.found}/${progress.total}${
        progress.connected ? " · 故事可以继续追查" : ""
      }</p>
    </div>`;
}

// 右页：收集到的关键词和这个买家的查询结果。
function storyRightHtml(state, ui) {
  const book = ensureNotebook(state);
  const story = currentStory(ui);
  const query = ui.query || [];
  const keywords = story.keywords
    .map((keyword) => {
      const known = book.keywords.includes(keyword);
      const picked = query.includes(keyword);
      return `<button class="chip-btn${picked ? " on" : ""}" data-role="nbKeyword" data-keyword="${keyword}" ${
        known ? "" : "disabled"
      }>${known ? keyword : "？？？"}</button>`;
    })
    .join("");
  const results = book.results
    .filter((entry) => entry.storyId === story.id)
    .map(
      (entry) =>
        `<li class="note-result"><b>${entry.type}</b><p>${entry.text}</p></li>`
    )
    .join("");
  return `
    <div class="nb-right">
      <h4>关键词（选 1 到 3 个）</h4>
      <div class="chips">${keywords}</div>
      <div class="nb-actions">
        <button class="btn primary" data-role="nbSearch" ${query.length ? "" : "disabled"}>用万物通查询</button>
        <button class="btn" data-role="nbClear">清空选择</button>
      </div>
      <p class="meta">已收集词条 ${book.keywords.length} 个，来自检视台和买家对话。</p>
      <h4>查询结果</h4>
      <ul class="facts nb-scroll">${results || "<li>还没有查询记录</li>"}</ul>
    </div>`;
}

// 图鉴用图：物品走 美术/物品2.0（线索/非线索两个文件夹），箱子走 美术/2.0/compendium。
// 没见过的条目只显示剪影，箱子格不写任何文字。
function compendiumArt(background, fallback, seen) {
  return `<span class="compendium-art${
    seen ? "" : " is-silhouette"
  }" style="background-image:${background}${
    fallback ? `,url('${fallback}')` : ""
  }"></span>`;
}

// 图鉴：左页摆物品图鉴，右页摆箱子图鉴。
function itemCompendiumHtml(state) {
  const book = ensureCompendium(state);
  const summary = compendiumSummary(state);
  // 物品图鉴：只显示物品图和成交次数。
  const items = ITEM_TEMPLATES.map((template) => {
    const record = book.items[template.id];
    const seen = Boolean(record && record.seen > 0);
    return `<span class="compendium-item">
      ${compendiumArt(
        itemArtBackground({
          name: template.name,
          templateId: template.id
        }),
        "",
        seen
      )}
      <b>${template.name}</b>
      <span class="compendium-count">成交 ${(record && record.sold) || 0} 次</span>
    </span>`;
  }).join("");
  return `
    <div class="nb-page">
      <h4>物品图鉴</h4>
      <p class="meta">已见 ${summary.items} 种 · 已核实 ${summary.itemsVerified} 种</p>
      <div class="compendium-items nb-scroll">${items}</div>
    </div>`;
}

function boxCompendiumHtml(state) {
  const book = ensureCompendium(state);
  const summary = compendiumSummary(state);
  // 箱子图鉴：每个来源一格，见过同来源的箱子就不再是剪影。
  const seenOrigins = new Set(
    Object.keys(book.boxes).map((key) => key.split("-")[0])
  );
  const boxes = (ITEM_COMPOSITION_POOLS.origins || [])
    .map((origin) =>
      compendiumArt(
        `url('./美术/2.0/compendium/箱子_${origin.id}.png')`,
        "./美术/2.0/auction/当前箱子.png",
        seenOrigins.has(origin.id)
      )
    )
    .join("");
  const buyers = STAGE_TWO_DATA.buyerProfiles.length;
  return `
    <div class="nb-page">
      <h4>箱子图鉴</h4>
      <p class="meta">已见 ${summary.boxes} 种 · 买家 ${summary.buyersMet} / ${buyers}</p>
      <div class="compendium-boxes nb-scroll">${boxes}</div>
      ${
        book.decor.length
          ? `<p class="meta">全收集摆件：${book.decor.join("、")}（只作装饰，不提供经济收益）</p>`
          : ""
      }
    </div>`;
}

// 店铺升级：左页列三级店铺，右页写升级条件和操作。
function upgradeLevelsHtml(state) {
  const rows = LEVELS.map((entry) => {
    const current = entry.level === state.shopLevel;
    return `<li class="level-row${current ? " current" : ""}">
      <b>${entry.level} 级 ${entry.name}</b>
      <p class="meta">${entry.change}</p>
      <p class="meta">效果：${entry.effect}${entry.price ? ` · 装修费 ¥${entry.price}` : ""}</p>
      ${current ? '<p class="hint">当前等级</p>' : ""}
    </li>`;
  }).join("");
  return `
    <div class="nb-page">
      <h4>店铺等级</h4>
      <ul class="level-list nb-scroll">${rows}</ul>
    </div>`;
}

function upgradeActionHtml(state) {
  const next = nextLevel(state);
  const gate = unlockedFor(state);
  return `
    <div class="nb-page">
      <h4>店铺升级</h4>
      <p class="meta">余额 ¥${state.cash}</p>
      <p class="meta">${gate.reason}</p>
      <div class="nb-actions">
        <button class="btn primary" data-role="doUpgrade" ${
          next && gate.unlocked ? "" : "disabled"
        }>${next ? `升级到「${next.name}」 ¥${next.price}` : "已是最高等级"}</button>
      </div>
    </div>`;
}

// 万物通检索结果窗口，样式参考电脑上的搜索页。
function universalHtml(state, ui) {
  const book = ensureNotebook(state);
  const results = book.results.slice().reverse();
  const cards = results
    .map(
      (entry) => `
      <li class="univ-card">
        <span class="univ-type">${entry.type}</span>
        <p>${entry.text}</p>
        <span class="univ-keys">${(entry.keywords || []).join(" + ")}</span>
      </li>`
    )
    .join("");
  return `
    <div class="univ-bar">
      <b>万物通</b>
      <span>公开资料检索 · 新闻 / 档案 / 帖子 / 矛盾记录</span>
    </div>
    <div class="univ-results">
      <ul class="univ-list">${cards || '<li class="univ-card"><p>暂时没有检索记录。</p></li>'}</ul>
      <p class="meta">查询结果自动保留，可以回到记事本继续组合词条。</p>
    </div>
  `;
}

// 搜索框里的当前词条，写在搜索窗口的输入框上。
function searchBoxHtml(ui) {
  const query = ui.universalQuery || [];
  return `<span class="univ-input">${
    query.length ? query.join(" + ") : "还没有选择关键词"
  }</span>`;
}

function paintShop(state, ui) {
  const scene = "shop";
  paintStatus(scene, state);
  paintShelf(state);
  paintWindow(state);
  paintDesk(state);
  paintBuyer(state);
  paintSheet(state, ui);
  setLabel(scene, "营业牌", "营业中 · 结束本日");
}

export function paint(sceneName, state, ui) {
  if (sceneName === "start") {
    paintStart(state);
  } else if (sceneName === "auction") {
    paintAuction(state, ui);
  } else if (sceneName === "disposal") {
    paintDisposal(state, ui);
  } else if (sceneName === "disposal_open") {
    paintOnsite(state, ui);
  } else if (sceneName === "shop") {
    paintShop(state, ui);
  }
  // 状态栏在三个界面都刷新，保证切换时不跳位。
  ["auction", "disposal", "disposal_open", "shop"].forEach((name) => {
    if (name !== sceneName && cache.has(name)) {
      paintStatus(name, state);
    }
  });
}

export function resetResalePreview() {
  lastQuoteKey = null;
  lastQuoteValue = 0;
}
