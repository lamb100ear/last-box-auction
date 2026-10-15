// 店铺各窗口美术检查：逐个打开并截图。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.shop-windows";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
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

const inScene = (selector) => `.scene.is-active ${selector}`;
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

await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.waitForTimeout(700);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(500);
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
}
await page.waitForTimeout(400);
await click('[data-role="calendar"]');
await page.waitForTimeout(600);

// 造一件已检视物品（详情 / 出售 / 检视台都要用）。
await page.evaluate(async () => {
  const inspect = await import("/js/v2/inspect.js");
  const st = window.__lastBox.state;
  const item = {
    uid: "ui-test",
    templateId: "gold_watch",
    name: "金表",
    category: "luxury",
    baseValue: 2350,
    value: 2350,
    condition: { id: "normal", label: "普通" },
    appearance: { id: "complete", label: "完整" },
    label: { id: "old", label: "旧物" },
    code: "金-77B",
    acquisitionCost: 600,
    traitId: "reputation_bonus",
    facts: null,
    inspection: null,
    operations: null,
    truth: null,
    forgery: null
  };
  inspect.ensureTruth(item);
  inspect.ensureInspection(item);
  item.operations.forEach((id) => {
    item.inspection.results[id] = { quality: "perfect" };
  });
  item.inspection.completed = true;
  inspect.ensureFacts(item).forEach((fact) => {
    fact.discovered = true;
  });
  st.inventory = [item];
  st.fakeStock = { fake_blank_label: 2 };
});
await click('[data-role="calendar"]');
await page.waitForTimeout(150);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(500);

async function shot(name, label) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(label, await page.evaluate(() => window.__lastBox.ui.sheet));
}

// 物品详情
await click('[data-role="item"]');
await page.waitForTimeout(400);
await shot("01-detail", "物品详情窗  ");
// 出售页
await click('[data-role="openListing"]');
await page.waitForTimeout(400);
await shot("02-listing", "出售页      ");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
// 检视台
await click('[data-role="item"]');
await page.waitForTimeout(300);
await click('[data-role="openInspect"]');
await page.waitForTimeout(500);
await shot("03-inspect", "检视台      ");
await click('[data-role="tool"][data-tool="forge"]');
await page.waitForTimeout(400);
await shot("04-inspect-forge", "检视台伪造  ");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
// 商城
await click('[data-role="computer"]');
await page.waitForTimeout(400);
await shot("05-mall", "商城        ");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
// 记事本
await click('[data-role="notebook"]');
await page.waitForTimeout(400);
await shot("06-notebook", "记事本      ");
await click('[data-role="nbTab"][data-tab="book"]');
await page.waitForTimeout(400);
await shot("06b-compendium", "图鉴        ");
await click('[data-role="nbTab"][data-tab="story"]');
await page.waitForTimeout(300);
// 万物通
if (await click('[data-role="nbKeyword"]:not([disabled])')) {
  await page.waitForTimeout(200);
  await click('[data-role="nbSearch"]');
  await page.waitForTimeout(400);
  await shot("07-universal", "万物通      ");
}
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
// 收纳盒
await click('[data-role="keepsake"]');
await page.waitForTimeout(400);
await shot("08-keepsake", "收纳盒      ");
await click('[data-role="closeSheet"]');
await page.waitForTimeout(300);
// 日历
await click('[data-role="calendar"]');
await page.waitForTimeout(400);
await shot("09-calendar", "日历        ");

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 10).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
