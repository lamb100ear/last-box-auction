// 买家系统：性格面板、按物品状态生成的问题、编造与识破判定、议价与溢价系数。
// 方案见《再拍最后一箱 2.0 买家系统改版方案（待确认）》。

import { ensureFacts, ensureInspection, ensureTruth } from "./inspect.js";
import { round10 } from "./util.js";
import { CLUE_ITEMS, STORY_SPECIAL } from "./storydata.js";

// 六位买家的性格：核验强度、议价风格、溢价系数。
export const PERSONALITIES = {
  paper_crane: { verify: "medium", haggle: "easy", premium: 1.15, exposure: 0.3 },
  blue_ledger: { verify: "medium", haggle: "grind", premium: 0.85, exposure: 0.3 },
  old_fox: { verify: "lenient", haggle: "easy", premium: 0.95, exposure: 0.2 },
  seven_warehouse: { verify: "strict", haggle: "picky", premium: 1.0, exposure: 0.45 },
  velvet_broker: { verify: "medium", haggle: "grind", premium: 1.25, exposure: 0.3 },
  midnight_radio: { verify: "strict", haggle: "grind", premium: 1.35, exposure: 0.45 }
};

export const VERIFY_LABEL = { lenient: "核验松", medium: "核验中", strict: "核验严" };
export const HAGGLE_LABEL = { easy: "爽快", grind: "磨价", picky: "挑剔" };

// 核验强度影响成交信任门槛；议价风格影响压价幅度。
const VERIFY_TRUST_ADJUST = { lenient: -6, medium: 0, strict: 8 };
const HAGGLE_CUT = { easy: 0.05, grind: 0.1, picky: 0.15 };

export function personalityOf(profileId) {
  return (
    PERSONALITIES[profileId] || { verify: "medium", haggle: "easy", premium: 1, exposure: 0.3 }
  );
}

export function personalityTag(profileId) {
  const trait = personalityOf(profileId);
  return `${HAGGLE_LABEL[trait.haggle]} · ${VERIFY_LABEL[trait.verify]}`;
}

export function isBlacklisted(state, profileId) {
  const until = (state.buyerBlacklist || {})[profileId];
  return Boolean(until) && state.day <= until;
}

// ---------- 物品状态 ----------

export function factDiscovered(item, kind) {
  return ensureFacts(item).some((fact) => fact.kind === kind && fact.discovered);
}

function truthKnown(item, key) {
  return Boolean(ensureTruth(item).discovered[key]);
}

function conditionId(item) {
  return (item.condition && item.condition.id) || "normal";
}

function appearanceId(item) {
  return (item.appearance && item.appearance.id) || "complete";
}

export function itemStateFlags(item) {
  const truth = ensureTruth(item);
  const inspection = ensureInspection(item);
  return {
    damp: conditionId(item) === "damp",
    rust: conditionId(item) === "rusted",
    broken: conditionId(item) === "broken",
    torn: appearanceId(item) === "torn",
    odor: appearanceId(item) === "odor",
    lockDamaged: appearanceId(item) === "lock_damaged",
    relabeled: appearanceId(item) === "relabeled",
    repaired: String(truth.fields.repair.value).includes("有维修"),
    codeKnown: factDiscovered(item, "code"),
    sourceKnown: truthKnown(item, "source"),
    provenanceKnown: truthKnown(item, "provenance"),
    inspected: Boolean(inspection.completed)
  };
}

// ---------- 问题库 ----------
// 每个问题都是从物品真实状态生成的：如实回答、含糊回避、编造三种选择。
// claim 记录编造的说法，用来判断说法是否和已经留档的事实冲突。

const TOPICS = [
  {
    id: "damp",
    kind: "record",
    match: (item, flags) => flags.damp,
    question: "这箱子放过挺久了吧，有没有受潮？",
    honest: { text: "边角是有点潮，我不瞒你。", trust: 2 },
    evade: { text: "我没仔细翻过里面。", trust: -1 },
    lie: { text: "一直很干燥，从来没有受潮。", trust: 6, claim: "no_damp" }
  },
  {
    id: "rust",
    kind: "record",
    match: (item, flags) => flags.rust,
    question: "金属件有没有锈？",
    honest: { text: "有锈，但没烂穿。", trust: 2 },
    evade: { text: "我没细看那些边角。", trust: -1 },
    lie: { text: "一点锈都没有，保养得很好。", trust: 6, claim: "no_rust" }
  },
  {
    id: "broken",
    kind: "record",
    match: (item, flags) => flags.broken || flags.torn,
    question: "有没有破损或者开口？",
    honest: { text: "有一处破损，我先说明。", trust: 3 },
    evade: { text: "我拿到时就是这个样子。", trust: 0 },
    lie: { text: "完好无损，一点磕碰都没有。", trust: 6, claim: "no_damage" }
  },
  {
    id: "odor",
    kind: "record",
    match: (item, flags) => flags.odor,
    question: "是不是有点味道？",
    honest: { text: "是有点旧味，我晾过了。", trust: 2 },
    evade: { text: "我自己没觉得。", trust: -1 },
    lie: { text: "没有味道，很干净。", trust: 5, claim: "no_odor" }
  },
  {
    id: "lock",
    kind: "record",
    match: (item, flags) => flags.lockDamaged,
    question: "锁扣怎么像是被撬过？",
    honest: { text: "锁被撬过，里面我没动过。", trust: 2 },
    evade: { text: "这种细节我记不清了。", trust: -1 },
    lie: { text: "锁是原装的，没被动过。", trust: 6, claim: "lock_ok" }
  },
  {
    id: "repair",
    kind: "record",
    match: (item, flags) => flags.repaired,
    question: "这件东西有没有拆修过？",
    honest: { text: "有维修痕迹，我如实说。", trust: 3 },
    evade: { text: "维修史我不清楚。", trust: -1 },
    lie: { text: "从来没有修过，原装状态。", trust: 6, claim: "no_repair" }
  },
  {
    id: "code",
    kind: "code",
    match: () => true,
    question: (item, flags) =>
      flags.codeKnown ? "这件物品的编号有公开记录吗？" : "你能确认这件物品的编号吗？",
    honest: (item, flags) =>
      flags.codeKnown
        ? { text: `有记录，编号 ${item.code} 可以在万物通查到。`, trust: 8 }
        : { text: "编号我还没核对过。", trust: 0 },
    evade: { text: "编号就刻在物品上，你自己看。", trust: -1 },
    lie: { text: "编号肯定对得上，随便查。", trust: 7, claim: "code_ok" }
  },
  {
    id: "source",
    kind: "source",
    match: () => true,
    question: (item, flags) =>
      flags.sourceKnown ? "来源资料能给我看一下吗？" : "这件东西的来源说得清吗？",
    honest: (item, flags) =>
      flags.sourceKnown
        ? { text: "来源清楚，我在万物通查过。", trust: 8 }
        : { text: "来源我只能说到箱子这一层。", trust: 0 },
    evade: { text: "来源就是拍卖场拍来的。", trust: -1 },
    lie: { text: "来源绝对干净，随便查。", trust: 7, claim: "source_clean" }
  },
  {
    id: "price",
    kind: "price",
    match: (item, flags, context) => context.priceOverflow > 0,
    question: "这个价格比同类高不少，你凭什么定这么高？",
    honest: { text: "状态和来源都比同类清楚，所以定得高。", trust: 6 },
    evade: { text: "价格是按最近的行情定的。", trust: 2 },
    lie: { text: "市场上就是这个价，我一分没多要。", trust: 5, claim: "market_price" }
  },
  {
    id: "story",
    kind: "story",
    match: (item) => Boolean(item.storyId),
    question: "这件东西有什么特别的来历吗？",
    honest: { text: "有一份旧资料能说明它的来历。", trust: 8 },
    evade: { text: "就是普通失物，没有故事。", trust: 2 },
    lie: { text: "当然有，我给你讲个更值钱的版本。", trust: 7, claim: "story" }
  },
  {
    id: "packaging",
    kind: "packaging",
    match: () => true,
    question: "原来的包装和托运标签还在吗？",
    honest: { text: "还在，可以和物品一起给你。", trust: 5 },
    evade: { text: "只剩一部分包装。", trust: 1 },
    lie: { text: "包装齐全，一件不少。", trust: 5, claim: "packaging" }
  }
];

function resolveOption(option, item, flags) {
  return typeof option === "function" ? option(item, flags) : option;
}

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swap];
    copy[swap] = temp;
  }
  return copy;
}

// 按物品状态抽题：核验关注点优先，其余补齐。
export function buildQuestions(item, profile, context = {}) {
  const flags = itemStateFlags(item);
  const focus = profile.verificationFocus || [];
  const pool = TOPICS.filter((topic) => topic.match(item, flags, context));
  const special = specialQuestion(context.state, item, profile);
  const scored = pool.map((topic) => ({
    topic,
    score: (focus.includes(topic.kind) ? 2 : 0) + Math.random()
  }));
  scored.sort((a, b) => b.score - a.score);

  const base = item.category === "luxury" ? 3 : 2 + (Math.random() < 0.5 ? 1 : 0);
  const questionCount = context.priceOverflow > 0 ? base + 1 : base;
  const picked = scored.slice(0, Math.min(questionCount, scored.length)).map((entry) => entry.topic);
  // 挂牌价高于参考上限时，价格问题一定要问。
  if (context.priceOverflow > 0) {
    const priceTopic = pool.find((topic) => topic.kind === "price");
    if (priceTopic && !picked.includes(priceTopic)) {
      picked.unshift(priceTopic);
      picked.splice(questionCount);
    }
  }

  const questions = picked.map((topic) => {
    const honest = resolveOption(topic.honest, item, flags);
    const evade = resolveOption(topic.evade, item, flags);
    const lie = resolveOption(topic.lie, item, flags);
    const replies = shuffle([
      Object.assign({ id: "honest", type: "honest" }, honest),
      Object.assign({ id: "evade", type: "evade" }, evade),
      Object.assign({ id: "lie", type: "lie" }, lie)
    ]);
    return {
      id: topic.id,
      kind: topic.kind,
      text: typeof topic.question === "function" ? topic.question(item, flags) : topic.question,
      replies
    };
  });
  // 买家看到自己故事的线索物品时，先来一段特殊会话。
  if (special) {
    questions.unshift(special);
  }
  return questions;
}

// 特殊会话：买家在拍卖场认出自己的线索物品，先说话，再给三个文档里的选项。
export function specialQuestion(state, item, profile) {
  const special = STORY_SPECIAL[profile.id];
  if (!special || !item || !item.clue || item.storyId !== profile.id) {
    return null;
  }
  const story = STORIES_BUYER[profile.id];
  const speeches = [];
  let pending = null;
  special.lines.forEach((line) => {
    if (line.startsWith("@")) {
      pending = line.slice(1).replace("查到", "");
      return;
    }
    if (pending) {
      // 「查到 XX 后」的台词：玩家已经拿到对应线索物品或在记事本里查过关键词才出现。
      if (clueLineUnlocked(state, story, pending)) {
        speeches.push(line);
      }
      pending = null;
      return;
    }
    speeches.push(line);
  });
  return {
    id: `special_${profile.id}`,
    kind: "story",
    text: speeches.join("\n"),
    special: true,
    replies: special.options.map((option, index) => ({
      id: `special_${index}`,
      type: "special",
      text: option.text,
      trust: option.trust,
      // 文档里写「当前报价提高」，游戏里按 +10% 结算。
      priceBoost: option.priceBoost ? 0.1 : 0,
      mayLeave: option.mayLeave,
      pause: option.pause,
      reaction: option.reaction,
      followUp: option.followUp
    }))
  };
}

const STORIES_BUYER = {
  paper_crane: "纸鹤收藏",
  blue_ledger: "蓝账本",
  old_fox: "旧货狐狸",
  seven_warehouse: "七号仓库",
  velvet_broker: "绒布经纪人",
  midnight_radio: "午夜电台"
};

function clueLineUnlocked(state, buyerName, hint) {
  if (!state) {
    return false;
  }
  const owned = state.ownedClues || {};
  const matched = CLUE_ITEMS.some(
    (item) => item.buyer === buyerName && (item.name.includes(hint) || hint.includes(item.name))
  );
  if (matched) {
    return CLUE_ITEMS.some(
      (item) =>
        item.buyer === buyerName &&
        (item.name.includes(hint) || hint.includes(item.name)) &&
        owned[item.id]
    );
  }
  // 不是物品名的，看记事本里有没有这个词条。
  const keywords = (state.notebook && state.notebook.keywords) || [];
  return keywords.some((keyword) => keyword.includes(hint) || hint.includes(keyword));
}

// ---------- 编造与识破 ----------

const CLAIM_FIELDS = {
  no_damp: "condition",
  no_rust: "condition",
  no_damage: "condition",
  no_odor: "condition",
  lock_ok: "condition",
  no_repair: "repair",
  code_ok: "code",
  source_clean: "source",
  market_price: "price",
  packaging: "packaging",
  story: "story"
};

// 说法和已经留档的事实冲突、或检视没做完时，更容易被识破。
export function exposureChance(state, buyer, question, item) {
  const trait = personalityOf(buyer.profileId);
  const reply = question.replies.find((entry) => entry.type === "lie");
  let chance = trait.exposure;
  if (trait.verify === "strict") {
    chance += 0.1;
  } else if (trait.verify === "lenient") {
    chance -= 0.1;
  }
  const field = reply && CLAIM_FIELDS[reply.claim];
  if (field && (field === "code" ? factDiscovered(item, "code") : truthKnown(item, field))) {
    chance += 0.15;
  }
  const inspection = ensureInspection(item);
  if (!inspection.completed) {
    chance += 0.15;
  }
  if (item.forgery && item.forgery.covers && item.forgery.covers.includes(field)) {
    chance -= 0.15;
  }
  return Math.max(0.05, Math.min(0.85, chance));
}

// ---------- 回答结算 ----------

const REACTIONS = {
  honest: ["买家点了点头，把这条记下了。", "买家看上去接受了这个说法。"],
  evade: ["买家皱了皱眉，没再追问。", "买家停顿了一下，把话题带过去了。"],
  lie: ["买家信了这套说法。", "买家没有追问，只是把价格又看了一遍。"]
};

function pickReaction(type) {
  const list = REACTIONS[type] || REACTIONS.honest;
  return list[Math.floor(Math.random() * list.length)];
}

export function resolveAnswer(state, buyer, question, replyId, item) {
  const reply = question.replies.find((entry) => entry.id === replyId);
  if (!reply) {
    return { ok: false, text: "这个回答不可用。" };
  }
  // 线索物品的特殊会话：按故事文档的选项结算信任、价格和后续。
  if (reply.type === "special") {
    buyer.trust = Math.max(0, Math.min(100, buyer.trust + reply.trust));
    buyer.answers.push({ questionId: question.id, type: "special", delta: reply.trust });
    buyer.questionIndex += 1;
    if (reply.priceBoost) {
      buyer.priceBoost = (buyer.priceBoost || 0) + reply.priceBoost;
    }
    if (reply.mayLeave) {
      buyer.riskLeave = true;
    }
    const storyId = question.id.replace("special_", "");
    state.storyChoices = state.storyChoices || {};
    state.storyChoices[storyId] = {
      text: reply.text,
      reaction: reply.reaction,
      followUp: reply.followUp,
      day: state.day
    };
    if (reply.pause) {
      state.storyPaused = state.storyPaused || {};
      state.storyPaused[storyId] = state.day + 3;
    }
    buyer.feedback = {
      type: "special",
      text: `${reply.reaction} ${reply.followUp}`,
      delta: reply.trust
    };
    return {
      ok: true,
      type: "special",
      delta: reply.trust,
      trust: buyer.trust,
      done: buyer.questionIndex >= buyer.questions.length,
      text: buyer.feedback.text
    };
  }
  if (reply.type !== "lie") {
    buyer.trust = Math.max(0, Math.min(100, buyer.trust + reply.trust));
    buyer.answers.push({ questionId: question.id, type: reply.type, delta: reply.trust });
    buyer.questionIndex += 1;
    buyer.feedback = {
      type: reply.type,
      text: pickReaction(reply.type),
      delta: reply.trust
    };
    return {
      ok: true,
      type: reply.type,
      delta: reply.trust,
      trust: buyer.trust,
      done: buyer.questionIndex >= buyer.questions.length,
      text: buyer.feedback.text
    };
  }

  const chance = exposureChance(state, buyer, question, item);
  if (Math.random() < chance) {
    return { ok: true, type: "caught", delta: 0, caught: true, chance, trust: buyer.trust };
  }
  // 没被当场识破：编造换来更高的信任，但记录留底。
  buyer.trust = Math.max(0, Math.min(100, buyer.trust + reply.trust));
  buyer.answers.push({ questionId: question.id, type: "lie", delta: reply.trust });
  buyer.lieCount = (buyer.lieCount || 0) + 1;
  buyer.questionIndex += 1;
  buyer.feedback = { type: "lie", text: pickReaction("lie"), delta: reply.trust };
  return {
    ok: true,
    type: "lie",
    delta: reply.trust,
    trust: buyer.trust,
    done: buyer.questionIndex >= buyer.questions.length,
    text: buyer.feedback.text
  };
}

// 被识破：信誉、麻烦、黑名单。
export function applyDeception(state, buyer, item) {
  state.reputation = Math.max(0, state.reputation - 5);
  state.trouble = Math.min(10, state.trouble + 1);
  state.buyerDeceived = state.buyerDeceived || {};
  const count = (state.buyerDeceived[buyer.profileId] || 0) + 1;
  state.buyerDeceived[buyer.profileId] = count;
  let blacklisted = false;
  if (count >= 3) {
    state.buyerBlacklist = state.buyerBlacklist || {};
    state.buyerBlacklist[buyer.profileId] = state.day + 3;
    state.buyerDeceived[buyer.profileId] = 0;
    blacklisted = true;
  }
  return {
    text: blacklisted
      ? `买家查到了记录，识破你的说法。信誉 -5，麻烦 +1。${buyer.name}把你加入了黑名单，3 天内不会再来。`
      : `买家查到了记录，识破了你的说法。信誉 -5，麻烦 +1，${buyer.name}立刻离店。`,
    blacklisted
  };
}

// ---------- 价格 ----------

// 买家感知价：参考价中值 × 溢价系数 × 伪造加成。高于感知价的部分不会成交。
export function perceivedPrice(reference, profileId, forgery) {
  const trait = personalityOf(profileId);
  const lift = (forgery && forgery.lift) || 1;
  const factor = (forgery && forgery.rewardFactor) || 1;
  return Math.max(0, round10(reference.mid * trait.premium * lift * factor));
}

export function trustThresholds(buyer) {
  const trait = personalityOf(buyer.profileId);
  const overflow = buyer.priceOverflow || 0;
  return {
    sold: 58 + Math.min(25, overflow * 40) + VERIFY_TRUST_ADJUST[trait.verify],
    haggle: 42 + Math.min(20, overflow * 30) + VERIFY_TRUST_ADJUST[trait.verify]
  };
}

// 压价幅度：爽快 5%，挑剔 15%，磨价在 10% 到 20% 之间按信任浮动。
export function haggleCut(buyer, soldThreshold) {
  const trait = personalityOf(buyer.profileId);
  if (trait.haggle !== "grind") {
    return HAGGLE_CUT[trait.haggle];
  }
  const gap = Math.max(0, soldThreshold - buyer.trust);
  return Math.min(0.2, 0.1 + (gap / Math.max(1, soldThreshold)) * 0.2);
}
