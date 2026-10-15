// 线索物品检查：生成一件线索物品，确认图片、关键词、记事本与万物通检索。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.clue-check";
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

// 直接把一件线索物品放进货架，并完成检视。
console.log(
  "线索物品     ",
  JSON.stringify(
    await page.evaluate(async () => {
      const story = await import("/js/v2/storydata.js");
      const inspect = await import("/js/v2/inspect.js");
      const st = window.__lastBox.state;
      const def = story.CLUE_ITEMS.find((entry) => entry.name === "手织毛衣");
      const item = {
        uid: "clue-test",
        templateId: def.id,
        name: def.name,
        category: def.category,
        baseValue: def.baseValue,
        value: def.baseValue,
        condition: { id: "long_stored", label: "长期存放" },
        appearance: { id: "worn", label: "磨损" },
        label: { id: "handwritten_name", label: "手写姓名" },
        code: "手-11A",
        acquisitionCost: 80,
        traitId: null,
        storyId: def.buyer === "纸鹤收藏" ? "paper_crane" : null,
        storyKeywords: def.keywords.slice(),
        clue: true,
        facts: null,
        inspection: null,
        operations: def.operations.slice(),
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
      return { name: item.name, storyId: item.storyId, keywords: item.storyKeywords, ops: item.operations };
    })
  )
);
await click('[data-role="calendar"]');
await page.waitForTimeout(200);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-shelf.png` });
console.log(
  "货架图       ",
  await page.evaluate(
    () =>
      document.querySelector('.scene.is-active .slot-art')?.getAttribute("src") || null
  )
);

// 打开记事本，确认关键词与检索结果。
await click('[data-role="notebook"]');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-notebook.png` });
const keywordInfo = await page.evaluate(() => {
  const chips = Array.from(
    document.querySelectorAll('.scene.is-active [data-name="记事本_右页"] .chip-btn')
  ).map((el) => el.textContent.trim());
  return chips;
});
console.log("记事本词条   ", JSON.stringify(keywordInfo.slice(0, 8)));

// 选第一个线索关键词并查询
const searched = await page.evaluate(async () => {
  const buttons = Array.from(
    document.querySelectorAll('.scene.is-active [data-name="记事本_右页"] [data-role="nbKeyword"]')
  );
  const target = buttons.find((el) => !el.disabled);
  if (!target) {
    return null;
  }
  const keyword = target.textContent.trim();
  target.click();
  const searchButton = document.querySelector('.scene.is-active [data-role="nbSearch"]');
  if (searchButton) {
    searchButton.click();
  }
  return keyword;
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-search.png` });
console.log(
  "检索结果     ",
  JSON.stringify(
    await page.evaluate(() => {
      const panel = document.querySelector('.scene.is-active [data-name="万物通页面"]');
      return {
        sheet: window.__lastBox.ui.sheet,
        text: panel ? panel.textContent.replace(/\s+/g, " ").trim().slice(0, 120) : null
      };
    })
  ),
  searched
);

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
