// 检视台玩法：清洁、电路修复、放大镜检查，以及伪造处理。
// 规则来自《再拍最后一箱-检视与伪造玩法.md》。

import { hash, mix, pick, round10 } from "./util.js";

export const QUALITY_LABEL = { perfect: "完美", qualified: "合格", rough: "粗糙" };

// 工具栏顺序与图层一一对应。
export const TOOLS = [
  { id: "clean", layer: "工具_清洁", name: "清洁刷" },
  { id: "circuit", layer: "工具_电路", name: "电路修复" },
  { id: "magnifier", layer: "工具_放大镜", name: "放大镜" },
  { id: "forge", layer: "工具_伪造", name: "伪造处理" },
  { id: "done", layer: "工具_完成", name: "完成检视" }
];

export const OPERATION_ORDER = ["clean", "circuit", "magnifier"];

export const OPERATION_NAMES = {
  clean: "清洁",
  circuit: "电路修复",
  magnifier: "放大镜检查"
};

const TRUTH_KEYS = ["trueYear", "condition", "source", "repair", "provenance"];

const BAD_SOURCES = new Set([
  "anonymous_consignment",
  "bankruptcy_liquidation",
  "auction_return"
]);

// ---------- 真实信息 ----------

export function ensureTruth(item) {
  if (item.truth) {
    return item.truth;
  }
  const seed = hash(item.uid);
  const year = 1968 + (seed % 52);
  const labelYear = 1960 + ((seed >> 5) % 66);
  const repaired = (seed >> 11) % 100 < 42;
  const complete = (seed >> 17) % 100 < 58;
  const badSource = BAD_SOURCES.has(item.originId);
  const badCondition = ["lightly_used", "long_stored", "damp", "rusted", "broken"].includes(
    item.condition.id
  );

  item.truth = {
    labelYear,
    fields: {
      trueYear: {
        key: "trueYear",
        label: "真实年代",
        value: `${year} 年`,
        tone: year < 1990 ? "good" : "bad",
        note: year < 1990 ? "年代够老，可以当旧物卖" : "年代偏新，卖不出古董价"
      },
      condition: {
        key: "condition",
        label: "真实状态",
        value: item.condition.label,
        tone: badCondition ? "bad" : "good",
        note: badCondition ? "状态有瑕疵，买家会压价" : "状态完整"
      },
      source: {
        key: "source",
        label: "真实来源",
        value: item.originLabel || "来源不明",
        tone: badSource ? "bad" : "good",
        note: badSource ? "来源渠道不干净，高价买家会犹豫" : "来源清楚"
      },
      repair: {
        key: "repair",
        label: "维修历史",
        value: repaired ? "有维修痕迹" : "没有维修记录",
        tone: repaired ? "bad" : "good",
        note: repaired ? "有拆修痕迹，收藏价值下降" : "没有拆修记录"
      },
      provenance: {
        key: "provenance",
        label: "来源完整性",
        value: complete ? "来源完整可追溯" : "缺少完整来源",
        tone: complete ? "good" : "bad",
        note: complete ? "来源链条完整" : "拿不出连续来源证明"
      }
    },
    discovered: {},
    covered: {}
  };
  return item.truth;
}

export function truthFields(item) {
  return TRUTH_KEYS.map((key) => ensureTruth(item).fields[key]);
}

export function discoverTruth(item, key) {
  const truth = ensureTruth(item);
  if (!truth.fields[key] || truth.discovered[key]) {
    return null;
  }
  truth.discovered[key] = true;
  return truth.fields[key];
}

export function coverTruth(item, key, materialId) {
  ensureTruth(item).covered[key] = materialId;
}

export function truthVisible(item, key) {
  const truth = ensureTruth(item);
  return Boolean(truth.discovered[key]) && !truth.covered[key];
}

// 负面且没有被覆盖的真实信息会压低报价。
export function truthPenalty(item) {
  const truth = ensureTruth(item);
  let penalty = 0;
  TRUTH_KEYS.forEach((key) => {
    const field = truth.fields[key];
    if (field.tone !== "bad") {
      return;
    }
    penalty += truth.covered[key] ? 0.02 : 0.08;
  });
  return penalty;
}

// ---------- 操作抽取 ----------

export function needsClean(item) {
  const dirtyCondition = ["lightly_used", "long_stored", "damp", "rusted", "broken"].includes(
    item.condition.id
  );
  const dirtyLook = ["worn", "torn", "odor", "relabeled"].includes(item.appearance.id);
  return dirtyCondition || dirtyLook || hash(item.uid + "c") % 3 === 0;
}

export function needsCircuit(item) {
  return circuitKind(item) !== null;
}

// 用电的物品通电测试；内部结构复杂的机械物品只做拆装；简单工具不做拆装。
const ELECTRONIC_KEYWORDS =
  /相机|拍立得|收音机|手机|灯|录音|电台|显示器|camera|radio|phone|lamp/;
const MECHANICAL_KEYWORDS = /表|钟|罗盘|打字机|缝纫|机芯|watch|clock|compass|typewriter/;

export function circuitKind(item) {
  const key = `${item.templateId || ""} ${item.name || ""}`;
  if (ELECTRONIC_KEYWORDS.test(key)) {
    return "electronic";
  }
  if (MECHANICAL_KEYWORDS.test(key)) {
    return "mechanical";
  }
  return null;
}

// 每件物品都要清洁和用放大镜核对；只有用电或内部结构复杂的物品才拆装。
export function chooseOperations(item) {
  const operations = ["clean", "magnifier"];
  if (needsCircuit(item)) {
    operations.push("circuit");
  }
  return OPERATION_ORDER.filter((id) => operations.includes(id));
}

export function ensureFacts(item) {
  if (Array.isArray(item.facts)) {
    return item.facts;
  }
  item.facts = [
    {
      id: `${item.uid}-code`,
      kind: "code",
      label: "物品编号",
      value: item.code,
      discovered: false
    },
    {
      id: `${item.uid}-name`,
      kind: "name",
      label: "磨损姓名",
      value: pick(["L. M.", "L. K.", "A. R.", "J. W.", "周", "林"], hash(item.uid + "n")),
      discovered: false
    }
  ];
  return item.facts;
}

function discoverFact(item) {
  const fact = ensureFacts(item).find((entry) => !entry.discovered);
  if (!fact) {
    return null;
  }
  fact.discovered = true;
  return fact;
}

// ---------- 检视状态 ----------

function buildClean(item) {
  const count = 3 + (hash(item.uid + "d") % 2);
  const patches = [];
  for (let index = 0; index < count; index += 1) {
    const seed = mix(hash(`${item.uid}-dirt-${index}`));
    patches.push({
      id: `d${index}`,
      x: 0.18 + (seed % 62) / 100,
      y: 0.18 + ((seed >>> 9) % 62) / 100,
      r: 0.09 + ((seed >>> 18) % 5) / 100,
      progress: 0
    });
  }
  return { patches, distance: 0, need: patches.length * 0.55, scratched: false, done: false };
}

function buildCircuit(item) {
  const kind = circuitKind(item) || "mechanical";
  const condition = item.condition.id;
  const appearance = item.appearance.id;
  // 零件要不要拆装、要不要清洁内部、会不会拆坏，由物品状态和随机共同决定。
  const dirtyLikely =
    ["damp", "rusted", "long_stored", "lightly_used"].includes(condition) ||
    ["lining_torn", "rusted_surface", "missing_part"].includes(appearance);
  const damageLikely =
    ["broken", "rusted"].includes(condition) || appearance === "missing_part";
  const labels =
    kind === "electronic"
      ? ["主板", "接口排线"]
      : ["机芯", "传动齿轮"];
  return {
    kind,
    screws: [true, true, true, true],
    coverOpen: false,
    parts: [
      { id: "p0", slotX: 0.34, slotY: 0.44 },
      { id: "p1", slotX: 0.64, slotY: 0.62 }
    ].map((part, index) => ({
      id: part.id,
      label: labels[index],
      slotX: part.slotX,
      slotY: part.slotY,
      inTray: false,
      seated: true,
      broken: false,
      // 至少有一个零件需要拆下再装回。
      needsRemoval: index === 0 ? true : Math.random() < 0.55,
      reinstalled: false
    })),
    needClean: Math.random() < (dirtyLikely ? 0.75 : 0.25),
    willDamage: Math.random() < (damageLikely ? 0.6 : 0.15),
    orderRequired: Math.random() < 0.4,
    complication: null,
    order: null,
    dirt: null,
    damaged: false,
    mistakes: 0,
    powered: false,
    done: false
  };
}

function buildMagnifier(item) {
  const count = 3 + (hash(item.uid + "m") % 3);
  const spots = [];
  for (let index = 0; index < count; index += 1) {
    const seed = mix(hash(`${item.uid}-spot-${index}`));
    spots.push({
      id: `m${index}`,
      key: TRUTH_KEYS[index % TRUTH_KEYS.length],
      x: 0.16 + (seed % 66) / 100,
      y: 0.16 + ((seed >>> 9) % 66) / 100,
      r: 0.1,
      found: false,
      accuracy: 0
    });
  }
  return { spots, done: false };
}

export function ensureInspection(item) {
  if (item.inspection) {
    return item.inspection;
  }
  const operations =
    item.operations && item.operations.length ? item.operations : chooseOperations(item);
  item.operations = operations;
  item.inspection = {
    operations,
    results: {},
    damaged: false,
    clean: operations.includes("clean") ? buildClean(item) : null,
    circuit: operations.includes("circuit") ? buildCircuit(item) : null,
    magnifier: operations.includes("magnifier") ? buildMagnifier(item) : null
  };
  return item.inspection;
}

export function inspectionProgress(item) {
  const inspection = ensureInspection(item);
  const done = inspection.operations.filter((id) => inspection.results[id]).length;
  return {
    done,
    total: inspection.operations.length,
    completed: inspection.operations.every((id) => inspection.results[id])
  };
}

function finish(item, operationId, quality, message) {
  const inspection = ensureInspection(item);
  inspection.results[operationId] = { quality };
  if (quality === "perfect") {
    item.value = round10(item.value * 1.04);
  } else if (quality === "rough") {
    item.value = Math.max(10, round10(item.value * 0.96));
    inspection.damaged = true;
  }
  inspection.completed = inspection.operations.every((id) => inspection.results[id]);
  item.inspected = inspection.completed;
  return { ok: true, quality, text: message, completed: inspection.completed };
}

// ---------- 清洁 ----------

export function rubClean(item, x, y, radius) {
  const state = ensureInspection(item).clean;
  if (!state || state.done) {
    return { changed: false };
  }
  let changed = false;
  state.patches.forEach((patch) => {
    if (patch.progress >= 1) {
      return;
    }
    if (Math.hypot(patch.x - x, patch.y - y) <= patch.r + radius) {
      patch.progress = Math.min(1, patch.progress + 0.3);
      changed = true;
      if (patch.progress >= 1) {
        discoverFact(item);
      }
    }
  });
  return { changed, remaining: state.patches.filter((p) => p.progress < 1).length };
}

export function addStroke(item, amount) {
  const state = ensureInspection(item).clean;
  if (state && !state.done) {
    state.distance += amount;
  }
}

export function finishClean(item) {
  const state = ensureInspection(item).clean;
  if (!state || state.done) {
    return { ok: false, text: "清洁已经完成。" };
  }
  const remaining = state.patches.filter((patch) => patch.progress < 1).length;
  if (remaining > 0) {
    return { ok: false, text: `还有 ${remaining} 处污渍没有擦掉。` };
  }
  state.done = true;
  const ratio = state.distance / Math.max(0.4, state.need);
  const quality = ratio <= 1.2 ? "perfect" : ratio <= 1.8 ? "qualified" : "rough";
  state.scratched = quality === "rough";
  return finish(
    item,
    "clean",
    quality,
    quality === "rough"
      ? "污渍擦掉了，但用力过度，表面留下划痕。"
      : "污渍擦除干净，被遮住的刻印露了出来。"
  );
}

// ---------- 电路修复 ----------

export function unscrew(item, index) {
  const state = ensureInspection(item).circuit;
  if (!state || state.done) {
    return { ok: false, text: "当前没有电路修复操作。" };
  }
  if (!state.screws[index]) {
    return { ok: false, text: "这颗螺丝已经卸下来了。" };
  }
  state.screws[index] = false;
  const left = state.screws.filter(Boolean).length;
  return { ok: true, text: left ? `还剩 ${left} 颗螺丝。` : "四颗螺丝全部卸下，可以取下外壳。" };
}

export function openCover(item) {
  const state = ensureInspection(item).circuit;
  if (!state || state.done) {
    return { ok: false, text: "当前没有电路修复操作。" };
  }
  if (state.screws.some(Boolean)) {
    state.mistakes += 1;
    return { ok: false, text: "螺丝没有拆完，外壳卡住并抖了一下。" };
  }
  if (state.coverOpen) {
    return { ok: false, text: "外壳已经打开了。" };
  }
  state.coverOpen = true;
  // 揭开外壳后按物品状态给出对应情况。
  if (state.willDamage) {
    const target = state.parts[mix(hash(`${item.uid}-broken`)) % state.parts.length];
    target.broken = true;
    state.damaged = true;
  }
  if (state.orderRequired) {
    state.order = state.parts.slice().reverse().map((part) => part.id);
  }
  if (state.needClean) {
    state.dirt = { x: 0.5, y: 0.32, progress: 0 };
  }
  const complication = state.willDamage
    ? "damaged"
    : state.needClean
      ? "dirt"
      : state.orderRequired
        ? "order"
        : null;
  state.complication = complication;
  const notes = {
    damaged: "内部有一个零件已经损坏，拆下来就装不回去了。",
    dirt: "内部还有一层污渍，需要用清洁布擦掉。",
    order: "零件必须按照正确顺序装回，顺序错了会留下缝隙。",
    none: "零件需要拆下检查再装回，才能完成装机。"
  };
  return {
    ok: true,
    text: `外壳打开，可以看到内部零件。${notes[complication] || notes.none}`
  };
}

// 电路修复里的内部污渍也用清洁布擦掉。
export function rubCircuitDirt(item, x, y, radius) {
  const state = ensureInspection(item).circuit;
  if (!state || !state.dirt || state.dirt.progress >= 1) {
    return { changed: false };
  }
  if (Math.hypot(state.dirt.x - x, state.dirt.y - y) <= 0.22 + radius) {
    state.dirt.progress = Math.min(1, state.dirt.progress + 0.34);
    return { changed: true, done: state.dirt.progress >= 1 };
  }
  return { changed: false };
}

export function pullPart(item, partId) {
  const state = ensureInspection(item).circuit;
  const part = state && state.parts.find((entry) => entry.id === partId);
  if (!state || !part || state.done) {
    return { ok: false, text: "没有这个零件。" };
  }
  if (!state.coverOpen) {
    return { ok: false, text: "先打开外壳。" };
  }
  if (part.broken) {
    part.inTray = true;
    part.seated = false;
    return { ok: true, text: `${part.label}拆下来了，但已经损坏，装不回去。` };
  }
  part.inTray = true;
  part.seated = false;
  part.removed = true;
  return { ok: true, text: `${part.label}已放进零件托盘，检查有没有烧黑或断线。` };
}

export function seatPart(item, partId, x, y) {
  const state = ensureInspection(item).circuit;
  const part = state && state.parts.find((entry) => entry.id === partId);
  if (!state || !part || state.done) {
    return { ok: false, text: "没有这个零件。" };
  }
  if (!part.inTray) {
    return { ok: false, text: "先从物品上取下零件。" };
  }
  if (part.broken) {
    state.mistakes += 1;
    return { ok: false, text: `${part.label}已经损坏，装不回去。` };
  }
  if (state.order) {
    const expected = state.order.find((id) => {
      const entry = state.parts.find((candidate) => candidate.id === id);
      return entry && !entry.seated && !entry.broken;
    });
    if (expected && expected !== part.id) {
      state.mistakes += 1;
      return { ok: false, text: `安装顺序不对，应该先装${state.parts.find((c) => c.id === expected).label}。` };
    }
  }
  if (Math.hypot(part.slotX - x, part.slotY - y) <= 0.16) {
    part.seated = true;
    part.inTray = false;
    part.reinstalled = true;
    return { ok: true, text: `${part.label}装回幽灵槽位，自动吸附。` };
  }
  state.mistakes += 1;
  return { ok: false, text: `${part.label}放错位置，没能完全贴合。` };
}

export function powerOn(item) {
  const state = ensureInspection(item).circuit;
  if (!state || state.done) {
    return { ok: false, text: "当前没有电路修复操作。" };
  }
  if (state.dirt && state.dirt.progress < 1) {
    state.mistakes += 1;
    return { ok: false, text: "内部污渍还没有擦掉，线路接触不良。" };
  }
  // 需要拆装的零件必须拆下再装回，没处理完不让收尾。
  const unfinished = state.parts.some(
    (part) => part.needsRemoval && !part.reinstalled && !part.broken
  );
  if (!state.coverOpen || unfinished) {
    state.mistakes += 1;
    return { ok: false, text: "还有需要拆装的零件没有拆下并装回，线路不通。" };
  }
  state.powered = state.kind === "electronic";
  state.done = true;
  let quality = state.mistakes === 0 ? "perfect" : state.mistakes <= 2 ? "qualified" : "rough";
  if (state.damaged && quality === "perfect") {
    quality = "qualified";
  }
  if (state.damaged) {
    item.value = round10(item.value * 0.9);
  }
  const message =
    state.kind === "electronic"
      ? state.damaged
        ? "线路通电，但损坏的零件让物品价值下降。"
        : "线路通电，指示灯亮了起来。"
      : state.damaged
        ? "机芯装回，但损坏的零件让物品价值下降。"
        : "机芯装回，结构恢复正常。";
  return finish(item, "circuit", quality, message);
}

// ---------- 放大镜检查 ----------

export function lookThrough(item, x, y, radius) {
  const state = ensureInspection(item).magnifier;
  if (!state || state.done) {
    return { found: null, done: true };
  }
  let found = null;
  for (const spot of state.spots) {
    if (spot.found) {
      continue;
    }
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance <= spot.r + radius) {
      spot.found = true;
      spot.accuracy = Math.max(0, 1 - distance / (spot.r + radius));
      found = discoverTruth(item, spot.key);
      if (!found) {
        const remaining = TRUTH_KEYS.filter((key) => !ensureTruth(item).discovered[key]);
        if (remaining.length) {
          found = discoverTruth(item, remaining[0]);
        }
      }
      break;
    }
  }
  return { found, done: state.spots.every((spot) => spot.found) };
}

export function finishMagnifier(item) {
  const state = ensureInspection(item).magnifier;
  if (!state || state.done) {
    return { ok: false, text: "放大镜检查已经完成。" };
  }
  const missed = state.spots.filter((spot) => !spot.found).length;
  if (missed > 0) {
    return { ok: false, text: `还有 ${missed} 处没有放大核对。` };
  }
  state.done = true;
  TRUTH_KEYS.forEach((key) => discoverTruth(item, key));
  const accuracy = state.spots.reduce((sum, spot) => sum + spot.accuracy, 0) / state.spots.length;
  const quality = accuracy >= 0.55 ? "perfect" : accuracy >= 0.3 ? "qualified" : "rough";
  return finish(item, "magnifier", quality, "五项真实信息全部核对完毕。");
}

// ---------- 伪造 ----------

const MATERIAL_COVERS = {
  fake_blank_label: ["trueYear", "source"],
  fake_material: ["condition", "repair"],
  fake_packaging: ["condition", "provenance"],
  fake_source: ["source", "provenance"]
};

export function coversOf(materialId) {
  return MATERIAL_COVERS[materialId] || [];
}

// 拖放位置离目标区越近，伪造质量越高。
export function scoreForgeryDrop(x, y, targetX = 0.5, targetY = 0.45) {
  const distance = Math.hypot(x - targetX, y - targetY);
  const quality = distance <= 0.11 ? "perfect" : distance <= 0.24 ? "qualified" : "rough";
  return { quality, distance };
}

export function qualityFactor(quality) {
  if (quality === "perfect") {
    return { lift: 1.1, exposure: 0.75 };
  }
  if (quality === "rough") {
    return { lift: 0.9, exposure: 1.35 };
  }
  return { lift: 1, exposure: 1 };
}
