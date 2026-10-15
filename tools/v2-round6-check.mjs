// 本轮验证：藏品收纳盒、麻烦值、伪造面板商城入口、图鉴表达、借贷利息与还款计划。
// 用法：先启动 node server.js，再运行 node tools/v2-round6-check.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.check-round6";
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
const visible = (selector) => page.isVisible(inScene(selector));
const panelText = (name) =>
  page.evaluate((layerName) => {
    const el = document.querySelector(`.scene.is-active .layer[data-name="${layerName}"]`);
    return el ? el.textContent.replace(/\s+/g, " ").trim() : null;
  }, name);
const ui = (keys) =>
  page.evaluate((list) => {
    const current = window.__lastBox.ui;
    const out = {};
    list.forEach((key) => {
      out[key] = current[key];
    });
    return out;
  }, keys);

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

// 直接改 state 之后，用一次界面操作触发重绘。
async function forceRefresh() {
  await click('[data-role="keepsake"]');
  await page.waitForTimeout(220);
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(260);
}

// 构造测试用物品。
const ITEM_FACTORY = `
  (id, name, category, traitId, value) => ({
    uid: id, templateId: id, name, category,
    baseValue: value, value,
    condition: { id: "normal", label: "正常" },
    appearance: { id: "complete", label: "完整" },
    label: { id: "old", label: "旧物" },
    code: "T-00", acquisitionCost: 100, traitId,
    facts: null, inspection: null, operations: null, truth: null, forgery: null
  })
`;

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
await page.click('#mascot [data-mascot="skip"]');
await page.waitForTimeout(400);
await click('[data-role="calendar"]');
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__lotBackup = JSON.parse(JSON.stringify(window.__lastBox.state.lots[0]));
});

// ---------- 1. 藏品 ----------
await page.evaluate((factory) => {
  const mk = eval(factory);
  const st = window.__lastBox.state;
  st.inventory = [
    mk("wedding_rings", "一对对戒", "luxury", "buyer_trust_global", 900),
    mk("antique_tea_set", "古董茶具", "luxury", "resale_bonus", 700),
    mk("stock_documents", "股票文件", "common", "resale_bonus", 600),
    mk("designer_bag", "名牌包", "luxury", "sale_bonus_global", 800),
    mk("gold_watch", "金表", "luxury", "reputation_bonus", 1200),
    mk("small_painting", "小型收藏画", "luxury", "cash_bonus", 1500)
  ];
}, ITEM_FACTORY);

await click('[data-role="keepsake"]');
await page.waitForTimeout(300);
console.log("1 收纳盒空    ", await panelText("收纳盒窗口"));
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);

await click('[data-role="item"][data-item="wedding_rings"]');
await page.waitForTimeout(250);
console.log("2 详情属性    ", (await panelText("物品详情窗口"))?.slice(0, 80));
await click('[data-role="keepItem"]');
await page.waitForTimeout(300);
console.log(
  "3 自留结果    ",
  JSON.stringify(
    await page.evaluate(() => ({
      keepsakes: window.__lastBox.state.keepsakes.map((e) => `${e.name}:${e.traitId}`),
      toast: document.getElementById("toast").textContent
    }))
  )
);

for (const id of ["antique_tea_set", "stock_documents"]) {
  await click(`[data-role="item"][data-item="${id}"]`);
  await page.waitForTimeout(250);
  await click('[data-role="keepItem"]');
  await page.waitForTimeout(300);
}
await click('[data-role="keepsake"]');
await page.waitForTimeout(300);
console.log("4 同标签去重  ", await panelText("收纳盒窗口"));
await shot("01-keepsake");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);

await click('[data-role="item"][data-item="designer_bag"]');
await page.waitForTimeout(250);
await click('[data-role="keepItem"]');
await page.waitForTimeout(300);
console.log(
  "5 盒子已满    ",
  JSON.stringify(
    await page.evaluate(() => ({
      keepsakes: window.__lastBox.state.keepsakes.map((e) => e.name),
      inventory: window.__lastBox.state.inventory.map((e) => e.name)
    }))
  )
);

// 满盒后自留 -> 确认框 -> 否 -> 回物品详情
await click('[data-role="item"][data-item="gold_watch"]');
await page.waitForTimeout(250);
console.log(
  "6 售出型藏品  ",
  (await panelText("物品详情窗口"))?.slice(0, 60)
);
await click('[data-role="keepItem"]');
await page.waitForTimeout(300);
await shot("02-keepsake-ask");
console.log("7 满盒确认框  ", (await panelText("收纳盒确认"))?.slice(0, 90));
await click('[data-role="keepsakeNo"]');
await page.waitForTimeout(350);
console.log(
  "8 选否回详情  ",
  JSON.stringify(
    await ui(["sheet", "returnSheet"])
  )
);

// 再自留 -> 是 -> 选格子替换
await click('[data-role="keepItem"]');
await page.waitForTimeout(300);
await click('[data-role="keepsakeYes"]');
await page.waitForTimeout(350);
await shot("03-keepsake-pick");
console.log("9 替换选择窗  ", (await panelText("收纳盒窗口"))?.slice(0, 80));
console.log(
  "   悬停提示    ",
  JSON.stringify(
    await page.evaluate(() => {
      const slot = document.querySelector(
        '.scene.is-active [data-role="keepsakeSlot"]'
      );
      return slot
        ? { title: slot.getAttribute("title"), tip: slot.textContent.includes("点击以替换藏品") }
        : null;
    })
  )
);
await click('[data-role="keepsakeSlot"][data-keepsake="stock_documents"]');
await page.waitForTimeout(400);
console.log(
  "10 替换结果   ",
  JSON.stringify(
    await page.evaluate(() => ({
      keepsakes: window.__lastBox.state.keepsakes.map((e) => e.name),
      shelf: window.__lastBox.state.inventory.map((e) => e.name),
      toast: document.getElementById("toast").textContent,
      sheet: window.__lastBox.ui.sheet
    }))
  )
);

// 普通物品没有自留
await click('[data-role="item"][data-item="small_painting"]');
await page.waitForTimeout(250);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.inventory.push({
    uid: "love_letter",
    templateId: "love_letter",
    name: "未寄出的情书",
    category: "common",
    baseValue: 120,
    value: 120,
    condition: { id: "normal", label: "正常" },
    appearance: { id: "complete", label: "完整" },
    label: { id: "old", label: "旧物" },
    code: "T-22",
    acquisitionCost: 50,
    traitId: null,
    facts: null,
    inspection: null,
    operations: null,
    truth: null,
    forgery: null
  });
});
await forceRefresh();
await click('[data-role="item"][data-item="love_letter"]');
await page.waitForTimeout(250);
console.log(
  "11 普通物品    ",
  JSON.stringify(
    await page.evaluate(() => ({
      hasKeep: Boolean(document.querySelector('.scene.is-active [data-role="keepItem"]')),
      hasSell: Boolean(document.querySelector('.scene.is-active [data-role="openListing"]'))
    }))
  )
);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);

// ---------- 2. 伪造面板的商城入口 ----------
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.cash = 3000;
  const item = st.inventory.find((e) => e.uid === "love_letter");
  const inspection = window.__lastBox.ensureInspection(item);
  inspection.operations.forEach((id) => {
    inspection.results[id] = { quality: "perfect" };
  });
  inspection.completed = true;
  item.inspected = true;
});
await click('[data-role="item"][data-item="love_letter"]');
await page.waitForTimeout(250);
await click('[data-role="openInspect"]');
await page.waitForTimeout(350);
await click('[data-role="tool"][data-tool="forge"]');
await page.waitForTimeout(350);
await shot("04-forge");
console.log(
  "12 伪造商城键 ",
  JSON.stringify({ hasButton: await visible('[data-role="openForgeMall"]') })
);
await click('[data-role="openForgeMall"]');
await page.waitForTimeout(400);
console.log("13 打开商城   ", JSON.stringify(await ui(["sheet", "returnSheet"])));
await shot("05-forge-mall");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(400);
console.log(
  "14 回到检视台 ",
  JSON.stringify(
    await page.evaluate(() => ({
      sheet: window.__lastBox.ui.sheet,
      inspectMode: window.__lastBox.ui.inspectMode,
      forgeOpen: Boolean(window.__lastBox.ui.forge),
      panel: Boolean(
        document.querySelector('.scene.is-active [data-role="openForgeMall"]')
      )
    }))
  )
);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);

// ---------- 3. 图鉴表达 ----------
await page.evaluate(() => {
  window.__lastBox.state.compendium.items.gold_watch = {
    seen: 2,
    verified: true,
    sold: 1,
    label: "金表"
  };
});
await click('[data-role="notebook"]');
await page.waitForTimeout(350);
await click('[data-role="nbTab"][data-tab="book"]');
await page.waitForTimeout(350);
await shot("06-compendium");
console.log(
  "15 图鉴表达   ",
  JSON.stringify(
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".scene.is-active .compendium-item"));
      const boxes = Array.from(document.querySelectorAll(".scene.is-active .compendium-boxes > *"));
      return {
        itemTiles: items.length,
        itemTexts: items
          .filter((el) => !el.querySelector(".is-silhouette"))
          .map((el) => el.textContent.replace(/\s+/g, " ").trim()),
        silhouettes: items.filter((el) => el.querySelector(".is-silhouette")).length,
        boxTiles: boxes.length,
        boxText: boxes.map((el) => el.textContent.trim()).join(""),
        boxStyle: boxes[0] ? boxes[0].getAttribute("style") : null
      };
    })
  )
);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);

// ---------- 售出型藏品属性结算 ----------
console.log(
  "16 售出型属性 ",
  JSON.stringify(
    await page.evaluate(async () => {
      const mod = await import("/js/v2/keepsake.js");
      const state = { reputation: 50, cash: 0, ledger: {} };
      const first = mod.applySellTraits(state, { traitId: "reputation_bonus" }, 1000);
      const second = mod.applySellTraits(state, { traitId: "cash_bonus" }, 1000);
      return { reputation: state.reputation, cash: state.cash, first, second };
    })
  )
);

// ---------- 4. 麻烦值：当众开箱 ----------
await page.evaluate((factory) => {
  const mk = eval(factory);
  const st = window.__lastBox.state;
  st.cash = 5000;
  st.trouble = 0;
  st.lots = [JSON.parse(JSON.stringify(window.__lotBackup))];
  st.lotIndex = 0;
  st.lots[0].items = [
    mk("a", "奢侈品一", "luxury", null, 600),
    mk("b", "奢侈品二", "luxury", null, 600),
    mk("c", "奢侈品三", "luxury", null, 600),
    Object.assign(mk("d", "违禁品一", "special", null, 900), { contraband: true })
  ];
  st.auction = { price: st.lots[0].startPrice, leader: null, status: "live", lastAction: "start" };
}, ITEM_FACTORY);
await click('[data-role="hammer"]');
await page.waitForTimeout(600);
for (let step = 0; step < 40; step += 1) {
  if (await visible('[data-name="成交印章"]')) {
    break;
  }
  if (await visible('[data-name="加价"]')) {
    await click('[data-name="加价"]');
    await page.waitForTimeout(120);
    continue;
  }
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1000);
console.log("16 进入处置   ", await page.evaluate(() => window.__lastBox.scene));
await click('[data-role="route"][data-route="onsite"]');
await page.waitForTimeout(500);
await shot("07-onsite");
console.log(
  "17 当众开箱   ",
  JSON.stringify(
    await page.evaluate(() => ({
      trouble: window.__lastBox.state.trouble,
      toast: document.getElementById("toast").textContent
    }))
  )
);

// ---------- 5. 借贷 ----------
// 先把现场报价结算掉，回到拍卖场，再制造第 4 天的高额箱。
await click('[data-role="onsiteSell"]');
await page.waitForTimeout(600);
console.log("18 回到场景   ", await page.evaluate(() => window.__lastBox.scene));
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.day = 4;
  st.cash = 100;
  st.totalDebt = 0;
  st.debtPlan = { debt: 0, periods: 0, interval: 3, termDays: 0, perPayment: 0 };
  st.nextPayment = { amount: 0, dueDay: 0 };
  st.tutorial.day4Asked = false;
  st.pendingWon = null;
  st.lots = [JSON.parse(JSON.stringify(window.__lotBackup))];
  st.lots[0].highValue = true;
  st.lots[0].startPrice = 900;
  st.lotIndex = 0;
  st.auction = { price: 900, leader: null, status: "live", lastAction: "start" };
});
await click('[data-role="calendar"]');
await page.waitForTimeout(500);
await click('[data-role="hammer"]');
await page.waitForTimeout(700);
console.log(
  "19 第四天引导 ",
  JSON.stringify(
    await page.evaluate(() => ({
      dialogue: window.__lastBox.ui.dialogue && window.__lastBox.ui.dialogue.id,
      pendingLoan: window.__lastBox.ui.pendingLoan
    }))
  )
);
if (await page.isVisible('#mascot [data-mascot="need"]')) {
  await page.click('#mascot [data-mascot="need"]');
  await page.waitForTimeout(300);
  await page.click('#mascot [data-mascot="ok"]');
  await page.waitForTimeout(500);
  await shot("08-loan");
  console.log("20 垫资面板   ", (await panelText("黑匣广告海报"))?.slice(0, 180));
  await click('[data-role="takeLoan"]');
  await page.waitForTimeout(400);
  console.log(
    "21 借款结果   ",
    JSON.stringify(
      await page.evaluate(() => {
        const st = window.__lastBox.state;
        return {
          cash: st.cash,
          totalDebt: st.totalDebt,
          plan: st.debtPlan,
          nextPayment: st.nextPayment,
          history: st.loanHistory
        };
      })
    )
  );
}

// 还款计划：第 7 天收第一期
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.cash = 6000;
  st.day = 7;
  st.buyer = null;
  st.pendingWon = null;
});
await click('[data-role="calendar"]');
await page.waitForTimeout(500);
await click('[data-role="closeDay"]');
await page.waitForTimeout(500);
if (await page.isVisible('button[data-menu="confirmClose"]')) {
  await page.click('button[data-menu="confirmClose"]');
  await page.waitForTimeout(600);
}
console.log(
  "21 第一期还款 ",
  JSON.stringify(
    await page.evaluate(() => {
      const st = window.__lastBox.state;
      return {
        day: st.day,
        totalDebt: st.totalDebt,
        paidPeriods: st.paidPeriods,
        nextPayment: st.nextPayment,
        plan: st.debtPlan,
        paid: st.lastSettlement && st.lastSettlement.payment,
        overdue: st.lastSettlement && st.lastSettlement.overdue
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
