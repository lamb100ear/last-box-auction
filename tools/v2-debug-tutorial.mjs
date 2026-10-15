// 调试：打印教学步骤与当前步骤，确认买家步骤下标。
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
page.on("pageerror", (error) => console.log("[pageerror]", error.message));
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(300);
await page.click('#mascot [data-mascot="full"]');
await page.waitForTimeout(200);
await page.click('#mascot [data-mascot="continue"]');
await page.waitForTimeout(200);
await page.click('.scene.is-active [data-role="calendar"]');
await page.waitForTimeout(400);
console.log(
  JSON.stringify(
    await page.evaluate(async () => {
      const mascot = await import("/js/v2/mascot.js");
      const st = window.__lastBox.state;
      return {
        tutorial: { mode: st.tutorial.mode, index: st.tutorial.index },
        stepIds: mascot.DAY1_STEPS.map((step) => step.id),
        current: mascot.currentStep(st) && mascot.currentStep(st).id
      };
    })
  )
);
await browser.close();
