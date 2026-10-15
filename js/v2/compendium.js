// 图鉴：箱子、物品、买家三类收集进度。

export function ensureCompendium(state) {
  if (!state.compendium) {
    state.compendium = { boxes: {}, items: {}, buyers: {}, decor: [] };
  }
  return state.compendium;
}

function entry(store, key, extra) {
  if (!store[key]) {
    store[key] = Object.assign({ seen: 0, opened: 0, sold: 0 }, extra);
  }
  return store[key];
}

export function recordBox(state, lot, phase) {
  if (!lot) {
    return;
  }
  const book = ensureCompendium(state);
  const key = `${lot.origin.id}-${lot.appearance.id}-${lot.size.label}`;
  const record = entry(book.boxes, key, {
    label: lot.size.label,
    origin: lot.origin.label,
    appearance: lot.appearance.label,
    seal: lot.seal.label
  });
  record.seen += 1;
  if (phase === "opened") {
    record.opened = (record.opened || 0) + 1;
  }
}

export function recordItem(state, item, phase) {
  if (!item) {
    return;
  }
  const book = ensureCompendium(state);
  const record = entry(book.items, item.templateId, {
    label: item.name,
    category: item.category
  });
  if (phase === "seen") {
    record.seen += 1;
  } else if (phase === "verified") {
    record.verified = true;
  } else if (phase === "sold") {
    record.sold = (record.sold || 0) + 1;
  }
}

export function recordBuyer(state, buyerId, phase) {
  if (!buyerId) {
    return;
  }
  const book = ensureCompendium(state);
  const record = entry(book.buyers, buyerId, { met: false, fragments: 0, trades: 0 });
  if (phase === "met") {
    record.met = true;
  } else if (phase === "trade") {
    record.trades = (record.trades || 0) + 1;
  } else if (phase === "fragment") {
    record.fragments = (record.fragments || 0) + 1;
  }
}

export function compendiumSummary(state) {
  const book = ensureCompendium(state);
  const count = (store) => Object.keys(store).length;
  const filled = (store, key) =>
    Object.values(store).filter((entry) => entry[key]).length;
  return {
    boxes: count(book.boxes),
    items: count(book.items),
    itemsVerified: filled(book.items, "verified"),
    buyers: count(book.buyers),
    buyersMet: filled(book.buyers, "met")
  };
}

export function hasFullCollection(state) {
  const summary = compendiumSummary(state);
  return summary.itemsVerified >= 20 && summary.buyersMet >= 6;
}

// 全收集奖励只给一个无属性摆件。
export function grantDecor(state) {
  const book = ensureCompendium(state);
  if (book.decor.includes("纪念摆件")) {
    return null;
  }
  book.decor.push("纪念摆件");
  return "纪念摆件";
}
