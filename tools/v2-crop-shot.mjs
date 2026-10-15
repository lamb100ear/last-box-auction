// 截取拍卖界面并按区域裁图，用于细节比对。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.crop-check";
const CROP = (process.argv[3] || "0,0,1200,130").split(",").map(Number);
mkdirSync(OUT, { recursive: true });

const WIDTH = Number(process.env.SHOT_W || 1600);
const HEIGHT = Number(process.env.SHOT_H || 900);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"]
});
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on("pageerror", (error) => console.log("[pageerror]", error.message));
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.waitForTimeout(700);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(700);
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
}
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/full.png` });
await page.screenshot({
  path: `${OUT}/crop.png`,
  clip: { x: CROP[0], y: CROP[1], width: CROP[2] - CROP[0], height: CROP[3] - CROP[1] }
});
console.log("saved", OUT);
await browser.close();
