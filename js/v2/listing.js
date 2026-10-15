// 出售设置、橱窗和买家交易。

import { STAGE_TWO_DATA } from "../data.js";
import { round10 } from "./util.js";
import { keepsakeBonus } from "./shop.js";
import { applySellTraits, keepsakeModifiers } from "./keepsake.js";
import { truthPenalty } from "./inspect.js";
import {
  applyDeception,
  buildQuestions,
  haggleCut,
  isBlacklisted,
  perceivedPrice,
  personalityOf,
  personalityTag,
  resolveAnswer,
  trustThresholds
} from "./buyer.js";

export const LISTING_TAGS = STAGE_TWO_DATA.listingTags;
export const FORGERY_TARGETS = STAGE_TWO_DATA.forgeryTargets;

// 橱窗一共四个展示位，同时最多摆四件在售物品。
export const WINDOW_CAPACITY = 4;

// 正在橱窗里等买家的物品（含已经开始谈价的那件）。
export function activeListings(state) {
  return state.listings.filter(
    (entry) => entry.status === "waiting" || entry.status === "talking"
  );
}

export function trendLift(state, category) {
  return (state.trend && state.trend.lift[category]) || 1;
}

export function referencePrice(state, item) {
  // 负面且没有被伪造覆盖的真实信息会压低参考售价。
  const base =
    item.value *
    trendLift(state, item.category) *
    keepsakeBonus(state, item.category) *
    (1 - Math.min(0.4, truthPenalty(item)));
  return { min: round10(base * 0.7), mid: round10(base), max: round10(base * 1.35) };
}

// 买家感知价用的参考值：把藏品「展示加成」算进去。
function buyerReference(state, item) {
  const ref = referencePrice(state, item);
  const lift = keepsakeModifiers(state).saleLift;
  if (lift === 1) {
    return ref;
  }
  return {
    min: round10(ref.min * lift),
    mid: round10(ref.mid * lift),
    max: round10(ref.max * lift)
  };
}

export function sellableState(item) {
  if (item.contraband) {
    return { ok: false, reason: "违禁品不能走普通上架，只能出售或上交。" };
  }
  if (!item.inspection || !item.inspection.completed) {
    return { ok: false, reason: "先完成检视再出售。" };
  }
  return { ok: true };
}

// 挂牌价高于参考售价上限时返回超出比例，用于下调买家信任和成交概率。
export function priceOverflow(state, listing) {
  const reference = referencePrice(state, listing.item);
  if (listing.price <= reference.max) {
    return 0;
  }
  return (listing.price - reference.max) / Math.max(1, reference.max);
}

// 价格过高带来的信任扣减，最多 20 点。
export function priceTrustPenalty(state, listing) {
  return Math.min(20, Math.round(priceOverflow(state, listing) * 40));
}

export function publishListing(state, itemId, options) {
  const item = state.inventory.find((entry) => entry.uid === itemId);
  if (!item) {
    return { ok: false, text: "没有找到这件物品。" };
  }
  const check = sellableState(item);
  if (!check.ok) {
    return { ok: false, text: check.reason };
  }
  if (activeListings(state).length >= WINDOW_CAPACITY) {
    return { ok: false, text: `橱窗只有 ${WINDOW_CAPACITY} 个展示位，先处理掉一件再上架。` };
  }
  if (!options.tags || options.tags.length !== 2) {
    return { ok: false, text: "请选择两个标签。" };
  }

  state.listingSeq += 1;
  state.inventory = state.inventory.filter((entry) => entry.uid !== itemId);
  const trustworthy = options.tags.every((tag) => tag !== "来源不明" && tag !== "待鉴定");
  const listing = {
    id: `listing-${state.listingSeq}`,
    item,
    price: options.price,
    tags: options.tags.slice(),
    days: options.days,
    tagConfidence: trustworthy ? "高" : "中",
    forgery: item.forgery || null,
    day: state.day,
    arrivalDay: state.day + 1,
    arrivalAt: null,
    arrivalKind: "nextDay",
    status: "waiting"
  };
  // 新手教学的第一次上架保证很快就有买家，方便讲解交易流程。
  const tutorial = state.tutorial || {};
  if (tutorial.mode === "full" && !state.tutorialFirstListingDone) {
    state.tutorialFirstListingDone = true;
    listing.arrivalKind = "quick";
    listing.arrivalAt = Date.now() + 3000;
  } else {
    scheduleArrival(state, listing);
  }
  state.listings.push(listing);
  const hint =
    listing.arrivalKind === "quick"
      ? "买家应该很快就会出现。"
      : listing.arrivalKind === "slow"
        ? "这个买家要多等一会儿，可能几分钟后才到。"
        : "今天暂时没有合适的买家，明天应该会来。";
  return { ok: true, text: `${item.name}已进入橱窗，等待买家。${hint}` };
}

// 买家到店速度：前期大多很快到店，少数要等一会或第二天；
// 店铺等级越高，需要等待的买家越多。
export const ARRIVAL_TABLE = {
  1: { quick: 0.75, slow: 0.18 },
  2: { quick: 0.6, slow: 0.27 },
  3: { quick: 0.45, slow: 0.34 }
};

export function scheduleArrival(state, listing) {
  const level = Math.min(3, Math.max(1, state.shopLevel || 1));
  const rates = ARRIVAL_TABLE[level];
  const roll = Math.random();
  // 无论哪种情况，第二天一定会来，作为兜底。
  listing.arrivalDay = state.day + 1;
  if (roll < rates.quick) {
    listing.arrivalKind = "quick";
    listing.arrivalAt = Date.now() + (15 + Math.random() * 30) * 1000;
  } else if (roll < rates.quick + rates.slow) {
    listing.arrivalKind = "slow";
    listing.arrivalAt = Date.now() + (180 + Math.random() * 60) * 1000;
  } else {
    listing.arrivalKind = "nextDay";
    listing.arrivalAt = null;
  }
}

function pickProfile(state, listing) {
  const profiles = STAGE_TWO_DATA.buyerProfiles;
  // 被识破三次的买家会把你拉黑，短时间内不再上门。
  const available = profiles.filter((profile) => !isBlacklisted(state, profile.id));
  if (!available.length) {
    return null;
  }
  const wanted =
    listing.item.category === "luxury"
      ? ["price", "feature", "story"]
      : ["source", "record", "code", "packaging"];
  // 每位买家都可能上门；越关心这件物品核验点的买家权重越高，
  // 但不再是分数最高者固定到场，避免同一类物品总是同一位买家上门。
  const weighted = available.map((profile) => {
    const overlap = profile.verificationFocus.filter((focus) => wanted.includes(focus)).length;
    return { profile, weight: 1 + overlap * 2 };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll < 0) {
      return entry.profile;
    }
  }
  return weighted[weighted.length - 1].profile;
}

// 每次结束本日后调用：到期的橱窗生成一位买家。
export function arriveBuyer(state) {
  if (state.buyer) {
    return null;
  }
  const listing = state.listings.find(
    (entry) =>
      entry.status === "waiting" &&
      ((entry.arrivalAt && Date.now() >= entry.arrivalAt) ||
        entry.arrivalDay <= state.day)
  );
  if (!listing) {
    return null;
  }
  const profile = pickProfile(state, listing);
  if (!profile) {
    return null;
  }
  const trait = personalityOf(profile.id);
  const rawTrust = profile.initialTrust + (state.reputation - 50) * 0.4;
  const keepsakeTrust = keepsakeModifiers(state).buyerTrust;
  const trust = Math.max(
    10,
    Math.min(95, Math.round(rawTrust + keepsakeTrust - priceTrustPenalty(state, listing)))
  );
  const reference = buyerReference(state, listing.item);
  const perceived = perceivedPrice(reference, profile.id, listing.item.forgery || null);
  state.buyer = {
    profileId: profile.id,
    displayId: profile.displayId,
    name: profile.name,
    style: profile.style,
    preference: profile.preference,
    opening: profile.opening,
    personality: personalityTag(profile.id),
    premium: trait.premium,
    trust,
    questionIndex: 0,
    questions: buildQuestions(listing.item, profile, {
      priceOverflow: priceOverflow(state, listing),
      state
    }),
    answers: [],
    listingId: listing.id,
    pricePenalty: priceTrustPenalty(state, listing),
    priceOverflow: priceOverflow(state, listing),
    reference,
    perceived,
    feedback: null
  };
  listing.status = "talking";
  return state.buyer;
}

export function currentQuestion(state) {
  const buyer = state.buyer;
  if (!buyer) {
    return null;
  }
  return buyer.questions[buyer.questionIndex] || null;
}

export function answerQuestion(state, replyId) {
  const buyer = state.buyer;
  const question = currentQuestion(state);
  if (!buyer || !question) {
    return { ok: false, text: "当前没有需要回答的问题。" };
  }
  const listing = state.listings.find((entry) => entry.id === buyer.listingId);
  const item = listing ? listing.item : null;
  if (!item) {
    return { ok: false, text: "橱窗里的物品已经不在。" };
  }
  const result = resolveAnswer(state, buyer, question, replyId, item);
  if (!result.ok || !result.caught) {
    return result;
  }
  // 编造被识破：信誉和麻烦立刻结算，交易取消，物品回货架。
  const deception = applyDeception(state, buyer, item);
  returnToInventory(state, item);
  dropListing(state, listing.id);
  buyer.detected = deception.text;
  buyer.questionIndex = buyer.questions.length;
  buyer.feedback = null;
  return {
    ok: true,
    caught: true,
    blacklisted: deception.blacklisted,
    text: deception.text
  };
}

// 识破之后玩家点「知道了」，买家离店。
export function dismissBuyer(state) {
  state.buyer = null;
}

function forgeryOutcome(item) {
  const forgery = item.forgery;
  if (!forgery) {
    return { lift: 1, exposure: 0, rewardFactor: 1, matched: null };
  }
  const target = FORGERY_TARGETS.find((entry) => entry.id === forgery.targetId);
  const material = STAGE_TWO_DATA.mallProducts.find(
    (entry) => entry.id === forgery.materialId
  );
  const matched = Boolean(
    target && material && target.compatibleTypes.includes(material.forgeryType)
  );
  return {
    lift: forgery.lift,
    exposure: matched ? forgery.exposure : forgery.exposure * 1.5,
    rewardFactor: matched ? target.rewardMultiplier : 0.7,
    matched,
    materialName: material ? material.name : "伪造材料"
  };
}

function returnToInventory(state, item) {
  state.inventory.push(item);
}

function dropListing(state, listingId) {
  state.listings = state.listings.filter((entry) => entry.id !== listingId);
}

export function settleBuyer(state) {
  const buyer = state.buyer;
  if (!buyer) {
    return { ok: false, text: "当前没有到店买家。" };
  }
  const listing = state.listings.find((entry) => entry.id === buyer.listingId);
  if (!listing) {
    state.buyer = null;
    return { ok: false, text: "橱窗里的物品已经不在。" };
  }

  const item = listing.item;
  const forgery = forgeryOutcome(item);

  // 挂牌价高于感知价的部分不会成交；超得太多买家直接离店。
  const perceived = perceivedPrice(
    buyer.reference || buyerReference(state, item),
    buyer.profileId,
    item.forgery || null
  );
  const overflow = buyer.priceOverflow || 0;
  // 特殊会话里选了「货卖给别人」这类选项后，买家可能直接离店。
  if (buyer.riskLeave && Math.random() < 0.3) {
    state.reputation = Math.max(0, state.reputation - 1);
    returnToInventory(state, item);
    dropListing(state, listing.id);
    state.buyer = null;
    return {
      ok: true,
      result: "left",
      text: `${buyer.name}听完就不再谈，直接走了。信誉 -1，物品回到货架。`
    };
  }
  // 特殊会话换来的当前报价加成。
  const boosted = buyer.priceBoost
    ? Math.max(0, round10(perceived * (1 + buyer.priceBoost)))
    : perceived;
  if (overflow >= 0.5 && Math.random() < 0.3) {
    state.reputation = Math.max(0, state.reputation - 1);
    returnToInventory(state, item);
    dropListing(state, listing.id);
    state.buyer = null;
    return {
      ok: true,
      result: "left",
      text: `${buyer.name}觉得挂牌价高得太离谱，直接走了。信誉 -1，物品回到货架。`
    };
  }

  let detected = false;
  if (forgery.exposure > 0) {
    if (state.cleanupShield > 0) {
      state.cleanupShield -= 1;
    } else if (Math.random() < forgery.exposure) {
      detected = true;
    }
  }

  if (detected) {
    state.reputation = Math.max(0, state.reputation - 4);
    state.trouble = Math.min(10, state.trouble + 1);
    item.forgery = null;
    returnToInventory(state, item);
    dropListing(state, listing.id);
    state.buyer = null;
    return {
      ok: true,
      result: "detected",
      text: `${buyer.name}核对了资料，识破了${forgery.materialName}。交易取消，信誉 -4，麻烦 +1。`
    };
  }

  // 价格越高，买家要求的信任门槛越高；核验严的买家门槛更高。
  const thresholds = trustThresholds(buyer);
  const soldThreshold = thresholds.sold;
  const haggleThreshold = thresholds.haggle;

  if (buyer.trust >= soldThreshold) {
    const final = Math.min(listing.price, boosted);
    state.cash += final;
    state.ledger.listing += final;
    state.reputation = Math.min(100, state.reputation + 2);
    // 出售生效型藏品的属性在成交时结算。
    const traitText = applySellTraits(state, item, final);
    dropListing(state, listing.id);
    state.buyer = null;
    return {
      ok: true,
      result: "sold",
      income: final,
      text: `${buyer.name}成交，收入 ¥${final}，信誉 +2。${traitText ? ` ${traitText}` : ""}`
    };
  }

  if (buyer.trust >= haggleThreshold) {
    // 压价幅度由买家议价风格决定：爽快 5%，挑剔 15%，磨价 10% 至 20%。
    const cut = haggleCut(buyer, soldThreshold);
    const ceiling = Math.min(listing.price, boosted);
    const final = round10(ceiling * (1 - cut));
    state.cash += final;
    state.ledger.listing += final;
    dropListing(state, listing.id);
    state.buyer = null;
    return {
      ok: true,
      result: "haggled",
      income: final,
      text: `${buyer.name}把价格压掉 ${Math.round(cut * 100)}%，最后成交 ¥${final}。`
    };
  }

  state.reputation = Math.max(0, state.reputation - 1);
  returnToInventory(state, item);
  dropListing(state, listing.id);
  state.buyer = null;
  return {
    ok: true,
    result: "failed",
    text: `${buyer.name}觉得信息对不上，取消了交易。信誉 -1，物品回到货架。`
  };
}

// 玩家没回复买家就结束本日，买家取消交易。
export function cancelWaitingBuyer(state) {
  const buyer = state.buyer;
  if (!buyer) {
    return null;
  }
  const listing = state.listings.find((entry) => entry.id === buyer.listingId);
  if (listing) {
    returnToInventory(state, listing.item);
    dropListing(state, listing.id);
  }
  state.reputation = Math.max(0, state.reputation - 2);
  state.buyer = null;
  return { name: buyer.name, itemName: listing ? listing.item.name : "" };
}
