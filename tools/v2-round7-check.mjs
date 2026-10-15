// 买家系统验证：性格标签、按物品状态生成的问题、三种选项、编造被识破、价格上限与压价、黑名单。
// 用法：先启动 node server.js，再运行 node tools/v2-round7-check.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.check-round7";
const TARGET = process.argv[3] || "http://127.0.0.1:4173/v2.html";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("favicon")) {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const inScene = (selector) => `.scene.is-active ${selector}`;
const panelText = (name) =>
  page.evaluate((layerName) => {
    const el = document.querySelector(`.scene.is-active .layer[data-name="${layerName}"]`);
    return el ? el.textContent.replace(/\s+/g, " ").trim() : null;
  }, name);

async function click(selector) {
  const handles = await page.$$(inScene(selector));
  for (const handle of handles) {
    if (await handle.isVisible()) {
      await handle.click();
      return true;
    }
  }
  return false;
}

const optionLabels = () =>
  page.evaluate(() =>
    ["玩家选项一", "玩家选项二", "玩家选项三"]
      .map((name) => {
        const el = document.querySelector(`.scene.is-active .layer[data-name="${name}"]`);
        if (!el || el.classList.contains("is-hidden")) {
          return null;
        }
        return { reply: el.dataset.reply, text: el.textContent.replace(/\s+/g, " ").trim() };
      })
      .filter(Boolean)
  );

// 构造一件状态受控的物品，并挂上橱窗。
const SETUP_ITEM = `
  async (spec) => {
    const inspect = await import("/js/v2/inspect.js");
    const st = window.__lastBox.state;
    const item = {
      uid: spec.uid,
      templateId: spec.uid,
      name: spec.name,
      category: spec.category || "common",
      baseValue: spec.value,
      value: spec.value,
      condition: { id: spec.conditionId, label: spec.conditionLabel },
      appearance: { id: spec.appearanceId, label: spec.appearanceLabel },
      label: { id: "old", label: "旧物" },
      originId: "station_warehouse",
      originLabel: "车站仓库清仓",
      code: spec.code || "T-42",
      acquisitionCost: Math.round(spec.value * 0.4),
      traitId: null,
      storyId: spec.storyId || null,
      facts: null,
      inspection: null,
      operations: null,
      truth: null,
      forgery: null
    };
    inspect.ensureTruth(item);
    inspect.ensureInspection(item);
    item.operations.forEach((id) => {
      item.inspection.results[id] = { quality: "perfect" };
    });
    item.inspection.completed = true;
    item.inspected = true;
    if (spec.discoverCode) {
      inspect.ensureFacts(item).forEach((fact) => {
        fact.discovered = true;
      });
    }
    if (spec.discoverTruth) {
      Object.keys(item.truth.discovered).forEach((key) => {
        item.truth.discovered[key] = true;
      });
      item.truth.discovered.source = true;
    }
    st.listingSeq = (st.listingSeq || 0) + 1;
    st.listings = [
      {
        id: "listing-" + st.listingSeq,
        item,
        price: spec.price,
        tags: ["旧物", "可收藏"],
        days: 1,
        day: st.day,
        arrivalDay: st.day,
        arrivalKind: "quick",
        arrivalAt: Date.now(),
        status: "waiting"
      }
    ];
    st.inventory = [];
    st.buyer = null;
    return item.name;
  }
`;

async function setupItem(spec) {
  const name = await page.evaluate(
    async ({ source, payload }) => {
      const factory = eval(source);
      return await factory(payload);
    },
    { source: SETUP_ITEM, payload: spec }
  );
  await click('[data-role="calendar"]');
  await page.waitForTimeout(200);
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(300);
  return name;
}

async function summonBuyer(profileId) {
  const info = await page.evaluate(async (wanted) => {
    const listingModule = await import("/js/v2/listing.js");
    const st = window.__lastBox.state;
    if (wanted) {
      // 固定买家档案，便于复现。
      const data = await import("/js/data.js");
      const profile = data.STAGE_TWO_DATA.buyerProfiles.find((entry) => entry.id === wanted);
      const listing = st.listings[0];
      const buyerModule = await import("/js/v2/buyer.js");
      listingModule.arriveBuyer(st);
      if (st.buyer && profile) {
        // 直接替换成指定档案，保留问题与价格信息。
        st.buyer.profileId = profile.id;
        st.buyer.name = profile.name;
        st.buyer.displayId = profile.displayId;
        st.buyer.preference = profile.preference;
        st.buyer.personality = buyerModule.personalityTag(profile.id);
        st.buyer.opening = profile.opening;
        st.buyer.questions = buyerModule.buildQuestions(listing.item, profile, {
          priceOverflow: st.buyer.priceOverflow
        });
      }
    } else {
      listingModule.arriveBuyer(st);
    }
    return st.buyer
      ? {
          name: st.buyer.name,
          profileId: st.buyer.profileId,
          personality: st.buyer.personality,
          trust: st.buyer.trust,
          perceived: st.buyer.perceived,
          reference: st.buyer.reference,
          questionCount: st.buyer.questions.length,
          questions: st.buyer.questions.map((q) => ({
            id: q.id,
            kind: q.kind,
            text: q.text,
            options: q.replies.map((r) => ({ id: r.id, type: r.type, text: r.text }))
          }))
        }
      : null;
  }, profileId);
  // 触发一次重绘，让买家窗口和选项显示出来。
  await click('[data-role="calendar"]');
  await page.waitForTimeout(180);
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(280);
  return info;
}

async function forceRandom(value) {
  await page.evaluate((fixed) => {
    if (fixed === null) {
      if (window.__originalRandom) {
        Math.random = window.__originalRandom;
      }
      return;
    }
    window.__originalRandom = window.__originalRandom || Math.random;
    Math.random = () => fixed;
  }, value);
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
await page.click('#mascot [data-mascot="skip"]');
await page.waitForTimeout(400);
await click('[data-role="calendar"]');
await page.waitForTimeout(500);

// ---------- 1. 问题跟着物品状态走 ----------
await setupItem({
  uid: "antique_tea_set",
  name: "古董茶具",
  category: "luxury",
  conditionId: "damp",
  conditionLabel: "受潮",
  appearanceId: "odor",
  appearanceLabel: "有明显异味",
  value: 1200,
  price: 900,
  discoverCode: true
});
const dampBuyer = await summonBuyer();
console.log("1 受潮物品提问 ", JSON.stringify(dampBuyer && {
  name: dampBuyer.name,
  personality: dampBuyer.personality,
  trust: dampBuyer.trust,
  questionCount: dampBuyer.questionCount,
  questions: dampBuyer.questions.map((q) => `${q.id}:${q.text}`),
  optionTypes: dampBuyer.questions[0].options.map((o) => o.type)
}));
await shot("01-buyer-first");
console.log("2 界面选项     ", JSON.stringify(await optionLabels()));
console.log("3 气泡文本     ", (await panelText("买家对话气泡"))?.slice(0, 200));

// ---------- 2. 编造被识破 ----------
const beforeCatch = await page.evaluate(() => {
  const st = window.__lastBox.state;
  return { reputation: st.reputation, trouble: st.trouble, listings: st.listings.length };
});
await forceRandom(0);
await click('[data-reply="lie"]');
await page.waitForTimeout(400);
await forceRandom(null);
const afterCatch = await page.evaluate(() => {
  const st = window.__lastBox.state;
  return {
    reputation: st.reputation,
    trouble: st.trouble,
    listings: st.listings.length,
    shelf: st.inventory.map((e) => e.name),
    detected: st.buyer && st.buyer.detected ? st.buyer.detected.slice(0, 60) : null,
    deceived: st.buyerDeceived,
    blacklist: st.buyerBlacklist
  };
});
console.log("4 识破后果     ", JSON.stringify({ before: beforeCatch, after: afterCatch }));
await shot("02-buyer-caught");
console.log("5 识破文案     ", (await panelText("买家对话气泡"))?.slice(0, 120));
await click('[data-role="buyerLeave"]');
await page.waitForTimeout(300);
console.log(
  "6 买家离店     ",
  JSON.stringify(await page.evaluate(() => ({ buyer: window.__lastBox.state.buyer })))
);

// ---------- 3. 三次识破进黑名单 ----------
for (let round = 0; round < 3; round += 1) {
  await setupItem({
    uid: "backup_phone",
    name: "备用手机",
    category: "common",
    conditionId: "normal",
    conditionLabel: "普通",
    appearanceId: "complete",
    appearanceLabel: "完整",
    value: 700,
    price: 500
  });
  await summonBuyer("seven_warehouse");
  await forceRandom(0);
  await click('[data-reply="lie"]');
  await page.waitForTimeout(350);
  await forceRandom(null);
  await click('[data-role="buyerLeave"]');
  await page.waitForTimeout(250);
}
console.log(
  "7 黑名单       ",
  JSON.stringify(
    await page.evaluate(async () => {
      const st = window.__lastBox.state;
      const buyerModule = await import("/js/v2/buyer.js");
      return {
        deceived: st.buyerDeceived,
        blacklist: st.buyerBlacklist,
        sevenBlocked: buyerModule.isBlacklisted(st, "seven_warehouse"),
        day: st.day
      };
    })
  )
);

// 只剩一位没被拉黑时，到店买家必须是他
await setupItem({
  uid: "love_letter",
  name: "未寄出的情书",
  category: "common",
  conditionId: "normal",
  conditionLabel: "普通",
  appearanceId: "complete",
  appearanceLabel: "完整",
  value: 200,
  price: 150
});
console.log(
  "8 拉黑后选人   ",
  JSON.stringify(
    await page.evaluate(async () => {
      const st = window.__lastBox.state;
      st.buyerBlacklist = {
        paper_crane: st.day + 3,
        blue_ledger: st.day + 3,
        old_fox: st.day + 3,
        seven_warehouse: st.day + 3,
        velvet_broker: st.day + 3
      };
      st.buyer = null;
      st.listings.forEach((entry) => {
        entry.status = "waiting";
      });
      const listingModule = await import("/js/v2/listing.js");
      listingModule.arriveBuyer(st);
      return st.buyer ? st.buyer.profileId : null;
    })
  )
);

// ---------- 4. 高额出售的代价 ----------
await setupItem({
  uid: "gold_watch",
  name: "金表",
  category: "luxury",
  conditionId: "normal",
  conditionLabel: "普通",
  appearanceId: "complete",
  appearanceLabel: "完整",
  value: 2350,
  price: 5000
});
const expensive = await summonBuyer("velvet_broker");
console.log(
  "9 高额挂牌     ",
  JSON.stringify({
    price: 5000,
    reference: expensive && expensive.reference,
    perceived: expensive && expensive.perceived,
    questions: expensive && expensive.questions.map((q) => q.id)
  })
);
await shot("03-buyer-expensive");

// 信任拉满后给答复：成交价不能超过感知价
await forceRandom(0.99);
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.buyer.trust = 100;
});
await page.evaluate(() => {
  window.__lastBox.state.buyer.questionIndex = window.__lastBox.state.buyer.questions.length;
});
await click('[data-role="calendar"]');
await page.waitForTimeout(150);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);
await click('[data-role="settleBuyer"]');
await page.waitForTimeout(400);
const settleHigh = await page.evaluate(() => {
  const st = window.__lastBox.state;
  return {
    toast: document.getElementById("toast").textContent,
    cash: st.cash,
    listings: st.listings.length,
    buyer: Boolean(st.buyer)
  };
});
await forceRandom(null);
console.log("10 高价成交     ", JSON.stringify(settleHigh));

// 信任偏低的磨价买家：走压价分支
await setupItem({
  uid: "small_painting",
  name: "小型收藏画",
  category: "luxury",
  conditionId: "normal",
  conditionLabel: "普通",
  appearanceId: "complete",
  appearanceLabel: "完整",
  value: 1780,
  price: 1500
});
const grinder = await summonBuyer("blue_ledger");
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.buyer.questionIndex = st.buyer.questions.length;
  st.buyer.trust = 46;
});
await forceRandom(0.99);
await click('[data-role="calendar"]');
await page.waitForTimeout(150);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);
await click('[data-role="settleBuyer"]');
await page.waitForTimeout(400);
await forceRandom(null);
console.log(
  "11 磨价压价     ",
  JSON.stringify(
    await page.evaluate(() => ({
      toast: document.getElementById("toast").textContent,
      perceived: window.__lastBox.state.listings[0]
        ? window.__lastBox.state.listings[0].price
        : null
    }))
  )
);
await shot("04-buyer-haggle");

// ---------- 5. 选项顺序随机 ----------
console.log(
  "12 选项顺序     ",
  JSON.stringify(
    await page.evaluate(async () => {
      const buyerModule = await import("/js/v2/buyer.js");
      const data = await import("/js/data.js");
      const inspect = await import("/js/v2/inspect.js");
      const item = {
        uid: "order-test",
        templateId: "order-test",
        name: "测试物",
        category: "common",
        value: 300,
        condition: { id: "damp", label: "受潮" },
        appearance: { id: "odor", label: "明显异味" },
        label: { id: "old", label: "旧物" },
        code: "T-1"
      };
      inspect.ensureTruth(item);
      inspect.ensureInspection(item);
      const profile = data.STAGE_TWO_DATA.buyerProfiles[0];
      const orders = new Set();
      for (let index = 0; index < 12; index += 1) {
        const questions = buyerModule.buildQuestions(item, profile, { priceOverflow: 0 });
        orders.add(questions[0].replies.map((r) => r.type).join("-"));
      }
      return Array.from(orders);
    })
  )
);

// ---------- 6. 教学期第一笔交易不失败 ----------
await setupItem({
  uid: "instant_camera",
  name: "旧拍立得",
  category: "common",
  conditionId: "normal",
  conditionLabel: "普通",
  appearanceId: "complete",
  appearanceLabel: "完整",
  value: 380,
  price: 4000
});
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.tutorial.mode = "full";
  st.buyerBlacklist = {};
});
await summonBuyer("seven_warehouse");
console.log(
  "13 教学保底     ",
  JSON.stringify(
    await page.evaluate(async () => {
      const st = window.__lastBox.state;
      st.buyer.questionIndex = st.buyer.questions.length;
      st.buyer.trust = 12;
      const original = Math.random;
      Math.random = () => 0.99;
      const listingModule = await import("/js/v2/listing.js");
      const result = listingModule.settleBuyer(st);
      Math.random = original;
      return {
        result: result.result,
        income: result.income,
        text: result.text,
        listings: st.listings.length,
        buyer: Boolean(st.buyer)
      };
    })
  )
);

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.slice(0, 6).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
