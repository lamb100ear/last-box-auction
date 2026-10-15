// 打开页面，打印控制台错误与首屏结构，用于快速定位加载失败。
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
page.on("console", (message) => console.log(`[console.${message.type()}]`, message.text()));
page.on("pageerror", (error) => console.log("[pageerror]", error.message, "\n", error.stack));
page.on("response", (response) => {
  if (response.status() >= 400) {
    console.log(`[http ${response.status()}] ${response.url()}`);
  }
});
await page.goto("http://127.0.0.1:4173/v2.html", { waitUntil: "load" });
await page.waitForTimeout(1500);
console.log("overlay:", await page.evaluate(() => {
  const el = document.getElementById("overlay");
  return el ? `${el.hidden ? "hidden" : "shown"} ${el.innerHTML.slice(0, 200)}` : "missing";
}));
await browser.close();
