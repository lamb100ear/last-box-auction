// 记事本与万物通：收集词条、组合查询、推进买家故事。
// 故事内容来自《2.0 买家详细故事文档》，线索物品来自《2.0 物品清单》，
// 两者由 tools/build_story_data.py 生成 js/v2/storydata.js。

import { ensureTruth } from "./inspect.js";
import { keepsakeModifiers } from "./keepsake.js";
import { CLUE_ITEMS, STORY_SEARCH } from "./storydata.js";

// 六位买家的故事线。
export const STORIES = [
  {
    id: "paper_crane",
    buyer: "纸鹤收藏",
    title: "寄不出去的四十件",
    theme: "母女、被送走的姐姐和四十件毛衣"
  },
  {
    id: "blue_ledger",
    buyer: "蓝账本",
    title: "账本里的那一页",
    theme: "父子、工伤和一笔违规转账"
  },
  {
    id: "old_fox",
    buyer: "旧货狐狸",
    title: "替人跑腿的狐狸",
    theme: "跑腿、退出和保护别人"
  },
  {
    id: "seven_warehouse",
    buyer: "七号仓库",
    title: "被改写的目的地",
    theme: "流程、离职和隐藏行李"
  },
  {
    id: "velvet_broker",
    buyer: "绒布经纪人",
    title: "从未举行的婚礼",
    theme: "成套、缺席和遗憾"
  },
  {
    id: "midnight_radio",
    buyer: "午夜电台",
    title: "借来的声音",
    theme: "声音、记忆和署名"
  }
];

// 每个故事的关键词取自它的三件线索物品，检索结果来自买家详细故事文档。
STORIES.forEach((story) => {
  const items = CLUE_ITEMS.filter((item) => item.buyer === story.buyer);
  story.items = items;
  story.keywords = items.flatMap((item) => item.keywords);
  const search = STORY_SEARCH[story.id] || { results: {}, combos: {} };
  story.results = search.results;
  story.combos = search.combos;
});

export function ensureNotebook(state) {
  if (!state.notebook) {
    state.notebook = { keywords: [], results: [], queries: [], stories: {} };
  }
  return state.notebook;
}

export function learnKeyword(state, keyword) {
  const book = ensureNotebook(state);
  if (!keyword || book.keywords.includes(keyword)) {
    return false;
  }
  book.keywords.push(keyword);
  return true;
}

// 检视完成后，把线索关键词、已确认事实和真实信息记进记事本。
export function collectFromItem(state, item) {
  if (!item) {
    return [];
  }
  const learned = [];
  (item.storyKeywords || []).forEach((keyword) => {
    if (learnKeyword(state, keyword)) {
      learned.push(keyword);
    }
  });
  (item.facts || []).forEach((fact) => {
    if (fact.discovered && learnKeyword(state, fact.value)) {
      learned.push(fact.value);
    }
  });
  const truth = ensureTruth(item);
  Object.keys(truth.discovered).forEach((key) => {
    if (!truth.discovered[key]) {
      return;
    }
    const field = truth.fields[key];
    const token = field.key === "trueYear" ? String(field.value).replace(" 年", "") : field.value;
    if (learnKeyword(state, token)) {
      learned.push(token);
    }
  });
  return learned;
}

function keyOf(keywords) {
  return keywords.slice().sort().join("|");
}

// 一至三个词条的组合查询。
export function search(state, keywords) {
  const book = ensureNotebook(state);
  const picked = keywords.filter(Boolean).slice(0, 3);
  if (!picked.length) {
    return { type: "提示", text: "先在记事本里选一至三个词条。" };
  }
  // 档案线索类藏品：查不到的组合也能补出一条旁证。
  const bonus = keepsakeModifiers(state).researchBonus;
  const comboKey = keyOf(picked);
  for (const story of STORIES) {
    for (const [combo, result] of Object.entries(story.combos || {})) {
      if (keyOf(combo.split("|")) === comboKey) {
        const entry = Object.assign({ storyId: story.id, keywords: picked.slice() }, result);
        const recordKey = `${story.id}:${comboKey}`;
        if (!book.queries.includes(recordKey)) {
          book.queries.push(recordKey);
          book.results.push(entry);
          bumpStory(state, story.id, comboKey);
        }
        return entry;
      }
    }
  }
  if (picked.length === 1) {
    for (const story of STORIES) {
      const single = story.results[picked[0]];
      if (single) {
        const entry = Object.assign({ storyId: story.id, keywords: picked.slice() }, single);
        const recordKey = `${story.id}:${comboKey}`;
        if (!book.queries.includes(recordKey)) {
          book.queries.push(recordKey);
          book.results.push(entry);
          bumpStory(state, story.id, comboKey);
        }
        return entry;
      }
    }
  }
  if (bonus > 0) {
    const entry = {
      type: "旁证档案",
      text: `藏品「档案线索」补出一条旁证：${picked.join("、")}在旧档案里被同一批人提过，暂时不能定论。`,
      storyId: null,
      keywords: picked.slice()
    };
    book.results.push(entry);
    return entry;
  }
  return { type: "没有可核实记录", text: "暂时没有可核实记录。" };
}

function bumpStory(state, storyId, key) {
  const book = ensureNotebook(state);
  if (!book.stories[storyId]) {
    book.stories[storyId] = { found: [], connected: false };
  }
  const story = book.stories[storyId];
  if (!story.found.includes(key)) {
    story.found.push(key);
  }
  const source = STORIES.find((entry) => entry.id === storyId);
  const comboTotal = Object.keys(source.combos || {}).length + 3;
  if (story.found.length >= comboTotal) {
    story.connected = true;
  }
}

export function storyProgress(state, storyId) {
  const book = ensureNotebook(state);
  const story = book.stories[storyId] || { found: [], connected: false };
  const source = STORIES.find((entry) => entry.id === storyId);
  const total = Object.keys(source.combos || {}).length + 3;
  return { found: story.found.length, total, connected: story.connected };
}
