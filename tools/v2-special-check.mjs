// 线索物品特殊会话检查：台词、三个文档选项、选项效果。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const OUT = process.argv[2] || "./.special-check";
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

// 把「手织毛衣」上架，并让纸鹤收藏到店。
console.log(
  "特殊会话     ",
  JSON.stringify(
    await page.evaluate(async () => {
      const story = await import("/js/v2/storydata.js");
      const data = await import("/js/data.js");
      const buyerModule = await import("/js/v2/buyer.js");
      const inspect = await import("/js/v2/inspect.js");
      const st = window.__lastBox.state;
      const def = story.CLUE_ITEMS.find((entry) => entry.name === "手织毛衣");
      const item = {
        uid: "clue-special",
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
        storyId: "paper_crane",
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
      st.inventory = [];
      st.listingSeq = 1;
      st.listings = [
        {
          id: "listing-1",
          item,
          price: 200,
          tags: ["旧物", "可收藏"],
          days: 1,
          day: st.day,
          arrivalDay: st.day,
          arrivalKind: "quick",
          arrivalAt: Date.now(),
          status: "waiting"
        }
      ];
      const profile = data.STAGE_TWO_DATA.buyerProfiles.find((entry) => entry.id === "paper_crane");
      const special = buyerModule.specialQuestion(st, item, profile);
      return {
        hasSpecial: Boolean(special),
        text: special && special.text,
        options: special && special.replies.map((reply) => reply.text),
        effects: special && special.replies.map((reply) => ({
          trust: reply.trust,
          boost: reply.priceBoost,
          leave: reply.mayLeave,
          pause: reply.pause
        }))
      };
    })
  )
);

// 让买家到店并选择第二个选项（信任下降、报价提高）
await page.evaluate(async () => {
  const st = window.__lastBox.state;
  const listingModule = await import("/js/v2/listing.js");
  const data = await import("/js/data.js");
  const buyerModule = await import("/js/v2/buyer.js");
  listingModule.arriveBuyer(st);
  const profile = data.STAGE_TWO_DATA.buyerProfiles.find((entry) => entry.id === "paper_crane");
  if (st.buyer && profile) {
    st.buyer.profileId = profile.id;
    st.buyer.name = profile.name;
    st.buyer.displayId = profile.displayId;
    st.buyer.preference = profile.preference;
    st.buyer.personality = buyerModule.personalityTag(profile.id);
    st.buyer.opening = profile.opening;
    st.buyer.questions = buyerModule.buildQuestions(st.listings[0].item, profile, {
      priceOverflow: st.buyer.priceOverflow,
      state: st
    });
  }
});
await click('[data-role="calendar"]');
await page.waitForTimeout(200);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-special.png` });
console.log(
  "气泡台词     ",
  (
    await page.evaluate(() =>
      document
        .querySelector('.scene.is-active [data-name="买家对话气泡"]')
        ?.textContent.replace(/\s+/g, " ")
        .trim()
    )
  )?.slice(0, 120)
);
console.log(
  "三个选项     ",
  JSON.stringify(
    await page.evaluate(() =>
      ["玩家选项一", "玩家选项二", "玩家选项三"]
        .map((name) => {
          const el = document.querySelector(`.scene.is-active [data-name="${name}"]`);
          return el && !el.classList.contains("is-hidden") ? el.textContent.trim() : null;
        })
        .filter(Boolean)
    )
  )
);

// 选第二个选项
const clicked = await page.evaluate(() => {
  const el = document.querySelector('.scene.is-active [data-name="玩家选项二"]');
  if (!el || el.classList.contains("is-hidden")) {
    return null;
  }
  el.click();
  return el.textContent.trim();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-after-choice.png` });
console.log(
  "选择结果     ",
  JSON.stringify(
    await page.evaluate(() => {
      const st = window.__lastBox.state;
      return {
        choice: st.storyChoices && st.storyChoices.paper_crane,
        trust: st.buyer && Math.round(st.buyer.trust),
        priceBoost: st.buyer && st.buyer.priceBoost,
        feedback: st.buyer && st.buyer.feedback && st.buyer.feedback.text
      };
    })
  ),
  clicked
);

await browser.close();
if (errors.length) {
  console.log("ERRORS:");
  errors.slice(0, 8).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
