// 检查检视台里下一步按键是否高亮。
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
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);

await page.evaluate(() => {
  const state = window.__lastBox.state;
  state.tutorial.mode = "skipped";
  const item = state.lots[0].items[0];
  state.inventory.push(item);
  window.__lastBox.ui.itemId = item.uid;
});
await page.click('.scene.is-active [data-role="calendar"]');
await page.waitForTimeout(400);
await page.evaluate(() => {
  document.querySelector('.scene.is-active [data-role="item"]').click();
});
await page.waitForTimeout(300);
await page.click('.scene.is-active [data-role="openInspect"]');
await page.waitForTimeout(300);

const report = async (label) => {
  const hints = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".scene.is-active .is-hint")).map(
      (el) => el.dataset.name || el.dataset.role || el.dataset.tool || el.className
    )
  );
  console.log(label, JSON.stringify(hints));
};
await report("初始:");

await page.click('.scene.is-active [data-role="tool"][data-tool="clean"]');
await page.waitForTimeout(250);
await report("选清洁刷后:");

await page.evaluate(() => {
  const item = window.__lastBox.state.inventory[0];
  item.inspection.clean.patches.forEach((patch) => {
    patch.progress = 1;
  });
});
await page.click('.scene.is-active [data-role="tool"][data-tool="magnifier"]');
await page.waitForTimeout(250);
await report("清洁完成后:");

await page.evaluate(() => {
  const item = window.__lastBox.state.inventory[0];
  item.inspection.magnifier.spots.forEach((spot) => {
    spot.found = true;
    spot.accuracy = 1;
  });
});
await page.click('.scene.is-active [data-role="tool"][data-tool="clean"]');
await page.waitForTimeout(250);
await report("找齐信息后:");

await browser.close();
