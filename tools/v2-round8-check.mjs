// 教学分支验证：买家步骤的失败分支（压价失败 / 编造被识破 / 买家取消）。
// 用法：先启动 node server.js，再运行 node tools/v2-round8-check.mjs <截图目录>

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(
  "file:///C:/Users/33153/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/index.js"
);
const { chromium } = require("playwright-core");

const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.argv[2] || "./.check-round8";
const TARGET = process.argv[3] || "http://127.0.0.1:4173/v2.html";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("favicon")) {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

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

const mascotState = () =>
  page.evaluate(() => ({
    text: document.getElementById("mascot-text")?.textContent || null,
    options: Array.from(document.querySelectorAll("#mascot [data-mascot]")).map(
      (el) => el.dataset.mascot
    ),
    dialogue: window.__lastBox.ui.dialogue && window.__lastBox.ui.dialogue.id,
    index: window.__lastBox.state.tutorial.index,
    step: (() => {
      const step = window.__lastBox.ui.focusNames;
      return step && step.length ? step.join("+") : null;
    })()
  }));

const SETUP = `
  async (spec) => {
    const inspect = await import("/js/v2/inspect.js");
    const st = window.__lastBox.state;
    const item = {
      uid: spec.uid,
      templateId: spec.uid,
      name: spec.name,
      category: "common",
      baseValue: spec.value,
      value: spec.value,
      condition: { id: "normal", label: "普通" },
      appearance: { id: "complete", label: "完整" },
      label: { id: "old", label: "旧物" },
      originId: "station_warehouse",
      originLabel: "车站仓库清仓",
      code: "T-42",
      acquisitionCost: 100,
      traitId: null,
      facts: null, inspection: null, operations: null, truth: null, forgery: null
    };
    inspect.ensureTruth(item);
    inspect.ensureInspection(item);
    item.operations.forEach((id) => { item.inspection.results[id] = { quality: "perfect" }; });
    item.inspection.completed = true;
    st.listingSeq = (st.listingSeq || 0) + 1;
    st.listings = [{
      id: "listing-" + st.listingSeq,
      item,
      price: spec.price,
      tags: ["旧物", "可收藏"],
      days: 1,
      day: st.day,
      arrivalDay: st.day,
      arrivalKind: "quick",
      arrivalAt: Date.now(),
      status: "waiting"
    }];
    st.inventory = [];
    st.buyer = null;
    return item.name;
  }
`;

async function setupListing(spec) {
  await page.evaluate(
    async ({ source, payload }) => {
      const factory = eval(source);
      await factory(payload);
    },
    { source: SETUP, payload: spec }
  );
  await click('[data-role="calendar"]');
  await page.waitForTimeout(180);
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(250);
}

// 让教学停在买家步骤，并固定买家档案。
async function stageBuyerStep(profileId, trust) {
  await page.evaluate(
    async ({ wanted, trustValue }) => {
      const st = window.__lastBox.state;
      st.tutorial.mode = "full";
      st.tutorial.index = 10;
      st.tutorial.completed = [
        "look", "bid", "rival", "carry", "openBox", "inspect",
        "inspectOps", "sellEntry", "calendar", "listing"
      ];
      st.buyerBlacklist = {};
      const listingModule = await import("/js/v2/listing.js");
      const buyerModule = await import("/js/v2/buyer.js");
      const data = await import("/js/data.js");
      listingModule.arriveBuyer(st);
      const profile = data.STAGE_TWO_DATA.buyerProfiles.find((entry) => entry.id === wanted);
      if (st.buyer && profile) {
        st.buyer.profileId = profile.id;
        st.buyer.name = profile.name;
        st.buyer.displayId = profile.displayId;
        st.buyer.preference = profile.preference;
        st.buyer.personality = buyerModule.personalityTag(profile.id);
        st.buyer.opening = profile.opening;
        st.buyer.questions = buyerModule.buildQuestions(st.listings[0].item, profile, {
          priceOverflow: st.buyer.priceOverflow
        });
      }
      if (st.buyer && typeof trustValue === "number") {
        st.buyer.trust = trustValue;
      }
      // 清掉上一步的聚焦限制，方便用一次界面操作触发重绘。
      window.__lastBox.ui.focusNames = [];
      document
        .querySelectorAll(".layer.is-tutorial-dim")
        .forEach((el) => el.classList.remove("is-tutorial-dim"));
    },
    { wanted: profileId, trustValue: trust }
  );
  await click('[data-role="calendar"]');
  await page.waitForTimeout(180);
  await click('[data-role="closeSheet"]');
  await page.waitForTimeout(300);
}

await page.goto(TARGET, { waitUntil: "load" });
await page.waitForTimeout(400);
await page.click('.scene.is-active [data-role="startNew"]');
await page.waitForTimeout(400);
await page.click('#mascot [data-mascot="full"]');
await page.waitForTimeout(300);
await page.click('#mascot [data-mascot="continue"]');
await page.waitForTimeout(300);
await click('[data-role="calendar"]');
await page.waitForTimeout(500);

// ---------- 1. 压价失败：信任不够，交易谈崩 ----------
await setupListing({ uid: "love_letter", name: "未寄出的情书", value: 300, price: 900 });
await stageBuyerStep("seven_warehouse", 12);
console.log("1 买家步骤     ", JSON.stringify(await mascotState()));
await page.evaluate(() => {
  const st = window.__lastBox.state;
  st.buyer.questionIndex = st.buyer.questions.length;
  // 清掉聚焦限制，让下面这一次界面操作能触发重绘。
  window.__lastBox.ui.focusNames = [];
  document
    .querySelectorAll(".layer.is-tutorial-dim")
    .forEach((el) => el.classList.remove("is-tutorial-dim"));
});
await click('[data-role="calendar"]');
await page.waitForTimeout(150);
await click('[data-role="closeSheet"]');
await page.waitForTimeout(250);
await page.evaluate(() => {
  const st = window.__lastBox.state;
  window.__originalRandom = window.__originalRandom || Math.random;
  Math.random = () => 0.99;
});
await click('[data-role="settleBuyer"]');
await page.waitForTimeout(500);
await page.evaluate(() => {
  if (window.__originalRandom) {
    Math.random = window.__originalRandom;
    window.__originalRandom = null;
  }
});
await shot("01-fail-branch");
console.log("2 失败分支     ", JSON.stringify(await mascotState()));
console.log(
  "3 失败后状态   ",
  JSON.stringify(
    await page.evaluate(() => {
      const st = window.__lastBox.state;
      return {
        listings: st.listings.length,
        shelf: st.inventory.map((e) => e.name),
        buyer: Boolean(st.buyer),
        tutorialIndex: st.tutorial.index,
        completed: st.tutorial.completed.slice(-2)
      };
    })
  )
);
await page.click('#mascot [data-mascot="ok"]');
await page.waitForTimeout(400);
console.log("4 继续后       ", JSON.stringify(await mascotState()));
await shot("02-after-continue");

// ---------- 2. 编造被识破后走失败分支 ----------
await setupListing({ uid: "backup_phone", name: "备用手机", value: 700, price: 600 });
await stageBuyerStep("seven_warehouse", 50);
await page.evaluate(() => {
  window.__originalRandom = Math.random;
  Math.random = () => 0;
});
await click('[data-reply="lie"]');
await page.waitForTimeout(400);
await page.evaluate(() => {
  Math.random = window.__originalRandom;
  window.__originalRandom = null;
});
console.log(
  "5 识破后       ",
  JSON.stringify({
    mascot: await mascotState(),
    buyerCaught: await page.evaluate(() => window.__lastBox.ui.buyerCaught)
  })
);
await click('[data-role="buyerLeave"]');
await page.waitForTimeout(500);
await shot("03-fail-detected");
console.log("6 识破失败分支 ", JSON.stringify(await mascotState()));

await browser.close();
if (errors.length) {
  console.log("CONSOLE ERRORS:");
  errors.slice(0, 6).forEach((text) => console.log(" -", text));
  process.exitCode = 1;
} else {
  console.log("no console errors");
}
