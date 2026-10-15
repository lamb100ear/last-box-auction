// 处置界面美术检查：主状态 + 现场开箱状态截图。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.disposal-check";
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
await page.waitForTimeout(600);
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
}
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__lastBox.state.cash = 8000;
});
for (let step = 0; step < 40; step += 1) {
  if (await page.isVisible(inScene('[data-name="成交印章"]'))) {
    break;
  }
  if (await click('[data-name="加价"]')) {
    await page.waitForTimeout(140);
    continue;
  }
  await page.waitForTimeout(140);
}
await page.waitForTimeout(1200);
console.log("scene:", await page.evaluate(() => window.__lastBox.scene));
await page.screenshot({ path: `${OUT}/01-disposal.png` });
console.log(
  "处置界面     ",
  JSON.stringify(
    await page.evaluate(() => {
      const read = (name) => {
        const el = document.querySelector(`.scene.is-active [data-name="${name}"]`);
        if (!el) {
          return null;
        }
        const art = el.querySelector("img.art");
        return {
          text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
          art: art ? art.getAttribute("src") : null
        };
      };
      return {
        背景: read("背景"),
        箱子: read("箱子"),
        原封转卖: read("原封转卖"),
        现场开箱: read("现场开箱"),
        带回家: read("带回家")
      };
    })
  )
);
await click('[data-role="route"][data-route="onsite"]');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/02-disposal-open.png` });
console.log(
  "现场开箱     ",
  JSON.stringify(
    await page.evaluate(() => {
      const read = (name) => {
        const el = document.querySelector(`.scene.is-active [data-name="${name}"]`);
        if (!el) {
          return null;
        }
        const art = el.querySelector("img.art");
        return {
          text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
          art: art ? art.getAttribute("src") : null
        };
      };
      return {
        scene: window.__lastBox.scene,
        箱子: read("箱子"),
        预览面板: read("预览面板"),
        全部卖给现场: read("全部卖给现场"),
        全部带回家: read("全部带回家")
      };
    })
  )
);

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
