// 2.0 第一部分冒烟测试。
// 依次跑通：余额不足触发贷款、三条处置路线、放弃、结束本日、进入第二天，并输出截图。
// 用法：先启动 node server.js，再运行 node tools/v2-smoke.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.smoke";
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
  if (response.status() >= 400) {
    errors.push(`http ${response.status()} ${response.url()}`);
  }
});
page.on("requestfailed", (request) => {
  if (!request.url().includes("favicon")) {
    errors.push(`request failed: ${request.url()}`);
  }
});

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
// 所有查询都限定在当前激活的场景里，避免命中外层缓存场景的同名图层。
const inScene = (selector) => `.scene.is-active ${selector}`;
const visible = (selector) => page.isVisible(inScene(selector));
const click = (selector) => page.click(inScene(selector));
const attr = (selector, name) =>
  page.$eval(inScene(selector), (el, key) => el.classList.contains(key), name);
const snapshot = () =>
  page.evaluate(() => {
    const state = window.__lastBox.state;
    return {
      scene: window.__lastBox.scene,
      day: state.day,
      cash: state.cash,
      debt: state.totalDebt,
      lot: state.lotIndex + 1,
      lots: state.lots.length,
      status: state.auction.status,
      boxes: state.shelfBoxes.length,
      items: state.inventory.length,
      borrows: state.borrowCount
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

// 一直加价到赢下当前箱子，中途余额不足会自动借款。
async function bidUntilWon(tag) {
  for (let step = 0; step < 40; step += 1) {
    if (await visible('[data-name="成交印章"]')) {
      await shot(`${tag}-stamp`);
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
      if (await attr('[data-name="加价"]', "is-disabled")) {
        return "blocked";
      }
      await click('[data-name="加价"]');
      await page.waitForTimeout(160);
      continue;
    }
    await page.waitForTimeout(120);
  }
  return "timeout";
}

async function passLot() {
  if (await visible('[data-name="放弃"]')) {
    await click('[data-name="放弃"]');
    await page.waitForTimeout(260);
  }
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(500);
await shot("00-menu");

await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
// 把现金压低，强制走一次余额不足和贷款海报。
await page.evaluate(() => {
  window.__lastBox.state.cash = 60;
});
await shot("01-auction");
console.log("1 auction      ", JSON.stringify(await snapshot()));

// 依次覆盖三条处置路线和一次放弃，链路不够就自动进入下一天继续。
const wanted = ["onsite_sell", "onsite_home", "home", "resale", "pass"];
const dayLog = [];
let cursor = 0;
let guard = 0;

while (cursor < wanted.length && guard < 16) {
  guard += 1;
  const snap = await snapshot();
  const route = wanted[cursor];
  const tag = `d${snap.day}-lot${snap.lot}-${route}`;

  // 带回家后会停在店铺，先点拍卖锤回到拍卖场继续当天批次。
  if (snap.scene === "shop" && snap.status !== "finished") {
    await click('[data-role="hammer"]');
    await page.waitForTimeout(250);
    continue;
  }

  if (snap.status === "finished") {
    if (await visible('[data-name="今日结束牌"]')) {
      await shot(`day${snap.day}-auction-end`);
      await click('[data-name="今日结束牌"]');
      await waitForScene("shop");
    }
    await shot(`day${snap.day}-shop`);
    console.log(`day${snap.day} shop     `, JSON.stringify(await snapshot()));
    await click('[data-role="closeDay"]');
    await page.waitForTimeout(400);
    const text = (await page.textContent(".settle")).replace(/\s+/g, " ");
    dayLog.push(`day${snap.day}: ${text.slice(0, 170)}`);
    await shot(`day${snap.day}-settlement`);
    await page.click('button[data-menu="nextDay"]');
    await page.waitForTimeout(400);
    continue;
  }

  if (route === "pass") {
    await passLot();
    cursor += 1;
    console.log(`${tag} pass   `, JSON.stringify(await snapshot()));
    continue;
  }

  const result = await bidUntilWon(tag);
  if (result !== "won") {
    await passLot();
    console.log(`${tag} ${result}，换下一箱重试`);
    continue;
  }
  if (cursor === 0) {
    await shot("03-disposal");
  }
  if (route === "home") {
    await click('[data-role="route"][data-route="home"]');
    await page.waitForTimeout(280);
    // 带回家会先切到店铺，需要点拍卖锤回到拍卖场继续当天批次。
    if (await page.isVisible('.scene.is-active [data-role="hammer"]')) {
      await click('[data-role="hammer"]');
      await page.waitForTimeout(280);
    }
  } else if (route === "resale") {
    await shot("05-disposal");
    await click('[data-role="route"][data-route="resale"]');
    await page.waitForTimeout(280);
  } else if (route === "onsite_sell") {
    await click('[data-role="route"][data-route="onsite"]');
    await waitForScene("disposal_open");
    await shot("07-onsite");
    console.log(`${tag} onsite `, JSON.stringify(await snapshot()));
    await click('[data-role="onsiteSell"]');
    await page.waitForTimeout(280);
  } else {
    await click('[data-role="route"][data-route="onsite"]');
    await waitForScene("disposal_open");
    await shot("07-onsite");
    await shot("08-onsite-home");
    console.log(`${tag} onsite `, JSON.stringify(await snapshot()));
    await click('[data-role="onsiteHome"]');
    await page.waitForTimeout(280);
  }
  cursor += 1;
  console.log(`${tag} done   `, JSON.stringify(await snapshot()));
}

console.log("6 routes done  ", cursor, "/", wanted.length);
dayLog.forEach((line) => console.log("   ", line));

await shot("12-final");
console.log("7 final        ", JSON.stringify(await snapshot()));
const board = await page.textContent(inScene('[data-name="信息板"]')).catch(() => "");
if (board) {
  console.log("info board     ", board.replace(/\s+/g, " ").slice(0, 360));
}

await browser.close();

if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
