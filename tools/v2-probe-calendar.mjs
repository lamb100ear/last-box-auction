// 打印日历相关图层的逻辑坐标，用于核对文字位置。
import { createRequire } from "node:module";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const width = Number(process.argv[2]) || 1600;
const height = Number(process.argv[3]) || 900;
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width, height } });
page.on("pageerror", (error) => console.log("[pageerror]", error.message));
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.waitForTimeout(600);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(500);
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
}
await page.waitForTimeout(600);
console.log(
  JSON.stringify(
    await page.evaluate(() => {
      const canvas = document.getElementById("canvas");
      const scale = canvas.getBoundingClientRect().width / parseFloat(canvas.style.width);
      const rect = (selector) => {
        const el = document.querySelector(`.scene.is-active ${selector}`);
        if (!el) {
          return null;
        }
        const box = el.getBoundingClientRect();
        return {
          x: Math.round(box.left / scale),
          y: Math.round(box.top / scale),
          w: Math.round(box.width / scale),
          h: Math.round(box.height / scale),
          text: el.textContent.trim()
        };
      };
      return {
        scale: Math.round(scale * 100) / 100,
        canvasW: canvas.style.width,
        calendar: rect('[data-name="日历"]'),
        day: rect('[data-name="日历_天数"]'),
        trend: rect('[data-name="日历_趋势"]'),
        cash: rect('[data-name="余额"]'),
        trouble: rect('[data-name="麻烦值"]'),
        reputation: rect('[data-name="信誉值"]')
      };
    })
  )
);
await browser.close();
