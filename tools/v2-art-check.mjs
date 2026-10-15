// 美术置换检查：开始界面、拍卖界面截图 + 控制台报错。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.art-check";
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

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
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
await page.waitForTimeout(900);
await shot("01-start");
console.log(
  "开始界面     ",
  JSON.stringify(
    await page.evaluate(() => ({
      scene: window.__lastBox.scene,
      loadDisabled: document
        .querySelector('.scene.is-active [data-name="载入游戏按键"]')
        ?.classList.contains("is-disabled"),
      font: getComputedStyle(document.getElementById("canvas")).fontFamily
    }))
  )
);

await click('[data-role="startNew"]');
await page.waitForTimeout(900);
console.log(
  "点击开始后   ",
  JSON.stringify(
    await page.evaluate(() => ({
      scene: window.__lastBox.scene,
      hasState: Boolean(window.__lastBox.state),
      mascotHidden: document.getElementById("mascot").hidden,
      mascotText: document.getElementById("mascot-text").textContent,
      overlayHidden: document.getElementById("overlay").hidden,
      clip: document.querySelector(".scene.is-active")?.dataset.scene
    }))
  )
);
await shot("02-opening");
if (await page.isVisible('#mascot [data-mascot="skip"]')) {
  await page.click('#mascot [data-mascot="skip"]');
}
await page.waitForTimeout(600);
await shot("03-auction");
console.log(
  "拍卖界面     ",
  JSON.stringify(
    await page.evaluate(() => {
      const read = (name) => {
        const el = document.querySelector(`.scene.is-active [data-name="${name}"]`);
        if (!el) {
          return null;
        }
        const art = el.querySelector("img.art");
        return {
          value: el.querySelector(".value")?.textContent ?? null,
          art: art ? art.getAttribute("src") : null
        };
      };
      return {
        scene: window.__lastBox.scene,
        拍卖场: read("拍卖场"),
        当前箱子: read("当前箱子"),
        余额: read("余额"),
        日历_天数: read("日历_天数"),
        日历_趋势: read("日历_趋势"),
        买家一出价: read("买家一出价"),
        玩家出价: read("玩家出价"),
        加价: read("加价")
      };
    })
  )
);

// 出价一次，检查出价信息栏变化
await click('[data-name="加价"]');
await page.waitForTimeout(500);
console.log(
  "出价后       ",
  JSON.stringify(
    await page.evaluate(() => {
      const text = (name) =>
        document
          .querySelector(`.scene.is-active [data-name="${name}"] .value`)
          ?.textContent ?? null;
      return {
        price: window.__lastBox.state.auction.price,
        leader: window.__lastBox.state.auction.leader,
        player: text("玩家出价"),
        bid1: text("买家一出价"),
        bid2: text("买家二出价")
      };
    })
  )
);
await shot("04-auction-bid");

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
