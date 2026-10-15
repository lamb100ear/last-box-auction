// 店铺操作：开箱、自留、伪造、违禁品。

import { capacityOf } from "./state.js";
import { round10 } from "./boxes.js";
import { coverTruth, coversOf, ensureInspection, qualityFactor } from "./inspect.js";
import { materialById } from "./mall.js";

// 自留走藏品系统：只有带属性的藏品能进收纳盒。
export { keepItem } from "./keepsake.js";

export function openBox(state, boxId) {
  const box = state.shelfBoxes.find((entry) => entry.id === boxId);
  if (!box) {
    return { ok: false, text: "没有找到这只箱子。" };
  }
  if (box.opened) {
    return { ok: false, text: "这只箱子已经打开过了。" };
  }
  const capacity = capacityOf(state);
  const free = capacity.itemSlots - state.inventory.length;
  if (free < box.items.length) {
    return {
      ok: false,
      text: `货架容量不足，需要 ${box.items.length} 格，当前剩 ${Math.max(0, free)} 格。`
    };
  }
  const total = box.items.reduce((sum, item) => sum + item.value, 0) || 1;
  box.items.forEach((item) => {
    state.inventory.push(
      Object.assign({}, item, {
        acquisitionCost: Math.round((item.value / total) * (box.price || 0)),
        carriedDay: state.day
      })
    );
  });
  box.opened = true;
  state.shelfBoxes = state.shelfBoxes.filter((entry) => entry.id !== boxId);
  // 箱子里有违禁品时，玩家自己也知道风险，麻烦值 +1。
  const contraband = box.items.filter((item) => item.contraband).length;
  if (contraband > 0) {
    state.trouble = Math.min(10, state.trouble + 1);
  }
  return {
    ok: true,
    text: `箱子里有 ${box.items.length} 件物品，已经放进上层物品格。${
      contraband > 0 ? "里面有违禁品，麻烦值 +1。" : ""
    }`
  };
}

// 收纳盒里每个藏品给同类物品 2% 售价加成；标签属性另算。
export function keepsakeBonus(state, category) {
  const count = state.keepsakes.filter((item) => item.category === category).length;
  return 1 + count * 0.02;
}

export function applyForgery(state, itemId, materialId, targetId, quality) {
  const item = state.inventory.find((entry) => entry.uid === itemId);
  const material = materialById(materialId);
  if (!item || !material) {
    return { ok: false, text: "没有找到物品或材料。" };
  }
  if (!ensureInspection(item).completed) {
    return { ok: false, text: "检视没有完成，不能使用伪造物。" };
  }
  if ((state.fakeStock[materialId] || 0) <= 0) {
    return { ok: false, text: `${material.name}数量不足。` };
  }
  const factor = qualityFactor(quality);
  const covers = coversOf(materialId);
  state.fakeStock[materialId] -= 1;
  item.forgery = {
    materialId,
    targetId,
    quality,
    lift: material.priceMultiplier * factor.lift,
    exposure: material.exposureChance * factor.exposure,
    covers: covers.slice(),
    detected: false
  };
  covers.forEach((key) => coverTruth(item, key, materialId));
  return {
    ok: true,
    text: `伪造完成，评价${quality === "perfect" ? "完美" : quality === "rough" ? "粗糙" : "合格"}。` +
      `报价上限 +${Math.round((item.forgery.lift - 1) * 100)}%，` +
      `曝光风险 ${Math.round(item.forgery.exposure * 100)}%。`
  };
}

export function greyValue(item) {
  return round10(item.value * 2.2);
}

export function sellContraband(state, itemId) {
  const item = state.inventory.find((entry) => entry.uid === itemId);
  if (!item || !item.contraband) {
    return { ok: false, text: "这件物品不能走灰色渠道。" };
  }
  const index = state.contrabandSales;
  const depositRate = Math.max(0.3, 0.5 - index * 0.05);
  const grey = greyValue(item);
  const cap = Math.min(grey, state.totalDebt > 0 ? state.totalDebt * 0.12 : 2500, 2500);
  const net = Math.min(grey * 0.83, cap);
  const deposit = round10(net * depositRate);
  const balance = Math.max(0, round10(net - deposit));

  state.cash += deposit;
  state.contrabandSales += 1;
  state.contrabandAttention += index + 1;
  state.pendingPayouts.push({
    amount: balance,
    dueDay: state.day + 2,
    order: state.contrabandSales,
    itemName: item.name
  });
  state.inventory = state.inventory.filter((entry) => entry.uid !== itemId);
  state.ledger.contraband += deposit;

  return {
    ok: true,
    text: `灰色渠道先付定金 ¥${deposit}，尾款 ¥${balance} 两天后到账。关注度上升到 ${state.contrabandAttention}。`
  };
}

export function reportContraband(state, itemId) {
  const item = state.inventory.find((entry) => entry.uid === itemId);
  if (!item || !item.contraband) {
    return { ok: false, text: "这件物品不需要上报。" };
  }
  const chance = Math.min(0.65, 0.12 + state.reportMisses * 0.08 + state.officialRelation * 0.05);
  const hit = Math.random() < chance;
  state.reportMisses = hit ? 0 : state.reportMisses + 1;
  state.officialRelation = Math.min(5, state.officialRelation + 1);
  state.reputation = Math.min(100, state.reputation + 2);
  state.trouble = Math.max(0, state.trouble - 1);
  const reward = hit ? round10(600 + Math.random() * 1600) : 0;
  state.cash += reward;
  state.ledger.report += reward;
  state.inventory = state.inventory.filter((entry) => entry.uid !== itemId);
  return {
    ok: true,
    text: hit
      ? `上报成功，专项奖励 ¥${reward}，官方关系提升到 ${state.officialRelation}。`
      : "上报完成，本次没有触发专项奖励，官方关系仍然提升。"
  };
}
