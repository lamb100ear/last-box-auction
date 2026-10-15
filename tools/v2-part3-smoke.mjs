// 2.0 第三部分冒烟测试：小黑引导、强制带回家、记事本、万物通、图鉴、店铺升级。
// 用法：先启动 node server.js，再运行 node tools/v2-part3-smoke.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.smoke3";
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
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().includes("favicon")) {
    errors.push(`http ${response.status()} ${response.url()}`);
  }
});

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const inScene = (selector) => `.scene.is-active ${selector}`;
const visible = (selector) => page.isVisible(inScene(selector));

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

async function clickNth(selector, index) {
  const handles = await page.$$(inScene(selector));
  let seen = 0;
  for (const handle of handles) {
    if (await handle.isVisible()) {
      if (seen === index) {
        await handle.click();
        return true;
      }
      seen += 1;
    }
  }
  return false;
}

async function clickMascot(optionId) {
  const selector = `#mascot [data-mascot="${optionId}"]`;
  if (await page.isVisible(selector)) {
    await page.click(selector);
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

// 教学步骤用「继续」手动推进。
async function advanceMascot() {
  const selector = '#mascot [data-mascot="ok"]';
  if (await page.isVisible(selector)) {
    await page.click(selector);
    await page.waitForTimeout(220);
    return true;
  }
  return false;
}

const snapshot = () =>
  page.evaluate(() => {
    const state = window.__lastBox.state;
    const tutorial = state.tutorial || {};
    return {
      scene: window.__lastBox.scene,
      day: state.day,
      cash: state.cash,
      tutorial: `${tutorial.mode}/${tutorial.index}`,
      dialogue: (window.__lastBox.ui.dialogue || {}).id || null,
      keywords: (state.notebook && state.notebook.keywords.length) || 0,
      results: (state.notebook && state.notebook.results.length) || 0,
      boxes: (state.compendium && Object.keys(state.compendium.boxes).length) || 0,
      items: (state.compendium && Object.keys(state.compendium.items).length) || 0,
      buyers: (state.compendium && Object.keys(state.compendium.buyers).length) || 0,
      shopLevel: state.shopLevel
    };
  });

async function waitForScene(name, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const scene = await page.evaluate(() => window.__lastBox.scene);
    if (scene === name) {
      return true;
    }
    await page.waitForTimeout(80);
  }
  return false;
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await shot("00-menu");
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(500);
await shot("01-mascot-opening");
console.log("1 开场        ", JSON.stringify(await snapshot()));

await clickMascot("full");
await shot("02-mascot-intro");
await clickMascot("continue");
await shot("03-mascot-step");
console.log("2 教学开始    ", JSON.stringify(await snapshot()));
await advanceMascot();
console.log("  推进到      ", JSON.stringify(await snapshot()));

// 出价到赢下第一箱
for (let step = 0; step < 80; step += 1) {
  if (await visible('[data-name="成交印章"]')) {
    await waitForScene("disposal");
    break;
  }
  if (await visible('[data-name="黑匣广告海报"]')) {
    await click('button[data-role="takeLoan"]');
    await page.waitForTimeout(200);
    continue;
  }
  if (await visible('[data-name="加价"]')) {
    await click('[data-name="加价"]');
    await page.waitForTimeout(160);
    continue;
  }
  await page.waitForTimeout(120);
}
await page.waitForTimeout(300);
await shot("04-disposal-forced");
const forced = await page.evaluate(() =>
  ["原封转卖", "现场开箱"].map((name) => {
    const el = document.querySelector(`.scene.is-active [data-name="${name}"]`);
    return [name, el ? el.classList.contains("is-disabled") : null];
  })
);
console.log("3 教学锁路线  ", JSON.stringify(forced), JSON.stringify(await snapshot()));
await advanceMascot();

await click('[data-role="route"][data-route="home"]');
await waitForScene("shop");
await page.waitForTimeout(300);
await shot("05-shop");

await click('[data-role="box"]');
await page.waitForTimeout(300);
await click('[data-role="item"]');
await page.waitForTimeout(200);
await click('[data-role="openInspect"]');
await page.waitForTimeout(300);
await shot("06-inspect");

// 跑完常规操作
const operations = await page.evaluate(
  () => window.__lastBox.state.inventory[0].operations || []
);
for (const id of operations) {
  const selector = `[data-role="tool"][data-tool="${id}"]`;
  if (!(await visible(selector))) {
    continue;
  }
  await click(selector);
  await page.waitForTimeout(220);
  if (id === "magnifier") {
    const rect = await page.$eval(inScene("[data-stage]"), (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    for (let row = 0; row <= 6; row += 1) {
      for (let col = 0; col <= 6; col += 1) {
        await page.mouse.move(
          rect.x + rect.w * (0.12 + col * 0.127),
          rect.y + rect.h * (0.12 + row * 0.127),
          { steps: 2 }
        );
      }
    }
    if (await visible('[data-role="finishOp"]')) {
      await click('[data-role="finishOp"]');
      await page.waitForTimeout(220);
    }
  } else if (id === "clean") {
    const rect = await page.$eval(inScene("[data-stage]"), (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    await page.mouse.move(rect.x + rect.w * 0.15, rect.y + rect.h * 0.15);
    await page.mouse.down();
    for (let row = 0; row < 6; row += 1) {
      const y = 0.12 + row * 0.15;
      const from = row % 2 === 0 ? 0.12 : 0.88;
      const to = row % 2 === 0 ? 0.88 : 0.12;
      for (let step = 0; step <= 6; step += 1) {
        await page.mouse.move(
          rect.x + rect.w * (from + ((to - from) * step) / 6),
          rect.y + rect.h * y,
          { steps: 6 }
        );
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
    if (await visible('[data-role="finishOp"]')) {
      await click('[data-role="finishOp"]');
      await page.waitForTimeout(250);
    }
  } else if (id === "circuit") {
    for (let index = 0; index < 4; index += 1) {
      if (await visible(`[data-role="screw"][data-index="${index}"]`)) {
        await click(`[data-role="screw"][data-index="${index}"]`);
        await page.waitForTimeout(120);
      }
    }
    if (await visible("[data-role='cover']")) {
      await click('[data-role="cover"]');
      await page.waitForTimeout(180);
    }
    for (let index = 0; index < 2; index += 1) {
      if (await visible('[data-role="mountedPart"]')) {
        await click('[data-role="mountedPart"]');
        await page.waitForTimeout(180);
      }
    }
    const parts = await page.evaluate(() =>
      window.__lastBox.state.inventory[0].inspection.circuit.parts.map((part) => ({
        id: part.id,
        x: part.slotX,
        y: part.slotY
      }))
    );
    for (const part of parts) {
      const handle = await page.$(
        inScene(`[data-role="part"][data-part="${part.id}"]`)
      );
      if (!handle) {
        continue;
      }
      const box = await handle.boundingBox();
      const rect = await page.$eval(inScene("[data-stage]"), (el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      });
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.w * part.x, rect.y + rect.h * part.y, {
        steps: 6
      });
      await page.mouse.up();
      await page.waitForTimeout(200);
    }
    if (await visible('[data-role="power"]')) {
      await click('[data-role="power"]');
      await page.waitForTimeout(220);
    }
  }
}
await click('[data-role="tool"][data-tool="done"]');
await page.waitForTimeout(300);
await shot("07-inspected");
console.log("4 检视完成    ", JSON.stringify(await snapshot()));
const clueInfo = await page.evaluate(() =>
  window.__lastBox.state.inventory.map((item) => [
    item.name,
    item.storyId || null,
    (item.storyKeywords || []).length
  ])
);
console.log("  线索物品    ", JSON.stringify(clueInfo));

// 日历
await click('[data-role="calendar"]');
await page.waitForTimeout(300);
await shot("08-calendar");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(200);

// 记事本与万物通
// 教学后续流程：检视完成 → 点出售 → 看趋势 → 定价上架。
await click('[data-role="item"]');
await page.waitForTimeout(250);
await click('[data-role="openListing"]');
await page.waitForTimeout(300);
await shot("14-listing-open");
console.log("9 出售页面    ", JSON.stringify(await snapshot()));
await click('[data-role="closeSheet"]');
await page.waitForTimeout(200);
await click('[data-role="calendar"]');
await page.waitForTimeout(300);
await shot("15-calendar");
console.log("10 查看趋势   ", JSON.stringify(await snapshot()));
await click('[data-role="closeSheet"]');
await page.waitForTimeout(200);
await click('[data-role="item"]');
await page.waitForTimeout(200);
await click('[data-role="openListing"]');
await page.waitForTimeout(250);
await clickNth('[data-role="toggleTag"]', 0);
await page.waitForTimeout(150);
await clickNth('[data-role="toggleTag"]', 1);
await page.waitForTimeout(150);
await click('[data-role="confirmListing"]');
await page.waitForTimeout(300);
console.log("11 上架完成   ", JSON.stringify(await snapshot()));

// 后面的记事本和图鉴不在引导范围内，先结束教学避免点击被拦。
await page.evaluate(() => {
  window.__lastBox.state.tutorial.mode = "completed";
  window.__lastBox.ui.focusNames = [];
  document
    .querySelectorAll(".layer.is-tutorial-dim")
    .forEach((el) => el.classList.remove("is-tutorial-dim"));
});
await click('[data-role="notebook"]');
await page.waitForTimeout(300);
await shot("09-notebook");
const keywords = await page.evaluate(
  () => (window.__lastBox.state.notebook || {}).keywords || []
);
const insp = await page.evaluate(() => {
  const item = window.__lastBox.state.inventory[0];
  if (!item) {
    return null;
  }
  return {
    ops: item.operations,
    results: Object.keys(item.inspection.results),
    completed: item.inspection.completed
  };
});
console.log("  检视状态    ", JSON.stringify(insp));
console.log("5 词条        ", JSON.stringify(keywords.slice(0, 6)));
const searchable = await page.$$(inScene('[data-role="nbKeyword"]:not([disabled])'));
if (searchable.length) {
  await searchable[0].click();
  await page.waitForTimeout(150);
  await click('[data-role="nbSearch"]');
  await page.waitForTimeout(250);
}
await shot("10-notebook-result");
console.log("6 查询后      ", JSON.stringify(await snapshot()));

await click('[data-role="nbTab"][data-tab="book"]');
await page.waitForTimeout(250);
await shot("11-compendium");
await page.evaluate(() => {
  window.__lastBox.state.cash = 6000;
});
await click('[data-role="nbTab"][data-tab="upgrade"]');
await page.waitForTimeout(250);
await shot("12-upgrade");
console.log("7 升级页      ", JSON.stringify(await snapshot()));
await click('[data-role="doUpgrade"]');
await page.waitForTimeout(300);
await shot("13-upgrade-done");
console.log("8 升级结果    ", JSON.stringify(await snapshot()));

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
