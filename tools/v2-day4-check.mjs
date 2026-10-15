// 检查第 4 天高额箱、贷款分支和检视台按键高亮。
import { createRequire } from "node:module";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
await page.click('#mascot [data-mascot="full"]');
await page.waitForTimeout(300);
await page.click('#mascot [data-mascot="continue"]');
await page.waitForTimeout(300);

// 从第 3 天结束本日，自然进入第 4 天，检查是否生成高额优先寄售箱。
await page.evaluate(() => {
  const state = window.__lastBox.state;
  state.day = 3;
  state.cash = 40;
  state.highValueSeen = false;
  state.tutorial.mode = "skipped";
  window.__lastBox.ui.focusNames = [];
  document
    .querySelectorAll(".layer.is-tutorial-dim")
    .forEach((el) => el.classList.remove("is-tutorial-dim"));
});
await page.click('.scene.is-active [data-role="calendar"]');
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="closeDay"]');
await page.waitForTimeout(400);
await page.click('button[data-menu="nextDay"]');
await page.waitForTimeout(600);
const lots = await page.evaluate(() => {
  const state = window.__lastBox.state;
  return {
    day: state.day,
    cash: state.cash,
    count: state.lots.length,
    high: state.lots.filter((lot) => lot.highValue).map((lot) => lot.startPrice)
  };
});
console.log("day4 lots:", JSON.stringify(lots));

// 出价到余额不足。
for (let step = 0; step < 12; step += 1) {
  if (await page.isVisible('#mascot [data-mascot="need"]')) {
    break;
  }
  if (await page.isVisible('.scene.is-active [data-name="加价"]')) {
    await page.click('.scene.is-active [data-name="加价"]');
    await page.waitForTimeout(200);
  } else {
    break;
  }
}
const ask = await page.isVisible('#mascot [data-mascot="need"]');
console.log("day4 贷款诱导出现:", ask);
const detail = await page.evaluate(() => {
  const ui = window.__lastBox.ui;
  const state = window.__lastBox.state;
  return {
    dialogue: ui.dialogue ? ui.dialogue.id : null,
    pendingLoan: Boolean(ui.pendingLoan),
    loan: Boolean(ui.loan),
    price: state.auction.price,
    cash: state.cash,
    mascotHidden: document.getElementById("mascot").hidden,
    day4Asked: state.tutorial.day4Asked,
    lots0: state.lots[0] ? state.lots[0].startPrice : null,
    status: state.auction.status,
    focusNames: ui.focusNames,
    log: window.__lastBox.log.slice(-3)
  };
});
console.log("detail:", JSON.stringify(detail));

const dispatched = await page.evaluate(() => {
  const el = document.querySelector('.scene.is-active [data-name="加价"]');
  if (!el) {
    return "no element";
  }
  el.click();
  return "clicked";
});
await page.waitForTimeout(300);
const after = await page.evaluate(() => ({
  price: window.__lastBox.state.auction.price,
  dialogue: window.__lastBox.ui.dialogue ? window.__lastBox.ui.dialogue.id : null,
  log: window.__lastBox.log.slice(-2)
}));
console.log("dispatch:", dispatched, JSON.stringify(after));
if (ask) {
  await page.click('#mascot [data-mascot="need"]');
  await page.waitForTimeout(300);
  await page.click('#mascot [data-mascot="ok"]');
  await page.waitForTimeout(400);
}
const poster = await page.evaluate(() => {
  const el = document.querySelector('.scene.is-active [data-name="黑匣广告海报"]');
  const button = document.querySelector('.scene.is-active button[data-role="takeLoan"]');
  return {
    visible: el ? !el.classList.contains("is-hidden") : false,
    button: button ? button.textContent.trim() : null,
    panel: el ? el.textContent.replace(/\s+/g, " ").slice(0, 90) : null
  };
});
console.log("垫资海报:", JSON.stringify(poster));

await browser.close();
if (errors.length) {
  console.log("ERRORS:", errors.slice(0, 3));
}
