// 快速验证买家到店：造一条上架记录，把到店时间设成一秒后，看买家会不会自己上门。
import { createRequire } from "node:module";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);

const setup = await page.evaluate(() => {
  const state = window.__lastBox.state;
  state.tutorial = {
    mode: "skipped",
    index: 0,
    completed: [],
    day4Shown: false,
    day4Asked: false,
    day2Shown: false
  };
  const item = state.lots[0].items[0];
  item.inspection = { operations: [], results: {}, completed: true };
  state.inventory.push(item);
  return item.name;
});

const published = await page.evaluate(() => {
  const state = window.__lastBox.state;
  const item = state.inventory[0];
  state.listings.push({
    id: "test-listing",
    item,
    price: 300,
    tags: ["旧物", "可收藏"],
    days: 1,
    tagConfidence: "高",
    forgery: null,
    day: state.day,
    arrivalDay: state.day + 1,
    arrivalKind: "quick",
    arrivalAt: Date.now() + 1000,
    status: "waiting"
  });
  return state.listings[0].arrivalKind;
});
console.log("item:", setup, "kind:", published);

await page.waitForTimeout(9000);
const result = await page.evaluate(() => {
  const state = window.__lastBox.state;
  return {
    buyer: state.buyer ? state.buyer.name : null,
    trust: state.buyer ? Math.round(state.buyer.trust) : null,
    listingStatus: state.listings[0] ? state.listings[0].status : null
  };
});
console.log("after 9s:", JSON.stringify(result));

const day2 = await page.evaluate(() => {
  const state = window.__lastBox.state;
  state.buyer = null;
  if (state.listings[0]) {
    state.listings[0].status = "waiting";
    state.listings[0].arrivalAt = null;
    state.listings[0].arrivalKind = "nextDay";
    state.listings[0].arrivalDay = state.day + 1;
  }
  state.day += 1;
  return state.day;
});
await page.waitForTimeout(5000);
const fallback = await page.evaluate(() => {
  const state = window.__lastBox.state;
  return { day: state.day, buyer: state.buyer ? state.buyer.name : null };
});
console.log("next day:", day2, JSON.stringify(fallback));

await browser.close();
