// UI 审计脚本：把各界面跑到可截图的稳定状态，输出全屏截图和关键图层坐标。
// 用法：先启动 node server.js，再运行 node tools/v2-ui-audit.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.audit";
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

async function click(selector) {
  for (const handle of await page.$$(inScene(selector))) {
    if (await handle.isVisible()) {
      await handle.click();
      return true;
    }
  }
  return false;
}

async function clickNth(selector, index) {
  let seen = 0;
  for (const handle of await page.$$(inScene(selector))) {
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

const visible = (selector) => page.isVisible(inScene(selector));
const scene = () => page.evaluate(() => window.__lastBox.scene);

async function waitScene(name, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await scene()) === name) {
      return true;
    }
    await page.waitForTimeout(80);
  }
  return false;
}

async function bidUntilWon(tag) {
  for (let step = 0; step < 60; step += 1) {
    if (await visible('[data-name="成交印章"]')) {
      await waitScene("disposal");
      return "won";
    }
    if (await visible('[data-name="黑匣广告海报"]')) {
      await shot(`${tag}-loan`);
      await click('button[data-role="takeLoan"]');
      await page.waitForTimeout(200);
      continue;
    }
    if (await visible('[data-name="加价"]')) {
      const disabled = await page.$eval(inScene('[data-name="加价"]'), (el) =>
        el.classList.contains("is-disabled")
      );
      if (disabled) {
        await click('[data-name="放弃"]');
        await page.waitForTimeout(200);
        continue;
      }
      await click('[data-name="加价"]');
      await page.waitForTimeout(140);
      continue;
    }
    await page.waitForTimeout(120);
  }
  return "timeout";
}

const stageRect = () =>
  page.$eval(inScene("[data-stage]"), (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  });

const at = (rect, nx, ny) => ({ x: rect.x + rect.w * nx, y: rect.y + rect.h * ny });

async function doClean() {
  const rect = await stageRect();
  const start = at(rect, 0.12, 0.12);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let row = 0; row < 6; row += 1) {
    const y = 0.12 + row * 0.15;
    const from = row % 2 === 0 ? 0.12 : 0.88;
    const to = row % 2 === 0 ? 0.88 : 0.12;
    for (let step = 0; step <= 8; step += 1) {
      await page.mouse.move(at(rect, from + ((to - from) * step) / 8, y).x, at(rect, from + ((to - from) * step) / 8, y).y, { steps: 4 });
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(220);
  if (await visible('[data-role="finishOp"]')) {
    await click('[data-role="finishOp"]');
    await page.waitForTimeout(250);
  }
}

async function doMagnifier() {
  const rect = await stageRect();
  for (let row = 0; row <= 7; row += 1) {
    for (let col = 0; col <= 7; col += 1) {
      const point = at(rect, 0.1 + col * 0.11, 0.1 + row * 0.11);
      await page.mouse.move(point.x, point.y, { steps: 2 });
      await page.waitForTimeout(18);
    }
  }
  await page.waitForTimeout(220);
  if (await visible('[data-role="finishOp"]')) {
    await click('[data-role="finishOp"]');
    await page.waitForTimeout(250);
  }
}

async function doCircuit() {
  for (let index = 0; index < 4; index += 1) {
    const selector = `[data-role="screw"][data-index="${index}"]`;
    if (await visible(selector)) {
      await click(selector);
      await page.waitForTimeout(110);
    }
  }
  if (await visible('[data-role="cover"]')) {
    await click('[data-role="cover"]');
    await page.waitForTimeout(180);
  }
  for (let index = 0; index < 2; index += 1) {
    if (await visible('[data-role="mountedPart"]')) {
      await click('[data-role="mountedPart"]');
      await page.waitForTimeout(180);
    }
  }
  const slots = await page.evaluate(() =>
    window.__lastBox.state.inventory[0].inspection.circuit.parts.map((part) => ({
      id: part.id,
      x: part.slotX,
      y: part.slotY
    }))
  );
  for (const slot of slots) {
    const handle = await page.$(inScene(`[data-role="part"][data-part="${slot.id}"]`));
    if (!handle) {
      continue;
    }
    const box = await handle.boundingBox();
    const target = at(await stageRect(), slot.x, slot.y);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  if (await visible("[data-circuit-dirt]")) {
    const rect = await stageRect();
    await page.mouse.move(rect.x + rect.w * 0.5, rect.y + rect.h * 0.32);
    await page.mouse.down();
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.move(
        rect.x + rect.w * (0.4 + step * 0.016),
        rect.y + rect.h * (0.24 + step * 0.013),
        { steps: 4 }
      );
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
  }
  if (await visible('[data-role="power"]')) {
    await click('[data-role="power"]');
    await page.waitForTimeout(220);
  }
}

async function runInspection() {
  const operations = await page.evaluate(
    () => window.__lastBox.state.inventory[0].operations || []
  );
  const runners = { clean: doClean, circuit: doCircuit, magnifier: doMagnifier };
  for (const id of operations) {
    const selector = `[data-role="tool"][data-tool="${id}"]`;
    if (!(await visible(selector))) {
      continue;
    }
    await click(selector);
    await page.waitForTimeout(220);
    if (runners[id]) {
      await runners[id]();
    }
  }
  await click('[data-role="tool"][data-tool="done"]');
  await page.waitForTimeout(220);
}

// 关键图层的实际渲染坐标，用于比对齐偏差。
async function geometry() {
  return page.evaluate(() => {
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 1200;
    const names = [
      "货架",
      "货架上层物品格",
      "货架下层箱子区",
      "橱窗",
      "拍卖锤",
      "营业牌",
      "桌面",
      "箱子"
    ];
    const layerRects = {};
    names.forEach((name) => {
      const el = document.querySelector(`.scene.is-active .layer[data-name="${name}"]`);
      if (!el) {
        return;
      }
      const box = el.getBoundingClientRect();
      layerRects[name] = [
        Math.round((box.left - rect.left) / scale),
        Math.round((box.top - rect.top) / scale),
        Math.round(box.width / scale),
        Math.round(box.height / scale)
      ];
    });
    const firstSlot = document.querySelector('.scene.is-active .slot.filled');
    const slotRect = firstSlot
      ? (() => {
          const box = firstSlot.getBoundingClientRect();
          return [
            Math.round((box.left - rect.left) / scale),
            Math.round((box.top - rect.top) / scale),
            Math.round(box.width / scale),
            Math.round(box.height / scale)
          ];
        })()
      : null;
    const firstBox = document.querySelector('.scene.is-active .box-card');
    const boxRect = firstBox
      ? (() => {
          const box = firstBox.getBoundingClientRect();
          return [
            Math.round((box.left - rect.left) / scale),
            Math.round((box.top - rect.top) / scale),
            Math.round(box.width / scale),
            Math.round(box.height / scale)
          ];
        })()
      : null;
    const label = (selector) => {
      const el = document.querySelector(selector);
      if (!el) {
        return null;
      }
      const box = el.getBoundingClientRect();
      return [
        Math.round((box.left - rect.left) / scale),
        Math.round((box.top - rect.top) / scale),
        Math.round(box.width / scale),
        Math.round(box.height / scale)
      ];
    };
    return {
      scale: Number(scale.toFixed(4)),
      layerRects,
      firstSlot: slotRect,
      firstBox: boxRect,
      hammerLabel: label('.scene.is-active .layer[data-name="拍卖锤"] > .label'),
      signLabel: label('.scene.is-active .layer[data-name="营业牌"] > .label'),
      replyOne: label('.scene.is-active .layer[data-name="玩家选项一"]'),
      replyOneLabel: label('.scene.is-active .layer[data-name="玩家选项一"] > .label')
    };
  });
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(500);
await shot("00-start");

await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(600);
await shot("01-opening");
console.log("opening bubble:", JSON.stringify(await page.evaluate(() => {
  const bubble = document.querySelector("#mascot .mascot-bubble");
  const box = bubble ? bubble.getBoundingClientRect() : null;
  return box ? { w: Math.round(box.width), h: Math.round(box.height) } : null;
})));

if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
  await page.waitForTimeout(300);
}
await page.evaluate(() => {
  window.__lastBox.state.cash = 4000;
});

console.log("bid:", await bidUntilWon("02"));
await shot("03-disposal");
await click('[data-role="route"][data-route="onsite"]');
await waitScene("disposal_open");
await page.waitForTimeout(350);
await shot("04-onsite");
console.log("onsite geom:", JSON.stringify(await geometry()));
await click('[data-role="onsiteHome"]');
await waitScene("shop");
await page.waitForTimeout(300);
await shot("05-shop-empty");

await click('[data-role="box"]');
await page.waitForTimeout(300);
await shot("06-shop-items");
console.log("shop geom:", JSON.stringify(await geometry()));

// 橱窗悬停
await page.hover(inScene('.layer[data-name="橱窗"]'));
await page.waitForTimeout(150);
await shot("07-window-hover");

await click('[data-role="item"]');
await page.waitForTimeout(250);
await shot("08-detail");

await click('[data-role="openInspect"]');
await page.waitForTimeout(250);
await shot("09-inspect");
await runInspection();
await shot("10-inspected");
console.log("done tool visible after finish:", await visible('[data-role="tool"][data-tool="done"]'));

await click('[data-role="item"]');
await page.waitForTimeout(200);
await click('[data-role="openListing"]');
await page.waitForTimeout(250);
await shot("11-listing");
await clickNth('[data-role="toggleTag"]', 0);
await page.waitForTimeout(120);
await clickNth('[data-role="toggleTag"]', 1);
await page.waitForTimeout(120);
await shot("12-listing-ready");
await click('[data-role="confirmListing"]');
await page.waitForTimeout(300);
await shot("13-window-listed");
await page.hover(inScene('.layer[data-name="橱窗"]'));
await page.waitForTimeout(150);
await shot("14-window-hover");

await click('[data-role="closeDay"]');
await page.waitForTimeout(500);
if (await page.isVisible('button[data-menu="nextDay"]')) {
  await page.click('button[data-menu="nextDay"]');
  await page.waitForTimeout(700);
}
await click('[data-role="calendar"]');
await waitScene("shop");
await page.waitForTimeout(400);
await shot("15-buyer");
console.log("buyer geom:", JSON.stringify(await geometry()));

const replyInfo = await page.evaluate(() => {
  const out = [];
  ["玩家选项一", "玩家选项二", "玩家选项三"].forEach((name) => {
    const el = document.querySelector(`.scene.is-active .layer[data-name="${name}"]`);
    out.push({
      name,
      hidden: el ? el.classList.contains("is-hidden") : null,
      label: el && el.querySelector(".label") ? el.querySelector(".label").textContent : null,
      pointerEvents: el ? getComputedStyle(el).pointerEvents : null
    });
  });
  const overlay = document.querySelector(".scene.is-active .layer[data-name=\"玩家选项一\"]");
  const mid = overlay ? document.elementFromPoint(
    overlay.getBoundingClientRect().left + 12,
    overlay.getBoundingClientRect().top + 12
  ) : null;
  return { options: out, hitTest: mid ? mid.className + "|" + (mid.dataset ? mid.dataset.name || mid.dataset.role : "") : null };
});
console.log("reply info:", JSON.stringify(replyInfo));

writeFileSync(`${OUT}/geometry.json`, JSON.stringify(await geometry(), null, 2));

// 新手引导：正式教学的气泡同样要贴着目标显示，单独再跑一次。
await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(500);
if (await page.isVisible('button[data-menu="confirmNew"]')) {
  await page.click('button[data-menu="confirmNew"]');
  await page.waitForTimeout(500);
}
await page.click('#mascot [data-mascot="full"]');
await page.waitForTimeout(300);
await shot("16-tutorial-intro");
if (await page.isVisible('#mascot [data-mascot="continue"]')) {
  await page.click('#mascot [data-mascot="continue"]');
  await page.waitForTimeout(300);
  await shot("17-tutorial-step");
}

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
