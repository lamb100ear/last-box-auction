// 2.0 第二部分冒烟测试：开箱、检视小游戏、商城、伪造、上架、买家成交、结束本日。
// 用法：先启动 node server.js，再运行 node tools/v2-shop-smoke.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.smoke-shop";
const TARGET = process.argv[3] || "http://127.0.0.1:4173/v2.html";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
// 同一个 role 会在多个弹层里重复出现，只点击当前可见的那一个。
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

// 面板重绘会替换掉旧节点，所以每次点击前都重新查询。
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
const snapshot = () =>
  page.evaluate(() => {
    const state = window.__lastBox.state;
    return {
      scene: window.__lastBox.scene,
      sheet: window.__lastBox.ui.sheet,
      day: state.day,
      cash: state.cash,
      boxes: state.shelfBoxes.length,
      items: state.inventory.length,
      listings: state.listings.length,
      buyer: state.buyer ? `${state.buyer.name} 信任${Math.round(state.buyer.trust)}` : null,
      keepsakes: state.keepsakes.length,
      fake: Object.entries(state.fakeStock).filter(([, n]) => n > 0).length,
      log: window.__lastBox.log.slice(-3)
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

async function bidUntilWon(tag) {
  for (let step = 0; step < 40; step += 1) {
    if (await visible('[data-name="成交印章"]')) {
      await waitForScene("disposal");
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
      await page.waitForTimeout(150);
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

// 清洁：按住左键在物品表面来回拖动，直到污渍全部消失。
async function doClean() {
  const rect = await stageRect();
  const probe = await page.evaluate(() => {
    const stage = document.querySelector(".scene.is-active [data-stage]");
    const dirt = document.querySelector(".scene.is-active .dirt");
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    };
    const item = window.__lastBox.state.inventory[0];
    return {
      stage: stage ? box(stage) : null,
      local: stage ? [stage.clientWidth, stage.clientHeight] : null,
      dirt: dirt ? box(dirt) : null,
      patches: item.inspection.clean
        ? item.inspection.clean.patches.map((p) => [p.x.toFixed(2), p.y.toFixed(2), p.r.toFixed(2)])
        : null
    };
  });
  console.log("  clean probe  ", JSON.stringify(probe));
  const start = at(rect, 0.12, 0.12);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let row = 0; row < 6; row += 1) {
    const y = 0.12 + row * 0.15;
    const from = row % 2 === 0 ? 0.12 : 0.88;
    const to = row % 2 === 0 ? 0.88 : 0.12;
    for (let step = 0; step <= 6; step += 1) {
      const point = at(rect, from + ((to - from) * step) / 6, y);
      await page.mouse.move(point.x, point.y, { steps: 8 });
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(220);
  if (await visible('[data-role="finishOp"]')) {
    await click('[data-role="finishOp"]');
    await page.waitForTimeout(250);
  }
}

// 放大镜：把镜头扫过整个物品表面。
async function doMagnifier() {
  const rect = await stageRect();
  for (let row = 0; row <= 6; row += 1) {
    for (let col = 0; col <= 6; col += 1) {
      const point = at(rect, 0.12 + col * 0.127, 0.12 + row * 0.127);
      await page.mouse.move(point.x, point.y, { steps: 3 });
      await page.waitForTimeout(20);
    }
  }
  await page.waitForTimeout(220);
  if (await visible('[data-role="finishOp"]')) {
    await click('[data-role="finishOp"]');
    await page.waitForTimeout(250);
  }
}

// 电路修复：卸螺丝、取外壳、把零件拖回幽灵槽位、通电。
async function doCircuit() {
  for (let index = 0; index < 4; index += 1) {
    const selector = `[data-role="screw"][data-index="${index}"]`;
    if (await visible(selector)) {
      await click(selector);
      await page.waitForTimeout(120);
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
    const rect = await stageRect();
    const target = at(rect, slot.x, slot.y);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  // 如果揭开外壳后随机出现内部污渍，需要用清洁布擦掉。
  if (await visible("[data-circuit-dirt]")) {
    const rect = await stageRect();
    await page.mouse.move(rect.x + rect.w * 0.5, rect.y + rect.h * 0.32);
    await page.mouse.down();
    for (let step = 0; step < 10; step += 1) {
      await page.mouse.move(
        rect.x + rect.w * (0.42 + step * 0.016),
        rect.y + rect.h * (0.26 + step * 0.012),
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

// 依次跑完当前物品分配到的常规操作。
async function runInspection(tag) {
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
    await shot(`${tag}-${id}`);
    if (runners[id]) {
      await runners[id]();
    }
    await shot(`${tag}-${id}-done`);
  }
  await click('[data-role="tool"][data-tool="done"]');
  await page.waitForTimeout(220);
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
// 开场小黑弹窗会拦截点击，先选择跳过新手引导。
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
  await page.waitForTimeout(300);
}
await page.evaluate(() => {
  window.__lastBox.state.cash = 3000;
});

console.log("1 auction     ", await bidUntilWon("01"));
await click('[data-role="route"][data-route="home"]');
await waitForScene("shop");
await page.waitForTimeout(300);
await shot("02-shop");
console.log("2 带回家       ", JSON.stringify(await snapshot()));

// 开箱
await click('[data-role="box"]');
await page.waitForTimeout(300);
await shot("03-opened");
console.log("3 开箱         ", JSON.stringify(await snapshot()));

// 检视第一件物品
await click('[data-role="item"]');
await page.waitForTimeout(250);
await shot("04-detail");
console.log("4 物品详情     ", JSON.stringify(await snapshot()));

await click('[data-role="openInspect"]');
await page.waitForTimeout(250);
await shot("05-inspect");
await runInspection("06");
await shot("07-inspected");
console.log("5 检视完成     ", JSON.stringify(await snapshot()));
const diag = await page.evaluate(() => {
  const item = window.__lastBox.state.inventory[0];
  return {
    ops: item.operations,
    results: Object.keys(item.inspection.results),
    clean: item.inspection.clean
      ? item.inspection.clean.patches.map((patch) => Number(patch.progress.toFixed(2)))
      : null,
    circuit: item.inspection.circuit
      ? {
          screws: item.inspection.circuit.screws,
          cover: item.inspection.circuit.coverOpen,
          parts: item.inspection.circuit.parts.map((part) => [part.id, part.inTray, part.seated]),
          mistakes: item.inspection.circuit.mistakes
        }
      : null,
    magnifier: item.inspection.magnifier
      ? item.inspection.magnifier.spots.map((spot) => spot.found)
      : null,
    mode: window.__lastBox.ui.inspectMode,
    log: window.__lastBox.log.slice(-6)
  };
});
console.log("  diag         ", JSON.stringify(diag));
if (errors.length) {
  console.log("  errors       ", JSON.stringify(errors.slice(0, 4)));
}

// 商城买伪造材料
await click('[data-role="computer"]');
await page.waitForTimeout(250);
await shot("08-mall");
await click('[data-role="buyProduct"][data-product="fake_blank_label"]');
await page.waitForTimeout(250);
console.log("6 购买材料     ", JSON.stringify(await snapshot()));
await click('[data-role="closeSheet"]');
await page.waitForTimeout(200);

// 伪造
await click('[data-role="item"]');
await page.waitForTimeout(200);
await click('[data-role="openInspect"]');
await page.waitForTimeout(200);
await click('[data-role="tool"][data-tool="forge"]');
await page.waitForTimeout(200);
await shot("09-forge-pick");
await click('[data-role="pickForgeMaterial"]');
await page.waitForTimeout(150);
await click('[data-role="pickForgeTarget"]');
await page.waitForTimeout(150);
await shot("10-forge-pick");
const piece = await page.$(inScene("[data-forge-piece]"));
if (piece) {
  const pieceBox = await piece.boundingBox();
  const targetBox = await page.$eval(inScene("[data-forge-target]"), (el) => {
    const rect = el.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x, targetBox.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
await shot("10-forge-done");
console.log("7 伪造完成     ", JSON.stringify(await snapshot()));
await click('[data-role="tool"][data-tool="done"]');
await page.waitForTimeout(200);

// 上架
await click('[data-role="item"]');
await page.waitForTimeout(200);
await click('[data-role="openListing"]');
await page.waitForTimeout(250);
await shot("11-listing");
await clickNth('[data-role="toggleTag"]', 0);
await page.waitForTimeout(150);
await clickNth('[data-role="toggleTag"]', 1);
await page.waitForTimeout(150);
if (await visible('[data-role="pickTarget"]')) {
  await click('[data-role="pickTarget"]');
  await page.waitForTimeout(150);
}
await shot("12-listing-ready");
await click('[data-role="confirmListing"]');
await page.waitForTimeout(300);
await shot("13-window");
console.log("8 上架         ", JSON.stringify(await snapshot()));

// 结束本日
await click('[data-role="closeDay"]');
await page.waitForTimeout(400);
await shot("14-settlement");
const settle = await page.textContent(".settle");
console.log("9 结算         ", settle.replace(/\s+/g, " ").slice(0, 200));
await page.click('button[data-menu="nextDay"]');
await page.waitForTimeout(500);

// 买家到店
await click('[data-role="calendar"]');
await waitForScene("shop");
await page.waitForTimeout(300);
await shot("15-buyer");
console.log("10 买家        ", JSON.stringify(await snapshot()));

for (let step = 0; step < 4; step += 1) {
  if (!(await visible('[data-role="reply"]'))) {
    break;
  }
  await click('[data-role="reply"]');
  await page.waitForTimeout(250);
  await shot(`16-reply-${step + 1}`);
}
console.log("11 问答结束    ", JSON.stringify(await snapshot()));

if (await visible('[data-role="settleBuyer"]')) {
  await click('[data-role="settleBuyer"]');
  await page.waitForTimeout(300);
}
await shot("17-settled");
console.log("12 成交        ", JSON.stringify(await snapshot()));

// 宽屏下确认画面填满窗口，留白用场景底色而不是黑边。
await page.setViewportSize({ width: 2400, height: 1000 });
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__lastBox && null;
});
await shot("18-wide");
const fill = await page.evaluate(() => {
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  return {
    backdrop:
      getComputedStyle(stage).backgroundImage !== "none"
        ? getComputedStyle(stage).backgroundImage.slice(0, 40)
        : getComputedStyle(stage).backgroundColor,
    canvas: [Math.round(rect.width), Math.round(rect.height)],
    viewport: [window.innerWidth, window.innerHeight],
    toastInsideCanvas: Boolean(document.getElementById("canvas").querySelector("#toast"))
  };
});
console.log("13 全屏        ", JSON.stringify(fill));

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
