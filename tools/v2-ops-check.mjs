// 检查不同物品分配到的检视操作是否符合物品性质。
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

const result = await page.evaluate(() => {
  const state = window.__lastBox.state;
  const lot = state.lots[0];
  const names = [
    "旧手术剪",
    "无标签药盒",
    "反复修改的遗嘱",
    "金表",
    "旧拍立得",
    "一叠纪念明信片",
    "古董茶具",
    "便携相机"
  ];
  return names.map((name) => {
    const item = Object.assign({}, lot.items[0], {
      uid: "check-" + name,
      name,
      templateId: "check",
      operations: null,
      inspection: null
    });
    state.inventory.push(item);
    const inspection = window.__lastBox.ensureInspection(item);
    return [name, inspection.operations.join("+")];
  });
});
console.log(result.map((row) => row.join(" -> ")).join("\n"));
await browser.close();
