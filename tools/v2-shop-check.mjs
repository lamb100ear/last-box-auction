// 店铺界面美术检查：基础场景 + 买家到店。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.shop-check";
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
await page.waitForTimeout(500);
await click('[data-role="calendar"]');
await page.waitForTimeout(800);
console.log("scene:", await page.evaluate(() => window.__lastBox.scene));
await page.screenshot({ path: `${OUT}/01-shop.png` });

// 造一只箱子和一件物品，检查货架格位。
await page.evaluate(async () => {
  const inspect = await import("/js/v2/inspect.js");
  const st = window.__lastBox.state;
  const item = {
    uid: "test-item",
    templateId: "gold_watch",
    name: "金表",
    category: "luxury",
    baseValue: 2350,
    value: 2350,
    condition: { id: "normal", label: "普通" },
    appearance: { id: "complete", label: "完整" },
    label: { id: "old", label: "旧物" },
    code: "T-1",
    acquisitionCost: 500,
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
  st.inventory = [item];
  st.shelfBoxes = [
    { id: "box-1", size: { label: "登机箱" }, items: [1, 2], price: 300, opened: false }
  ];
});
await click('[data-role="calendar"]');
await page.waitForTimeout(200);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/02-shop-items.png` });
console.log(
  "货架计数     ",
  await page.evaluate(
    () =>
      document.querySelector('.scene.is-active [data-name="货架_计数"] .value')?.textContent
  )
);

// 上架一个买家，检查立绘和气泡。
await page.evaluate(async () => {
  const st = window.__lastBox.state;
  const item = st.inventory[0];
  st.inventory = [];
  st.listingSeq = (st.listingSeq || 0) + 1;
  st.listings = [
    {
      id: "listing-" + st.listingSeq,
      item,
      price: 2200,
      tags: ["旧物", "可收藏"],
      days: 1,
      day: st.day,
      arrivalDay: st.day,
      arrivalKind: "quick",
      arrivalAt: Date.now(),
      status: "waiting"
    }
  ];
  const listingModule = await import("/js/v2/listing.js");
  listingModule.arriveBuyer(st);
});
await click('[data-role="calendar"]');
await page.waitForTimeout(200);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-shop-buyer.png` });
console.log(
  "买家气泡     ",
  (
    await page.evaluate(() =>
      document
        .querySelector('.scene.is-active [data-name="买家对话气泡"]')
        ?.textContent.replace(/\s+/g, " ")
        .trim()
    )
  )?.slice(0, 90)
);

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
