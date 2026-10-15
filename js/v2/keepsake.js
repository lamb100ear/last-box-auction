// 藏品：带额外属性的物品。
// 属性按标签分两种生效方式：
//   keep = 自留进收纳盒后长期生效；
//   sell = 成功售出时一次性生效。
// 同一件标签的自留藏品同时放进收纳盒，只生效一次。

export const KEEPSAKE_CAPACITY = 4;

export const KEEPSAKE_MODES = {
  keep: { id: "keep", label: "自留生效" },
  sell: { id: "sell", label: "售出生效" }
};

export const KEEPSAKE_TRAITS = {
  buyer_trust_global: {
    id: "buyer_trust_global",
    tag: "老主顾",
    mode: "keep",
    value: 5,
    effect: "买家初始信任 +5"
  },
  storage_guard: {
    id: "storage_guard",
    tag: "夹层收纳",
    mode: "keep",
    value: 5,
    effect: "每件物品保管费 -5"
  },
  sale_bonus_global: {
    id: "sale_bonus_global",
    tag: "展示加成",
    mode: "keep",
    value: 0.05,
    effect: "在线成交价 +5%"
  },
  onsite_bonus_global: {
    id: "onsite_bonus_global",
    tag: "现场人脉",
    mode: "keep",
    value: 0.1,
    effect: "现场出售收入 +10%"
  },
  resale_bonus: {
    id: "resale_bonus",
    tag: "转卖渠道",
    mode: "keep",
    value: 0.08,
    effect: "原封转卖报价 +8%"
  },
  research_bonus: {
    id: "research_bonus",
    tag: "档案线索",
    mode: "keep",
    value: 1,
    effect: "万物通查询多确认一条信息"
  },
  trouble_discount: {
    id: "trouble_discount",
    tag: "法律人脉",
    mode: "keep",
    value: 100,
    effect: "麻烦处理服务降价 ¥100"
  },
  reputation_bonus: {
    id: "reputation_bonus",
    tag: "口碑藏品",
    mode: "sell",
    value: 1,
    effect: "成功售出后信誉 +1"
  },
  cash_bonus: {
    id: "cash_bonus",
    tag: "溢价藏品",
    mode: "sell",
    value: 0.05,
    effect: "成功售出后额外获得成交价 5% 现金"
  }
};

// 哪些物品模板是藏品，以及它带的属性标签。
export const ITEM_TRAITS = {
  wedding_rings: "buyer_trust_global",
  bridal_jewelry: "storage_guard",
  designer_bag: "sale_bonus_global",
  clinic_sign: "onsite_bonus_global",
  antique_tea_set: "resale_bonus",
  stock_documents: "resale_bonus",
  endorsement_contract: "research_bonus",
  old_will: "trouble_discount",
  gold_watch: "reputation_bonus",
  small_painting: "cash_bonus"
};

export function traitOf(item) {
  const id = item && item.traitId;
  return id ? KEEPSAKE_TRAITS[id] || null : null;
}

export function traitOfTemplate(templateId) {
  return ITEM_TRAITS[templateId] ? KEEPSAKE_TRAITS[ITEM_TRAITS[templateId]] : null;
}

export function isKeepsake(item) {
  return Boolean(traitOf(item));
}

export function traitModeLabel(item) {
  const trait = traitOf(item);
  return trait ? KEEPSAKE_MODES[trait.mode].label : "";
}

// 收纳盒里正在生效的自留属性。同一标签只算一次。
export function keepsakeModifiers(state) {
  const mods = {
    buyerTrust: 0,
    saleLift: 1,
    onsiteLift: 1,
    resaleLift: 1,
    storageDelta: 0,
    researchBonus: 0,
    serviceDiscount: 0,
    activeTags: [],
    ignoredTags: []
  };
  const seen = new Set();
  (state.keepsakes || []).forEach((item) => {
    const trait = traitOf(item);
    if (!trait || trait.mode !== "keep") {
      return;
    }
    if (seen.has(trait.id)) {
      if (!mods.ignoredTags.includes(trait.tag)) {
        mods.ignoredTags.push(trait.tag);
      }
      return;
    }
    seen.add(trait.id);
    mods.activeTags.push(trait.tag);
    switch (trait.id) {
      case "buyer_trust_global":
        mods.buyerTrust += trait.value;
        break;
      case "sale_bonus_global":
        mods.saleLift *= 1 + trait.value;
        break;
      case "onsite_bonus_global":
        mods.onsiteLift *= 1 + trait.value;
        break;
      case "resale_bonus":
        mods.resaleLift *= 1 + trait.value;
        break;
      case "storage_guard":
        mods.storageDelta -= trait.value;
        break;
      case "research_bonus":
        mods.researchBonus += trait.value;
        break;
      case "trouble_discount":
        mods.serviceDiscount += trait.value;
        break;
      default:
        break;
    }
  });
  return mods;
}

// 成功售出时结算售出型属性。
export function applySellTraits(state, item, income) {
  const trait = traitOf(item);
  if (!trait || trait.mode !== "sell") {
    return null;
  }
  if (trait.id === "reputation_bonus") {
    state.reputation = Math.min(100, state.reputation + trait.value);
    return `藏品「${trait.tag}」生效：信誉 +${trait.value}。`;
  }
  if (trait.id === "cash_bonus") {
    const bonus = Math.round(income * trait.value);
    state.cash += bonus;
    state.ledger.listing = (state.ledger.listing || 0) + bonus;
    return `藏品「${trait.tag}」生效：额外获得 ¥${bonus}。`;
  }
  return null;
}

// 收纳盒自留。盒子满了必须先指定要替换的藏品。
export function keepItem(state, itemId, replaceUid) {
  const item = state.inventory.find((entry) => entry.uid === itemId);
  if (!item) {
    return { ok: false, reason: "NOT_FOUND", text: "没有找到这件物品。" };
  }
  if (!isKeepsake(item)) {
    return { ok: false, reason: "NOT_KEEPSAKE", text: "只有带属性的藏品才能放进收纳盒。" };
  }
  state.keepsakes = state.keepsakes || [];
  if (state.keepsakes.length < KEEPSAKE_CAPACITY) {
    state.keepsakes.push(item);
    state.inventory = state.inventory.filter((entry) => entry.uid !== itemId);
    const trait = traitOf(item);
    return {
      ok: true,
      kept: true,
      text: `${item.name}已放进收纳盒，属性「${trait.tag}」${trait.mode === "keep" ? "开始生效" : "需要售出才会生效"}。`
    };
  }
  if (!replaceUid) {
    return { ok: false, reason: "FULL", text: "收纳盒已满，请选择要替换的藏品。" };
  }
  const target = state.keepsakes.find((entry) => entry.uid === replaceUid);
  if (!target) {
    return { ok: false, reason: "FULL", text: "收纳盒已满，请选择要替换的藏品。" };
  }
  state.keepsakes = state.keepsakes.map((entry) => (entry.uid === target.uid ? item : entry));
  state.inventory = state.inventory.filter((entry) => entry.uid !== itemId);
  state.inventory.push(target);
  return {
    ok: true,
    replaced: target.name,
    text: `${item.name}替换了${target.name}，${target.name}回到货架。`
  };
}

