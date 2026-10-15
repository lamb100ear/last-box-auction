// 本轮修改验证：小黑居中、桌面物品位置、物品信息窗口、拖拽提示、日历返回弹层、弹窗层级。
// 用法：先启动 node server.js，再运行 node tools/v2-round-check.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.check-round";
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

async function advanceMascot() {
  return clickMascot("ok");
}

async function waitForScene(name, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const current = await page.evaluate(() => window.__lastBox.scene);
    if (current === name) {
      return true;
    }
    await page.waitForTimeout(80);
  }
  return false;
}

const mascotMetrics = () =>
  page.evaluate(() => {
    const canvas = document.getElementById("canvas");
    const mascot = document.getElementById("mascot");
    const bubble = document.querySelector(".mascot-bubble");
    const c = canvas.getBoundingClientRect();
    const m = mascot.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const rel = (rect) => ({
      left: Math.round(rect.left - c.left),
      top: Math.round(rect.top - c.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height)
    });
    return {
      canvas: { w: Math.round(c.width), h: Math.round(c.height) },
      mascot: rel(m),
      bubble: rel(b),
      mascotCenterX: Math.round((m.left + m.width / 2 - c.left) / c.width * 100),
      mascotCenterY: Math.round((m.top + m.height / 2 - c.top) / c.height * 100),
      bubbleCenterX: Math.round((b.left + b.width / 2 - c.left) / c.width * 100),
      bubbleCenterY: Math.round((b.top + b.height / 2 - c.top) / c.height * 100)
    };
  });

const dialogId = () =>
  page.evaluate(() => (window.__lastBox.ui.dialogue || {}).id || null);

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(500);
await shot("01-opening");
console.log("1 开场对话框  ", JSON.stringify(await mascotMetrics()));

await clickMascot("full");
await page.waitForTimeout(250);
const introCentered = await mascotMetrics();
await shot("02-intro");
console.log("2 自我介绍    ", JSON.stringify(introCentered), await dialogId());

await clickMascot("continue");
await page.waitForTimeout(300);
await advanceMascot();
await page.waitForTimeout(200);

// 出价到赢下第一箱
for (let step = 0; step < 90; step += 1) {
  if (await visible('[data-name="成交印章"]')) {
    break;
  }
  if (await visible('[data-name="黑匣广告海报"]')) {
    await click('button[data-role="takeLoan"]');
    await page.waitForTimeout(200);
    continue;
  }
  if (await visible('[data-name="加价"]')) {
    await click('[data-name="加价"]');
    await page.waitForTimeout(150);
    continue;
  }
  await page.waitForTimeout(120);
}
await page.waitForTimeout(400);
await waitForScene("disposal");
await advanceMascot();
await click('[data-role="route"][data-route="home"]');
await waitForScene("shop");
await page.waitForTimeout(400);
await shot("03-shop");

// 开箱 -> 检视 -> 完成
await click('[data-role="box"]');
await page.waitForTimeout(350);
await click('[data-role="item"]');
await page.waitForTimeout(250);
await click('[data-role="openInspect"]');
await page.waitForTimeout(300);
await shot("04-inspect");
const ops = await page.evaluate(() => window.__lastBox.state.inventory[0].operations || []);
console.log("   检视操作    ", JSON.stringify(ops));

const stageRect = () =>
  page.$eval(inScene("[data-stage]"), (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });

async function scrub(rect, nx, ny, radiusPx) {
  await page.mouse.move(rect.x + rect.w * nx, rect.y + rect.h * ny);
  await page.mouse.down();
  for (let i = 0; i < 10; i += 1) {
    await page.mouse.move(
      rect.x + rect.w * nx + (i % 2 ? radiusPx : -radiusPx),
      rect.y + rect.h * ny + (i % 3 ? radiusPx / 2 : -radiusPx / 2),
      { steps: 3 }
    );
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

const opResult = (id) =>
  page.evaluate((operationId) => {
    const item = window.__lastBox.state.inventory[0];
    if (!item) {
      return null;
    }
    const result = item.inspection.results[operationId];
    return result ? `${operationId}=${result.quality}` : `${operationId}=none`;
  }, id);

async function clickFinishOp() {
  if (await visible('[data-role="finishOp"]')) {
    await click('[data-role="finishOp"]');
    await page.waitForTimeout(250);
  }
}

for (const id of ops) {
  const selector = `[data-role="tool"][data-tool="${id}"]`;
  if (!(await visible(selector))) {
    console.log(`   ${id} 工具不可见`);
    continue;
  }
  await click(selector);
  await page.waitForTimeout(250);
  if (id === "magnifier") {
    const rect = await stageRect();
    for (let row = 0; row <= 6; row += 1) {
      for (let col = 0; col <= 6; col += 1) {
        await page.mouse.move(rect.x + rect.w * (0.12 + col * 0.127), rect.y + rect.h * (0.12 + row * 0.127), { steps: 2 });
      }
    }
    await clickFinishOp();
  } else if (id === "clean") {
    const rect = await stageRect();
    const patches = await page.evaluate(
      () => window.__lastBox.state.inventory[0].inspection.clean.patches.map((p) => ({ x: p.x, y: p.y }))
    );
    for (const patch of patches) {
      await scrub(rect, patch.x, patch.y, 18);
    }
    await page.mouse.move(rect.x + rect.w * 0.2, rect.y + rect.h * 0.2);
    await page.mouse.down();
    for (let row = 0; row < 6; row += 1) {
      const y = 0.12 + row * 0.15;
      const from = row % 2 === 0 ? 0.12 : 0.88;
      const to = row % 2 === 0 ? 0.88 : 0.12;
      for (let step = 0; step <= 6; step += 1) {
        await page.mouse.move(rect.x + rect.w * (from + ((to - from) * step) / 6), rect.y + rect.h * y, { steps: 6 });
      }
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
    await clickFinishOp();
  } else if (id === "circuit") {
    for (let index = 0; index < 4; index += 1) {
      if (await visible(`[data-role="screw"][data-index="${index}"]`)) {
        await click(`[data-role="screw"][data-index="${index}"]`);
        await page.waitForTimeout(120);
      }
    }
    if (await visible("[data-role='cover']")) {
      await click('[data-role="cover"]');
      await page.waitForTimeout(200);
    }
    // 内部污渍要先用清洁布擦掉。
    const dirt = await page.evaluate(() => {
      const circuit = window.__lastBox.state.inventory[0].inspection.circuit;
      return circuit && circuit.dirt ? { x: circuit.dirt.x, y: circuit.dirt.y, progress: circuit.dirt.progress } : null;
    });
    if (dirt && dirt.progress < 1) {
      const rect = await stageRect();
      for (let i = 0; i < 8; i += 1) {
        await scrub(rect, dirt.x, dirt.y, 20);
      }
    }
    // 拆下需要检查的零件。
    const partsInfo = await page.evaluate(() =>
      window.__lastBox.state.inventory[0].inspection.circuit.parts.map((part) => ({
        id: part.id,
        seated: part.seated,
        broken: part.broken,
        x: part.slotX,
        y: part.slotY
      }))
    );
    for (const part of partsInfo) {
      if (!part.seated || part.broken) {
        continue;
      }
      if (await visible(`[data-role="mountedPart"][data-part="${part.id}"]`)) {
        await click(`[data-role="mountedPart"][data-part="${part.id}"]`);
        await page.waitForTimeout(200);
      }
    }
    // 按正确顺序装回托盘里的零件。
    const order = await page.evaluate(() => window.__lastBox.state.inventory[0].inspection.circuit.order);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const tray = await page.$$(inScene('[data-role="part"]'));
      if (!tray.length) {
        break;
      }
      const rect = await stageRect();
      const current = await page.evaluate(() =>
        window.__lastBox.state.inventory[0].inspection.circuit.parts
          .filter((part) => part.inTray && !part.broken)
          .map((part) => ({ id: part.id, x: part.slotX, y: part.slotY }))
      );
      if (!current.length) {
        break;
      }
      const wanted =
        (order || []).find((id) => current.some((part) => part.id === id)) || current[0].id;
      const target = current.find((part) => part.id === wanted) || current[0];
      const handle = await page.$(inScene(`[data-role="part"][data-part="${target.id}"]`));
      if (!handle) {
        break;
      }
      const box = await handle.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.w * target.x, rect.y + rect.h * target.y, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    }
    if (await visible('[data-role="power"]')) {
      await click('[data-role="power"]');
      await page.waitForTimeout(250);
    }
    await clickFinishOp();
  }
  console.log("   操作", id, "->", await opResult(id));
}
const realCompleted = await page.evaluate(() => {
  const item = window.__lastBox.state.inventory[0];
  return Boolean(item && item.inspection.completed);
});
if (!realCompleted) {
  // 纯界面验证：小游戏未跑完时直接把检视标记为完成，继续验证后续界面。
  await page.evaluate(() => {
    const item = window.__lastBox.state.inventory[0];
    const inspection = item.inspection;
    inspection.results = inspection.results || {};
    inspection.operations.forEach((id) => {
      inspection.results[id] = { quality: "perfect" };
    });
    inspection.completed = true;
  });
}
if (await visible('[data-role="closeSheet"]')) {
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(300);
}
console.log("   小游戏真实完成:", realCompleted);
console.log(
  "   检视结果    ",
  JSON.stringify(
    await page.evaluate(() => {
      const item = window.__lastBox.state.inventory[0];
      return {
        completed: item.inspection.completed,
        results: Object.keys(item.inspection.results),
        ops: item.operations,
        sheet: window.__lastBox.ui.sheet
      };
    })
  )
);

// ---- 日历返回弹层：先打开出售页面，再开日历，关闭后应回到出售页面 ----
await click('[data-role="item"]');
await page.waitForTimeout(250);
await click('[data-role="openListing"]');
await page.waitForTimeout(300);
const beforeCalendar = await page.evaluate(() => window.__lastBox.ui.sheet);
console.log(
  "   开出售页    ",
  JSON.stringify(
    await page.evaluate(() => {
      const input = document.querySelector('.scene.is-active [data-role="priceRange"]');
      return {
        draft: window.__lastBox.ui.draft && window.__lastBox.ui.draft.price,
        inputValue: input ? input.value : null,
        min: input ? input.min : null,
        max: input ? input.max : null,
        readout: document.querySelector(".scene.is-active .price-read")?.textContent || null
      };
    })
  )
);
await click('[data-role="calendar"]');
await page.waitForTimeout(350);
const duringCalendar = await page.evaluate(() => ({
  sheet: window.__lastBox.ui.sheet,
  returnSheet: window.__lastBox.ui.returnSheet
}));
await shot("05-calendar");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(350);
const afterCalendar = await page.evaluate(() => window.__lastBox.ui.sheet);
console.log("3 日历返回    ", beforeCalendar, "->", JSON.stringify(duringCalendar), "->", afterCalendar);
console.log(
  "   返回后草稿  ",
  JSON.stringify(await page.evaluate(() => ({ sheet: window.__lastBox.ui.sheet, draft: window.__lastBox.ui.draft })))
);
await shot("06-after-calendar");

// 上架，等买家到店
await clickNth('[data-role="toggleTag"]', 0);
await page.waitForTimeout(150);
await clickNth('[data-role="toggleTag"]', 1);
await page.waitForTimeout(150);
await click('[data-role="confirmListing"]');
await page.waitForTimeout(300);
console.log(
  "4 上架        ",
  JSON.stringify(await page.evaluate(() => {
    const listing = window.__lastBox.state.listings[0];
    const toast = document.getElementById("toast");
    return {
      listings: window.__lastBox.state.listings.length,
      draft: window.__lastBox.ui.draft && window.__lastBox.ui.draft.price,
      tags: window.__lastBox.ui.draft && window.__lastBox.ui.draft.tags,
      sheet: window.__lastBox.ui.sheet,
      toast: toast && !toast.hidden ? toast.textContent : null,
      listing: listing ? { status: listing.status, kind: listing.arrivalKind, price: listing.price } : null
    };
  }))
);

for (let step = 0; step < 40; step += 1) {
  const buyer = await page.evaluate(() => Boolean(window.__lastBox.state.buyer));
  if (buyer) {
    break;
  }
  await page.waitForTimeout(300);
}
await page.waitForTimeout(400);
await shot("07-buyer");

const layerProbe = await page.evaluate(() => {
  const active = document.querySelector(".scene.is-active");
  const read = (name) => {
    const el = active.querySelector(`.layer[data-name="${name}"]`);
    if (!el) {
      return null;
    }
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const canvasRect = document.getElementById("canvas").getBoundingClientRect();
    return {
      z: Number(el.style.zIndex),
      hidden: el.classList.contains("is-hidden"),
      left: Math.round(rect.left - canvasRect.left),
      top: Math.round(rect.top - canvasRect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      centerXPct: Math.round(((rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width) * 100),
      display: style.display
    };
  };
  return {
    bubble: read("买家对话气泡"),
    record: read("物品信息窗口"),
    listing: read("出售页面"),
    desk: read("桌面"),
    deskItem: read("桌面")
  };
});
console.log("5 层级        ", JSON.stringify(layerProbe));

const deskItemInfo = await page.evaluate(() => {
  const el = document.querySelector(".scene.is-active .desk-item");
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  const desk = document.querySelector('.scene.is-active .layer[data-name="桌面"]');
  const deskRect = desk.getBoundingClientRect();
  const canvasRect = document.getElementById("canvas").getBoundingClientRect();
  return {
    text: el.textContent.replace(/\s+/g, " ").trim(),
    title: el.getAttribute("title"),
    centerXPct: Math.round(((rect.left + rect.width / 2 - canvasRect.left) / canvasRect.width) * 100),
    centerYPct: Math.round(((rect.top + rect.height / 2 - canvasRect.top) / canvasRect.height) * 100),
    deskCenterXPct: Math.round(((deskRect.left + deskRect.width / 2 - canvasRect.left) / canvasRect.width) * 100),
    deskCenterYPct: Math.round(((deskRect.top + deskRect.height / 2 - canvasRect.top) / canvasRect.height) * 100)
  };
});
console.log("6 桌面物品    ", JSON.stringify(deskItemInfo));

// 悬停查看提示
const deskHandle = await page.$(".scene.is-active .desk-item");
if (deskHandle) {
  const box = await deskHandle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  await shot("08-desk-hover");
}

// 点击桌面物品 -> 物品信息窗口
if (deskHandle) {
  const box = await deskHandle.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
}
const recordState = await page.evaluate(() => {
  const el = document.querySelector('.scene.is-active .layer[data-name="物品信息窗口"]');
  return {
    sheet: window.__lastBox.ui.sheet,
    visible: el ? !el.classList.contains("is-hidden") : false,
    z: el ? Number(el.style.zIndex) : null,
    text: el ? el.textContent.replace(/\s+/g, " ").slice(0, 160) : null
  };
});
console.log("7 物品信息窗  ", JSON.stringify(recordState));
await shot("09-record");

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.slice(0, 5).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
