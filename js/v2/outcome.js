// 拍卖后处置：原封转卖、现场开箱、带回家。

import { capacityOf } from "./state.js";
import { dominantCategory } from "./boxes.js";
import { keepsakeModifiers } from "./keepsake.js";

const CATEGORY_ONSITE = {
  junk: [0.35, 0.7],
  common: [0.55, 0.95],
  luxury: [0.72, 1.32],
  special: [0.6, 1.1],
  contraband: [0, 0]
};

function trendLift(state, category) {
  return (state.trend && state.trend.lift[category]) || 1;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function round10(value) {
  return Math.round(value / 10) * 10;
}

// 原封转卖：不读取箱内真实价值，报价可以低于成交价。
export function resaleQuote(state, lot) {
  const mid = (lot.estimate.min + lot.estimate.max) / 2;
  const lift = trendLift(state, dominantCategory(lot.items));
  const keepsakeLift = keepsakeModifiers(state).resaleLift;
  return Math.max(0, round10(mid * rand(0.75, 1.05) * lift * keepsakeLift));
}

// 现场开箱：逐件生成现场报价，违禁品无人收购。
export function buildOnsiteOffers(state, lot) {
  const keepsakeLift = keepsakeModifiers(state).onsiteLift;
  return lot.items.map((item) => {
    const range = CATEGORY_ONSITE[item.category] || [0.55, 0.95];
    const lift = trendLift(state, item.category);
    const price = Math.max(
      0,
      round10(item.value * rand(range[0], range[1]) * rand(0.9, 1.1) * lift * keepsakeLift)
    );
    return {
      uid: item.uid,
      name: item.name,
      category: item.category,
      price,
      sellable: price > 0,
      risky: item.category === "special" || item.category === "luxury"
    };
  });
}

export function onsiteTotal(offers) {
  return offers.reduce((sum, offer) => sum + offer.price, 0);
}

// 现场开箱在买家面前进行：奢侈品和违禁品会被当场看见，麻烦值上升。
// 奢侈品每件 +1，单箱最多 +2；违禁品每件 +2。
export function recordOnsiteOpen(state, lot) {
  const luxury = lot.items.filter((item) => item.category === "luxury").length;
  const contraband = lot.items.filter((item) => item.contraband).length;
  const trouble = Math.min(2, luxury) + contraband * 2;
  if (trouble > 0) {
    state.trouble = Math.min(10, state.trouble + trouble);
  }
  return { trouble, luxury, contraband };
}

function splitCost(lot) {
  const total = lot.items.reduce((sum, item) => sum + item.value, 0) || 1;
  return lot.items.map((item) =>
    Object.assign({}, item, {
      acquisitionCost: Math.round((item.value / total) * lot.price)
    })
  );
}

export function settleResale(state, lot, quote) {
  state.cash += quote;
  state.ledger.resale += quote;
  state.stats_resale = (state.stats_resale || 0) + 1;
  const profit = quote - lot.price;
  return {
    route: "resale",
    income: quote,
    cost: lot.price,
    profit,
    text: profit >= 0 ? `原封转卖成交，本次盈利 ¥${profit}` : `原封转卖成交，本次亏损 ¥${-profit}`
  };
}

export function settleOnsiteSell(state, lot, offers) {
  const income = onsiteTotal(offers);
  state.cash += income;
  state.ledger.onsite += income;
  const profit = income - lot.price;
  return {
    route: "onsite_sell",
    income,
    cost: lot.price,
    profit,
    text: income > 0 ? `现场全部卖出，本次盈利 ¥${profit}` : "现场无人出价，物品原样带回"
  };
}

export function itemsCapacity(state) {
  const capacity = capacityOf(state);
  return { capacity, free: capacity.itemSlots - state.inventory.length };
}

export function boxesCapacity(state) {
  const capacity = capacityOf(state);
  return { capacity, free: capacity.boxSlots - state.shelfBoxes.length };
}

export function carryHomeBox(state, lot) {
  const room = boxesCapacity(state);
  if (room.free < 1) {
    return { ok: false, reason: "NO_BOX_SLOT" };
  }
  state.shelfBoxes.push(
    Object.assign({}, lot, { opened: false, carriedDay: state.day, price: lot.price })
  );
  state.ledger.home += 1;
  return { ok: true, text: "箱子已放进货架下层，回到店铺后可以打开。" };
}

export function carryHomeItems(state, lot, offers, keepAll = false) {
  const room = itemsCapacity(state);
  const chosen = keepAll
    ? offers.slice()
    : offers.filter((offer) => offer.sellable);
  if (room.free < chosen.length) {
    return { ok: false, reason: "NO_ITEM_SLOT" };
  }
  const costed = splitCost(lot);
  chosen.forEach((offer) => {
    const source = costed.find((item) => item.uid === offer.uid);
    state.inventory.push({
      uid: source.uid,
      templateId: source.templateId,
      name: source.name,
      category: source.category,
      baseValue: source.baseValue,
      value: source.value,
      condition: source.condition,
      appearance: source.appearance,
      label: source.label,
      code: source.code,
      acquisitionCost: source.acquisitionCost,
      inspected: false,
      traitId: source.traitId || null,
      carriedDay: state.day
    });
  });
  state.ledger.home += 1;
  return { ok: true, count: chosen.length, text: `${chosen.length} 件物品已进入货架上层。` };
}
