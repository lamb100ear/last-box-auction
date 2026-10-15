// 每日箱子生成与公开估值。
// 复用 1.0 的物品组合池与模板，公开信息只给自然信息和一个估值区间。

import {
  AUCTION_BOX_GENERATION as GEN,
  ITEM_COMPOSITION_POOLS as POOLS,
  ITEM_TEMPLATES
} from "../data.js";
import { rand, randInt, round10 } from "./util.js";
import { chooseOperations, ensureInspection, ensureTruth } from "./inspect.js";
import { STORIES } from "./notebook.js";
import { ITEM_TRAITS } from "./keepsake.js";
import { CLUE_ITEMS } from "./storydata.js";

export { rand, randInt, round10 } from "./util.js";

export const COMPETITION = {
  low: { count: [2, 3], budget: [1.2, 1.8], name: "低级场次" },
  medium: { count: [2, 4], budget: [1.5, 2.5], name: "中级场次" },
  high: { count: [3, 4], budget: [1.8, 3.5], name: "高级场次" }
};

// 场次等级：低级永久开放，中级第 4 天或店铺 2 级，高级第 11 天或店铺 3 级。
export function levelFor(state) {
  if (state.shopLevel >= 3 || state.day >= 11) {
    return "high";
  }
  if (state.shopLevel >= 2 || state.day >= 4) {
    return "medium";
  }
  return "low";
}

export function tierOf(level) {
  return GEN.tiers.find((tier) => tier.id === level) || GEN.tiers[0];
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickWeighted(list, filter) {
  const pool = filter ? list.filter(filter) : list.slice();
  const source = pool.length ? pool : list;
  const total = source.reduce((sum, entry) => sum + (entry.weight || 1), 0);
  let roll = Math.random() * total;
  for (const entry of source) {
    roll -= entry.weight || 1;
    if (roll <= 0) {
      return entry;
    }
  }
  return source[source.length - 1];
}

const BATCH_LETTERS = "ABCDEFGHJKLMNPRSTW";

// 目前物品池里可以合法存在、但系统按违禁品处理的模板。
const CONTRABAND_TEMPLATES = new Set(["medicine_case", "anonymous_records"]);

// 线索物品的抽取规则：核心物品先去，再线索一、线索二；每件只会出现一次。
const CLUE_RULES = {
  core: { chance: 0.1, soft: 8, step: 0.04, hard: 12 },
  clue1: { chance: 0.08, soft: 6, step: 0.04, hard: 12 },
  clue2: { chance: 0.06, soft: 10, step: 0.03, hard: 16 }
};

// 同时最多推进两位买家故事。
const MAX_ACTIVE_STORIES = 2;

function storyIdOfName(name) {
  const story = STORIES.find((entry) => entry.buyer === name || entry.title === name);
  return story ? story.id : null;
}

function clueItemsOfStory(storyId) {
  const story = STORIES.find((entry) => entry.id === storyId);
  const buyerName = story ? story.buyer : null;
  return {
    core: CLUE_ITEMS.find((item) => item.buyer === buyerName && item.type === "core"),
    clue1: CLUE_ITEMS.find((item) => item.buyer === buyerName && item.type === "clue1"),
    clue2: CLUE_ITEMS.find((item) => item.buyer === buyerName && item.type === "clue2")
  };
}

// 当前每位买家还缺哪一件线索物品。
function pendingClue(state, storyId) {
  const seen = state.clueSeen || {};
  const owned = (state.ownedClues = state.ownedClues || {});
  const items = clueItemsOfStory(storyId);
  for (const type of ["core", "clue1", "clue2"]) {
    const item = items[type];
    if (!item) {
      continue;
    }
    // 故事未激活时先出核心物品，之后按顺序推进；已经拿到过的不再出现。
    if (owned[item.id] || seen[item.id]) {
      continue;
    }
    if (type === "core" || owned[items.core.id]) {
      return { item, type };
    }
  }
  return null;
}

function activeStories(state) {
  const unlocked = state.storyUnlocked || {};
  const paused = state.storyPaused || {};
  // 特殊会话里选择「故事暂停」的买家，过几天才会继续推进线索。
  const list = STORIES.filter(
    (story) => unlocked[story.id] && !(paused[story.id] && state.day < paused[story.id])
  );
  // 没有激活的故事时，从第一位买家开始。
  return list.length ? list.slice(0, MAX_ACTIVE_STORIES) : [STORIES[0]];
}

function buildClueEntry(state, def, index) {
  const condition = pickWeighted(POOLS.conditions, (entry) => entry.id === "long_stored") ||
    POOLS.conditions[0];
  const appearance = pickWeighted(POOLS.appearances, (entry) => entry.id === "worn") ||
    POOLS.appearances[0];
  const label = pickWeighted(POOLS.labels, (entry) => !entry.categories);
  const entry = {
    uid: `${def.id}-${index}-${Math.floor(Math.random() * 100000)}`,
    templateId: def.id,
    name: def.name,
    category: def.category,
    baseValue: def.baseValue,
    value: def.baseValue,
    condition: { id: condition.id, label: condition.label },
    appearance: { id: appearance.id, label: appearance.label },
    label: { id: label.id, label: label.label },
    originId: "auction_return",
    originLabel: "拍卖退货",
    code: `${def.name.slice(0, 1)}-${randInt(10, 99)}${BATCH_LETTERS[randInt(0, BATCH_LETTERS.length - 1)]}`,
    contraband: false,
    facts: null,
    inspection: null,
    operations: def.operations.slice(),
    truth: null,
    forgery: null,
    inspected: false,
    traitId: null,
    storyId: storyIdOfName(def.buyer),
    clueType: def.type,
    storyKeywords: def.keywords.slice(),
    clue: true
  };
  ensureTruth(entry);
  ensureInspection(entry);
  state.clueSeen = state.clueSeen || {};
  state.clueSeen[def.id] = true;
  return entry;
}

function batchLabel() {
  return `${BATCH_LETTERS[randInt(0, BATCH_LETTERS.length - 1)]}-${randInt(100, 899)}`;
}

function itemCode(template) {
  const prefix = template.name.slice(0, 1);
  return `${prefix}-${randInt(10, 99)}${BATCH_LETTERS[randInt(0, BATCH_LETTERS.length - 1)]}`;
}

function buildItems(tier, origin) {
  const categories = origin.categories || ["junk", "common", "luxury", "special"];
  const templates = ITEM_TEMPLATES.filter((item) => categories.includes(item.category));
  const pool = templates.length ? templates : ITEM_TEMPLATES;
  const count = randInt(tier.itemCount[0], tier.itemCount[1]);
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const template = pick(pool);
    const appearance = pickWeighted(POOLS.appearances);
    const condition = pickWeighted(
      POOLS.conditions,
      (entry) => !appearance.allowedConditions || appearance.allowedConditions.includes(entry.id)
    );
    const label = pickWeighted(
      POOLS.labels,
      (entry) => !entry.categories || entry.categories.includes(template.category)
    );
    const value = Math.max(
      10,
      Math.round(
        template.baseValue *
          condition.valueMultiplier *
          appearance.valueMultiplier *
          origin.valueMultiplier
      )
    );

    const entry = {
      uid: `${template.id}-${index}-${Math.floor(Math.random() * 100000)}`,
      templateId: template.id,
      name: template.name,
      category: template.category,
      baseValue: template.baseValue,
      value,
      condition: { id: condition.id, label: condition.label },
      appearance: { id: appearance.id, label: appearance.label },
      label: { id: label.id, label: label.label },
      originId: origin.id,
      originLabel: origin.label,
      code: itemCode(template),
      contraband: CONTRABAND_TEMPLATES.has(template.id) && Math.random() < 0.45,
      facts: null,
      inspection: null,
      operations: null,
      truth: null,
      forgery: null,
      inspected: false,
      // 带属性的模板会生成藏品，属性标签决定它在自留还是售出时生效。
      traitId: ITEM_TRAITS[template.id] || null
    };
    // 真实信息与常规操作在生成时确定，写进存档后不再变化。
    ensureTruth(entry);
    entry.operations = chooseOperations(entry);
    ensureInspection(entry);
    items.push(entry);
  }

  return items;
}

function totalValue(items) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

function weightBonus(weightKg) {
  if (weightKg < 8) {
    return rand(0, 20);
  }
  if (weightKg < 15) {
    return 40;
  }
  if (weightKg < 22) {
    return 80;
  }
  if (weightKg < 30) {
    return 140;
  }
  return 200;
}

function storageBonus(days) {
  if (days <= 30) {
    return 20;
  }
  if (days <= 90) {
    return 0;
  }
  if (days <= 180) {
    return rand(-20, 20);
  }
  if (days <= 365) {
    return rand(-30, 60);
  }
  return rand(-40, 100);
}

const SEAL_BONUS = { intact: 50, worn: 10, replaced: -30, broken: -60, missing: -90 };
const APPEARANCE_BONUS = {
  complete: 40,
  worn: -20,
  torn: -60,
  lock_damaged: -80,
  odor: -70,
  unclaimed_long: 30,
  relabeled: -50
};

function confidenceOf(lot) {
  const cleanSeal = lot.seal.id === "intact" || lot.seal.id === "worn";
  const cleanBody = lot.appearance.id === "complete" || lot.appearance.id === "worn";
  if (cleanSeal && cleanBody && lot.storageDays <= 90) {
    return "高";
  }
  if (lot.seal.id === "missing" || lot.seal.id === "broken") {
    return "低";
  }
  if (!cleanSeal || !cleanBody) {
    return "低";
  }
  return "中";
}

export function estimateOf(state, lot) {
  const dominant = dominantCategory(lot.items);
  const trendLift = (state.trend && state.trend.lift[dominant]) || 1;
  const mid =
    lot.realValue * trendLift +
    weightBonus(lot.weightKg) +
    storageBonus(lot.storageDays) +
    (SEAL_BONUS[lot.seal.id] || 0) +
    (APPEARANCE_BONUS[lot.appearance.id] || 0) +
    rand(0, 60);

  const positive = [];
  const risk = [];

  if (lot.seal.id === "intact") positive.push("封条完整");
  if (lot.appearance.id === "complete") positive.push("箱体完整");
  if (lot.appearance.id === "unclaimed_long") positive.push("长期无人认领");
  if (lot.storageDays > 365) positive.push("寄存超过一年");
  if (trendLift > 1) positive.push(`${state.trend.name}带动该品类`);

  if (lot.seal.id === "replaced") risk.push("封条与箱体年代不一致");
  if (lot.seal.id === "broken" || lot.seal.id === "missing") risk.push("箱子可能被打开过");
  if (lot.appearance.id === "torn") risk.push("箱体撕裂，可能受潮缺件");
  if (lot.appearance.id === "lock_damaged") risk.push("锁具被撬过");
  if (lot.appearance.id === "odor") risk.push("有明显异味");
  if (lot.appearance.id === "relabeled") risk.push("标签重贴，来源可能矛盾");
  if (lot.origin.id === "anonymous_consignment") risk.push("匿名托运，来源难以核对");
  if (trendLift < 1) risk.push(`${state.trend.name}压低该品类`);

  return {
    min: round10(mid * 0.85),
    max: round10(mid * 1.15),
    confidence: confidenceOf(lot),
    positiveFactors: positive.slice(0, 4),
    riskFactors: risk.slice(0, 4)
  };
}

export function dominantCategory(items) {
  const tally = {};
  items.forEach((item) => {
    tally[item.category] = (tally[item.category] || 0) + item.value;
  });
  let best = "common";
  let bestValue = -1;
  Object.keys(tally).forEach((key) => {
    if (tally[key] > bestValue) {
      best = key;
      bestValue = tally[key];
    }
  });
  return best;
}

function buildLot(state, tier, index) {
  const origin = pickWeighted(
    POOLS.origins,
    (entry) => entry.categories && entry.categories.includes(dominantCategoryOfTier(tier))
  );
  const size = pick(GEN.sizes);
  const weightKg = Math.max(2, Math.round((size.weight + rand(-3, 4)) * 10) / 10);
  const seal = pickWeighted(GEN.seals);
  const appearance = pickWeighted(GEN.appearances);
  const storageDays = Math.round(rand(5, 520));

  let items = buildItems(tier, origin);
  let value = totalValue(items);
  let attempts = 0;
  while ((value < tier.valueRange[0] || value > tier.valueRange[1]) && attempts < 40) {
    items = buildItems(tier, origin);
    value = totalValue(items);
    attempts += 1;
  }

  const startPrice = Math.min(
    Math.max(round10(value * rand(0.35, 0.55)), tier.minPrice),
    tier.maxPrice
  );
  const competition = COMPETITION[tier.id] || COMPETITION.low;
  const count = randInt(competition.count[0], competition.count[1]);
  const pool = GEN.competitors.slice();
  const competitors = [];
  for (let slot = 0; slot < count && pool.length; slot += 1) {
    const picked = pool.splice(randInt(0, pool.length - 1), 1)[0];
    competitors.push({
      id: picked.id,
      name: picked.name,
      aggression: picked.aggression,
      budget: Math.round(startPrice * rand(competition.budget[0], competition.budget[1]))
    });
  }

  const lot = {
    id: `lot-${state.day}-${index}-${Math.floor(Math.random() * 10000)}`,
    index,
    tier: tier.id,
    tierName: competition.name,
    origin: { id: origin.id, label: origin.label, valueMultiplier: origin.valueMultiplier },
    route: pick(GEN.routes),
    size: { label: size.label },
    weightKg,
    seal: { id: seal.id, label: seal.label },
    appearance: { id: appearance.id, label: appearance.label },
    storageDays,
    batch: batchLabel(),
    items,
    realValue: value,
    startPrice,
    competitors,
    estimate: null
  };
  lot.estimate = estimateOf(state, lot);
  // 第一天主要用于教学，不生成违禁品，避免流程被分支打断。
  if (state.day <= 1) {
    lot.items.forEach((item) => {
      item.contraband = false;
    });
  }
  return lot;
}

function dominantCategoryOfTier(tier) {
  const weights = tier.categoryWeights;
  const total = Object.keys(weights).reduce((sum, key) => sum + weights[key], 0);
  let roll = Math.random() * total;
  for (const key of Object.keys(weights)) {
    roll -= weights[key];
    if (roll <= 0) {
      return key;
    }
  }
  return "common";
}

export function generateDailyLots(state) {
  const level = levelFor(state);
  const tier = tierOf(level);
  const count = randInt(GEN.minLots, GEN.maxLots);
  const lots = [];
  // 第 4 天出现一只高额优先寄售箱，用于贷款分支。
  if (state.day === 4 && !state.highValueSeen) {
    state.highValueSeen = true;
    lots.push(buildHighValueLot(state));
  }
  for (let index = 0; index < count; index += 1) {
    lots.push(buildLot(state, tier, index));
  }
  injectClueItems(state, lots);
  return { level, lots };
}

// 高额优先寄售箱：起拍价明显更高，公开信息更完整，一定有人跟价。
function buildHighValueLot(state) {
  const lot = buildLot(state, tierOf("high"), 99);
  lot.highValue = true;
  lot.startPrice = Math.max(lot.startPrice, 900);
  lot.seal = { id: "intact", label: "封条完整" };
  lot.appearance = { id: "complete", label: "完整" };
  lot.estimate = estimateOf(state, lot);
  lot.estimate.confidence = "高";
  const follower = lot.competitors[0];
  if (follower) {
    follower.budget = Math.max(follower.budget, lot.startPrice * 2);
    follower.aggression = Math.max(follower.aggression, 0.7);
  }
  return lot;
}

// 保证每天的批次里至少有一件线索物品，否则买家故事永远推进不了。
// 线索物品：每个箱子按概率带出当前故事还缺的那一件，带软保底和硬保底。
function injectClueItems(state, lots) {
  if (!lots.length) {
    return;
  }
  const pity = (state.cluePity = state.cluePity || {});
  activeStories(state).forEach((story, order) => {
    const next = pendingClue(state, story.id);
    if (!next) {
      return;
    }
    const rule = CLUE_RULES[next.type] || CLUE_RULES.core;
    const counter = (pity[story.id] || 0) + 1;
    pity[story.id] = counter;
    const softExcess = Math.max(0, counter - rule.soft);
    const chance = Math.min(0.9, rule.chance + softExcess * rule.step);
    const forced = counter >= rule.hard;
    if (!forced && Math.random() >= chance) {
      return;
    }
    pity[story.id] = 0;
    const lot = lots[Math.min(order, lots.length - 1)];
    lot.items.push(buildClueEntry(state, next.item, lot.items.length));
    lot.realValue = totalValue(lot.items);
    lot.estimate = estimateOf(state, lot);
  });
}

export function currentLot(state) {
  return state.lots[state.lotIndex] || null;
}
