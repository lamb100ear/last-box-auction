// 《再拍最后一箱！》2.0 第一部分入口。
// 覆盖：三个场景骨架、常驻状态栏、存档、每日箱子、拍卖流程、处置三条路线。

import { LOGICAL, SCENE_BACKDROP } from "./layers.js";
import {
  bidLoanOffer,
  clearSaves,
  createState,
  hasCheckpoint,
  loadState,
  saveCheckpoint,
  saveWorking
} from "./state.js";
import { currentLot } from "./boxes.js";
import {
  advanceLot,
  claimLot,
  nextBidAmount,
  passLot,
  placeBid,
  takeLoan
} from "./auction.js";
import {
  boxesCapacity,
  buildOnsiteOffers,
  carryHomeBox,
  carryHomeItems,
  itemsCapacity,
  recordOnsiteOpen,
  resaleQuote,
  settleOnsiteSell,
  settleResale
} from "./outcome.js";
import { endDay, prepareDay } from "./day.js";
import {
  fitStage,
  mountStage,
  paint,
  quoteWarningHtml,
  resetResalePreview
} from "./scene.js";
import {
  addStroke,
  OPERATION_NAMES,
  finishClean,
  finishMagnifier,
  ensureInspection,
  lookThrough,
  openCover,
  powerOn,
  pullPart,
  rubCircuitDirt,
  rubClean,
  scoreForgeryDrop,
  seatPart,
  unscrew
} from "./inspect.js";
import {
  applyForgery,
  keepItem,
  openBox,
  reportContraband,
  sellContraband
} from "./shop.js";
import { buyProduct } from "./mall.js";
import {
  answerQuestion,
  arriveBuyer,
  dismissBuyer,
  publishListing,
  referencePrice,
  settleBuyer
} from "./listing.js";
import {
  buyerFailDialogue,
  DAY4_ASK,
  DAY4_NO,
  DAY4_YES,
  INTRO,
  MASCOT_ART,
  OPENING,
  chooseOpening,
  currentStep,
  ensureTutorial,
  nextStep,
  notify as notifyTutorial,
  startTutorial
} from "./mascot.js";
import { recordBox, recordBuyer, recordItem } from "./compendium.js";
import { STORIES, collectFromItem, ensureNotebook, search } from "./notebook.js";
import { buyUpgrade } from "./upgrade.js";

const app = document.getElementById("app");

app.innerHTML = `
  <div id="viewport">
    <div id="stage">
      <div id="canvas">
        <div id="toast" class="toast" hidden></div>
        <div id="intro-dim" class="intro-dim" hidden></div>
        <div id="drag-hint" class="drag-hint" hidden>
          <span class="drag-trail"></span>
          <span class="drag-hand"></span>
        </div>
        <div id="mascot" class="mascot" hidden>
          <img id="mascot-art" class="mascot-art" alt="" draggable="false" />
          <div class="mascot-bubble">
            <p id="mascot-text" class="mascot-text"></p>
            <div id="mascot-options" class="mascot-options"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="overlay" class="overlay" hidden></div>
`;

const stage = document.getElementById("stage");
const canvas = document.getElementById("canvas");
const mascotEl = document.getElementById("mascot");
const introDimEl = document.getElementById("intro-dim");
const dragHintEl = document.getElementById("drag-hint");
const mascotArtEl = document.getElementById("mascot-art");
const mascotTextEl = document.getElementById("mascot-text");
const mascotOptionsEl = document.getElementById("mascot-options");
const toastEl = document.getElementById("toast");
const overlayEl = document.getElementById("overlay");

let state = null;
let sceneName = "auction";
let toastTimer = 0;
const ui = {
  loan: null,
  stamp: false,
  onsiteOffers: null,
  capacityWarning: false,
  sheet: null,
  itemId: null,
  draft: null,
  keepsakePick: null,
  returnSheet: null,
  buyerCaught: false,
  inspectMessage: "",
  inspectMode: null,
  forge: null,
  drag: null,
  focusElement: null,
  focusGroup: null,
  dialogue: null,
  notebookTab: "story",
  storyId: null,
  query: []
};

function resetSheet() {
  ui.sheet = null;
  ui.draft = null;
  ui.keepsakePick = null;
  ui.inspectMessage = "";
  ui.inspectMode = null;
  ui.forge = null;
  ui.drag = null;
  ui.universalOpen = false;
  ui.universalQuery = [];
}

function openSheet(name) {
  ui.sheet = name;
  refresh();
}

function currentItem() {
  return state.inventory.find((entry) => entry.uid === ui.itemId) || null;
}

const ROLE_HANDLERS = {
  bid: handleBid,
  pass: handlePass,
  route: (element) => handleRoute(element.dataset.route),
  takeLoan: handleTakeLoan,
  dismissLoan: handleDismissLoan,
  startNew: () => {
    if (hasCheckpoint()) {
      showOverlay(`
        <div class="menu">
          <h1>覆盖当前进度？</h1>
          <p class="sub">新游戏会清除已有的检查点。</p>
          <button class="menu-btn danger" data-menu="confirmNew">确认新游戏</button>
          <button class="menu-btn" data-menu="cancel">返回</button>
        </div>
      `);
      return;
    }
    startNewGame();
  },
  startLoad: () => continueGame(),
  onsiteSell: handleOnsiteSell,
  onsiteHome: handleOnsiteHome,
  closeDay: handleCloseDay,
  endPlate: () => goto("shop"),
  hammer: () => {
    goto("auction");
    tutorialEvent("hammer");
  },
  calendar: () => {
    if (sceneName === "shop") {
      // 记下从哪个弹层打开日历，关掉日历后回到那里。
      ui.returnSheet = ui.sheet && ui.sheet !== "calendar" ? ui.sheet : ui.returnSheet || null;
      openSheet("calendar");
      tutorialEvent("calendar");
    } else {
      goto("shop");
    }
  },
  computer: () => openSheet("mall"),
  // 商城界面顶部那条索引栏，点了跳到万物通检索页。
  mallSearch: () => {
    ui.returnSheet = "mall";
    openSheet("universal");
  },
  // 搜索窗口顶部那条索引栏，点了回到购买窗口。
  univIndex: () => {
    openSheet("mall");
  },
  window: () => {
    const listings = state.listings.filter(
      (entry) => entry.status === "waiting" || entry.status === "talking"
    );
    toast(
      listings.length
        ? `橱窗里有 ${listings.length} 件物品：${listings
            .map((entry) => `${entry.item.name} ¥${entry.price}`)
            .join("、")}。`
        : "橱窗暂时是空的。"
    );
  },
  keepsake: () =>
    openSheet("keepsake"),
  openForgeMall: () => {
    // 伪造材料不够时，直接从伪造面板去电脑商城购买，关掉商城回到检视台。
    ui.returnSheet = "inspect";
    ui.sheet = "mall";
    refresh();
  },
  // 记事本每次打开都停在买家故事页。
  notebook: () => {
    ui.notebookTab = "story";
    openSheet("notebook");
  },
  nbTab: (element) => {
    ui.notebookTab = element.dataset.tab;
    refresh();
  },
  // 右下方三角标翻到下一位买家的线索页面。
  nbNextBuyer: () => {
    const ids = STORIES.map((entry) => entry.id);
    const index = ids.indexOf(ui.storyId || ids[0]);
    ui.storyId = ids[(index + 1) % ids.length];
    ui.query = [];
    refresh();
  },
  nbKeyword: (element) => {
    const keyword = element.dataset.keyword;
    const query = ui.query || [];
    const index = query.indexOf(keyword);
    if (index >= 0) {
      query.splice(index, 1);
    } else {
      query.push(keyword);
      if (query.length > 3) {
        query.shift();
      }
    }
    ui.query = query;
    refresh();
  },
  nbClear: () => {
    ui.query = [];
    refresh();
  },
  nbSearch: () => {
    const picked = (ui.query || []).slice();
    const result = search(state, picked);
    toast(`${result.type}：${result.text}`);
    if (result.storyId) {
      recordBuyer(state, result.storyId, "fragment");
      ui.storyId = result.storyId;
    }
    ui.universalQuery = picked;
    ui.universalOpen = true;
    ui.query = [];
    // 万物通是独立窗口，从记事本点查询后切过去。
    ui.returnSheet = "notebook";
    ui.sheet = "universal";
    refresh();
  },
  openUpgrade: () => {
    ui.notebookTab = "upgrade";
    ui.sheet = "notebook";
    refresh();
  },
  doUpgrade: () => {
    const result = buyUpgrade(state);
    toast(result.text);
    refresh();
  },
  box: (element) => {
    const boxId = element.dataset.box;
    const box = state.shelfBoxes.find((entry) => entry.id === boxId);
    const result = openBox(state, boxId);
    if (result.ok && box) {
      recordBox(state, box, "opened");
      state.inventory.forEach((entry) => recordItem(state, entry, "seen"));
      tutorialEvent("openBox");
    }
    toast(result.text);
    refresh();
  },
  item: (element) => {
    ui.itemId = element.dataset.item;
    openSheet("detail");
  },
  deskItem: (element) => {
    ui.itemId = element.dataset.item;
    openSheet("record");
  },
  openInspect: () => {
    ui.inspectMode = null;
    ui.forge = null;
    ui.inspectMessage = "";
    openSheet("inspect");
    tutorialEvent("inspect");
  },
  openListing: () => {
    const item = currentItem();
    if (!item) {
      return;
    }
    ui.draft = {
      price: referencePrice(state, item).mid,
      tags: [],
      days: 1,
      materialId: null,
      targetId: item.forgery ? item.forgery.targetId : null
    };
    openSheet("listing");
    tutorialEvent("listingOpen");
  },
  keepItem: () => {
    const result = keepItem(state, ui.itemId);
    if (!result.ok && result.reason === "FULL") {
      // 收纳盒已满，先问玩家要不要替换。
      ui.keepsakePick = ui.itemId;
      ui.returnSheet = "detail";
      ui.sheet = "keepsakeAsk";
      refresh();
      return;
    }
    toast(result.text);
    if (result.ok) {
      resetSheet();
    }
    refresh();
  },
  keepsakeYes: () => {
    ui.sheet = "keepsake";
    refresh();
    tutorialEvent("keepsake");
  },
  keepsakeNo: () => {
    ui.sheet = ui.returnSheet || "detail";
    ui.returnSheet = null;
    refresh();
  },
  keepsakeSlot: (element) => {
    const replaceUid = element.dataset.keepsake;
    const result = keepItem(state, ui.keepsakePick, replaceUid);
    toast(result.text);
    ui.keepsakePick = null;
    resetSheet();
    refresh();
  },
  greySell: () => {
    const result = sellContraband(state, ui.itemId);
    toast(result.text);
    resetSheet();
    refresh();
  },
  reportItem: () => {
    const result = reportContraband(state, ui.itemId);
    toast(result.text);
    resetSheet();
    refresh();
  },
  closeSheet: () => {
    const closing = ui.sheet;
    // 日历、收纳盒确认、商城都可能在别的弹层之上打开，关掉后回到原来的弹层。
    const back =
      closing === "calendar" ||
      closing === "keepsake" ||
      closing === "keepsakeAsk" ||
      closing === "mall" ||
      closing === "universal"
        ? ui.returnSheet
        : null;
    // 返回时保留原本的弹层状态：价格、标签、检视工具都不能被清掉。
    const keep = back
      ? {
          itemId: ui.itemId,
          draft: ui.draft,
          inspectMode: ui.inspectMode,
          forge: ui.forge,
          inspectMessage: ui.inspectMessage
        }
      : null;
    resetSheet();
    if (back) {
      ui.sheet = back;
      ui.returnSheet = null;
      if (keep) {
        ui.itemId = keep.itemId;
        ui.draft = keep.draft;
        ui.inspectMode = keep.inspectMode;
        ui.forge = keep.forge;
        ui.inspectMessage = keep.inspectMessage;
      }
    }
    refresh();
    // 关掉日历才算看完趋势，这一步不提前跳走。
    if (closing === "calendar") {
      tutorialEvent("calendarClosed");
    }
  },
  tool: (element) => handleTool(element.dataset.tool),
  pickForgeMaterial: (element) => {
    ui.forge.materialId = element.dataset.material;
    refresh();
  },
  pickForgeTarget: (element) => {
    ui.forge.targetId = element.dataset.target;
    refresh();
  },
  cancelForge: () => {
    ui.forge = null;
    ui.inspectMode = null;
    ui.inspectMessage = "";
    refresh();
  },
  screw: (element) => {
    const result = unscrew(currentItem(), Number(element.dataset.index));
    toast(result.text);
    refresh();
  },
  cover: () => {
    const result = openCover(currentItem());
    toast(result.text);
    refresh();
  },
  part: () => {},
  mountedPart: (element) => {
    const result = pullPart(currentItem(), element.dataset.part);
    toast(result.text);
    refresh();
  },
  power: () => {
    const result = powerOn(currentItem());
    toast(result.text);
    refresh();
  },
  finishOp: () => finishCurrentOperation(),
  toggleTag: (element) => {
    if (!ui.draft) {
      return;
    }
    const tag = element.dataset.tag;
    const index = ui.draft.tags.indexOf(tag);
    if (index >= 0) {
      ui.draft.tags.splice(index, 1);
    } else {
      ui.draft.tags.push(tag);
      if (ui.draft.tags.length > 2) {
        ui.draft.tags.shift();
      }
    }
    refresh();
  },
  pickDays: (element) => {
    ui.draft.days = Number(element.dataset.days);
    refresh();
  },
  quickPrice: (element) => {
    const item = currentItem();
    const factor = Number(element.dataset.factor);
    ui.draft.price = Math.round((referencePrice(state, item).mid * factor) / 10) * 10;
    refresh();
  },
  pickTarget: (element) => {
    ui.draft.targetId = element.dataset.target;
    refresh();
  },
  confirmListing: () => handleConfirmListing(),
  buyProduct: (element) => {
    const result = buyProduct(state, element.dataset.product);
    toast(result.text);
    refresh();
  },
  reply: (element) => {
    const result = answerQuestion(state, element.dataset.reply);
    if (result.ok) {
      if (result.caught) {
        toast(result.text);
        // 识破后买家还在窗口里，等他离店再走失败分支。
        ui.buyerCaught = true;
      } else {
        toast(`信任 ${result.delta >= 0 ? "+" : ""}${result.delta}`);
      }
      refresh();
    }
  },
  buyerLeave: () => {
    const caught = ui.buyerCaught;
    ui.buyerCaught = false;
    dismissBuyer(state);
    refresh();
    if (caught) {
      buyerFailed("detected");
    }
  },
  settleBuyer: () => {
    const buyer = state.buyer;
    const buyerId = buyer ? buyer.profileId : null;
    const listing = buyer
      ? state.listings.find((entry) => entry.id === buyer.listingId)
      : null;
    const soldItem = listing ? listing.item : null;
    const result = settleBuyer(state);
    toast(result.text);
    if (result.result === "sold" || result.result === "haggled") {
      recordBuyer(state, buyerId, "trade");
      recordItem(state, soldItem, "sold");
      // 交易成功才算完成“买家”这一步。
      tutorialEvent("buyer");
    } else if (["left", "detected", "failed"].includes(result.result)) {
      // 交易失败走失败分支教学。
      buyerFailed(result.result === "detected" ? "detected" : result.result);
    }
    refresh();
  },
  status: () => {},
  mascot: () => {},
  auctioneer: () => {},
  lot: () => {},
  competitors: () => {},
  prop: () => {},
  notice: () => {},
  loanPoster: () => {},
  loanActions: () => {},
  sheet: () => {},
  inspectView: () => {},
  inspectOps: () => {},
  inspectBelt: () => {}
};

function refresh() {
  if (state && sceneName === "auction") {
    const lot = currentLot(state);
    if (lot && ui.lastRecordedLot !== lot.id) {
      ui.lastRecordedLot = lot.id;
      recordBox(state, lot, "seen");
    }
  }
  if (state) {
    // 线索物品进入货架后记下：这件不会再出现，并解锁对应买家故事。
    state.inventory.forEach((item) => {
      if (item.clue && !item.clueRecorded) {
        item.clueRecorded = true;
        state.ownedClues = state.ownedClues || {};
        state.ownedClues[item.templateId] = true;
        state.storyUnlocked = state.storyUnlocked || {};
        if (item.storyId) {
          state.storyUnlocked[item.storyId] = true;
        }
      }
    });
    state.inventory.forEach((item) => {
      if (item.inspection && item.inspection.completed && !item.verifiedRecorded) {
        item.verifiedRecorded = true;
        recordItem(state, item, "verified");
        collectFromItem(state, item);
        tutorialEvent("inspected");
      }
    });
  }
  renderMascot();
  paint(sceneName, state, ui);
  renderMascot();
  saveWorking(state);
}

function currentDialogue() {
  if (!state) {
    return null;
  }
  if (ui.dialogue) {
    return ui.dialogue;
  }
  const tutorial = ensureTutorial(state);
  if (tutorial.mode === "unset") {
    return OPENING;
  }
  if (tutorial.mode === "intro") {
    return INTRO;
  }
  if (tutorial.mode === "full") {
    return currentStep(state);
  }
  return null;
}

function renderMascot() {
  const dialogue = currentDialogue();
  // 「成交」印章还压在拍卖界面上时不弹小黑，等切到拍卖后处置界面再出现。
  const holdingStamp = sceneName === "auction" && ui.stamp;
  if (!dialogue || holdingStamp || ui.mascotHiddenId === dialogue.id) {
    mascotEl.hidden = true;
    applyFocus(null, false);
    return;
  }
  mascotEl.hidden = false;
  mascotArtEl.src = MASCOT_ART[dialogue.face] || MASCOT_ART.default;
  mascotTextEl.textContent = dialogue.text;
  // 开场和需要选择时拦住点击；进入正式教学后完全放行，不挡操作。
  const mode = ensureTutorial(state).mode;
  const modal = Boolean(ui.dialogue) || mode === "unset" || mode === "intro";
  mascotEl.classList.toggle("is-modal", modal);
  // 需要点击界面按键才能推进的步骤不显示「继续」。
  const options = dialogue.options || (dialogue.trigger ? [] : [{ id: "ok", label: "继续" }]);
  mascotOptionsEl.innerHTML =
    options
      .map(
        (option) =>
          `<button class="mascot-btn" data-mascot="${option.id}">${option.label}${
            option.hint ? `<span class="mascot-hint">${option.hint}</span>` : ""
          }</button>`
      )
      .join("");
  // 正式教学的每一步只保留目标按键可点，其余界面压暗。
  const dim = mode === "unset" || mode === "intro" || mode === "full";
  applyFocus(dim ? dialogue.targets || dialogue.target || null : null, dim);
  positionMascot(dialogue);
  updateDragHint();
}

// 「把物品拖到桌面」这一步用一条虚线和来回移动的手形提示拖动方向。
function updateDragHint() {
  const step = state ? currentStep(state) : null;
  const active = step && step.id === "inspect" && !ui.sheet;
  const slot = active
    ? canvas.querySelector('.scene.is-active [data-role="item"]')
    : null;
  const desk = active
    ? canvas.querySelector('.scene.is-active .layer[data-name="桌面"]')
    : null;
  if (!slot || !desk) {
    dragHintEl.hidden = true;
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const scale = canvasRect.width / (parseFloat(canvas.style.width) || canvasRect.width);
  const center = (element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - canvasRect.left) / scale,
      y: (rect.top + rect.height / 2 - canvasRect.top) / scale
    };
  };
  const from = center(slot);
  const to = center(desk);
  to.y -= 20;
  dragHintEl.hidden = false;
  dragHintEl.style.setProperty("--from-x", `${from.x}px`);
  dragHintEl.style.setProperty("--from-y", `${from.y}px`);
  dragHintEl.style.setProperty("--to-x", `${to.x}px`);
  dragHintEl.style.setProperty("--to-y", `${to.y}px`);
  const trail = dragHintEl.querySelector(".drag-trail");
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  trail.style.width = `${Math.hypot(dx, dy)}px`;
  trail.style.left = `${from.x}px`;
  trail.style.top = `${from.y}px`;
  trail.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
}

// 单步聚焦：目标按键保持正常亮度，其余界面压暗并且不可点击。
// 弹层（详情、出售、商城、检视台、日历、记事本、万物通）始终可用。
function applyFocus(targetName, dim) {
  const active = canvas.querySelector(".scene.is-active");
  if (!active) {
    return;
  }
  const names = !dim
    ? []
    : Array.isArray(targetName)
      ? targetName.slice()
      : targetName
        ? [targetName]
        : [];
  const routes = new Set();
  names.forEach((name) => {
    const element = active.querySelector(`.layer[data-name="${name}"]`);
    if (element && element.dataset.route) {
      routes.add(element.dataset.route);
    }
  });
  // 开场和纯说明步骤没有任何可点目标，整屏压暗突出小黑。
  const fullDim = dim && names.length === 0;
  introDimEl.hidden = !fullDim;
  ui.focusNames = names;
  const step = state ? currentStep(state) : null;
  const sheets = (step && step.sheets) || [];
  active.querySelectorAll(".layer").forEach((layer) => {
    const allowed = layerAllowed(layer, names, routes, sheets);
    layer.classList.toggle("is-tutorial-dim", !allowed);
    // 描边只圈这一步要做的事：跟着亮但没被点名的常驻层不画框。
    layer.classList.toggle(
      "is-focus",
      names.length > 0 && allowed && layer.dataset.role !== "sheet" && layer.dataset.role !== "status" &&
        // 玩家选项是木牌，黄框只在鼠标悬停时出现（见 css 里的 :hover 规则）。
        layer.dataset.role !== "reply" &&
        (names.includes(layer.dataset.name) || !CONVENIENCE_LAYERS.has(layer.dataset.name))
    );
  });
}

// 检视台内部控件只在检视台打开时才可能被点到，这里放行不冲突。
const INSPECT_ROLES = new Set(["tool", "inspectView", "inspectOps", "inspectBelt"]);

// 这些层随时可点，但不属于当前步骤时也不该被教学描边圈住。
const CONVENIENCE_LAYERS = new Set(["桌面", "黑匣广告海报", "借款操作栏"]);

function layerAllowed(layer, names, routes, sheets = []) {
  if (!names.length) {
    return true;
  }
  if (INSPECT_ROLES.has(layer.dataset.role)) {
    return true;
  }
  // 只放行当前步骤用得到的那几个弹层，其他弹层一样点不开。
  if (sheets.includes(layer.dataset.name)) {
    return true;
  }
  if (layer.dataset.role === "loanPoster" || layer.dataset.role === "loanActions") {
    return true;
  }
  // 桌面上的待谈物品只是查看信息，任何时候都允许点开。
  if (layer.dataset.name === "桌面") {
    return true;
  }
  if (layer.dataset.role === "reply" && names.includes("买家对话气泡")) {
    return true;
  }
  // 贴着目标走的附属层一起亮，例如出价信息栏里的三行出价。
  if (layer.dataset.follow && names.includes(layer.dataset.follow)) {
    return true;
  }
  if (names.includes(layer.dataset.name)) {
    return true;
  }
  return false;
}

// 教学期间只允许点击当前步骤的目标按键。
function clickAllowed(layer) {
  const names = ui.focusNames || [];
  if (!names.length) {
    return true;
  }
  const active = canvas.querySelector(".scene.is-active");
  const routes = new Set();
  names.forEach((name) => {
    const reference = active.querySelector(`.layer[data-name="${name}"]`);
    if (reference && reference.dataset.route) {
      routes.add(reference.dataset.route);
    }
  });
  const step = currentStep(state);
  return layerAllowed(layer, names, routes, (step && step.sheets) || []);
}

// 站到舞台前时，小黑相对「拍卖台」图层下移这么多。
const STAGE_FRONT_OFFSET = 62;

// 把小黑放到当前指引目标旁边，避免挡住操作。
function positionMascot(dialogue) {
  const canvasHeight = parseFloat(canvas.style.height) || 675;
  const canvasWidth = parseFloat(canvas.style.width) || 1200;
  // 用实际渲染尺寸计算，气泡长短不同也不会跑到画面外。
  const boxWidth = mascotEl.offsetWidth || 480;
  const boxHeight = mascotEl.offsetHeight || 130;
  // 指定站位：站在拍卖台前的空地上，跟着「拍卖台」图层走。
  if (dialogue && dialogue.spot === "stageFront") {
    const stageLayer = canvas.querySelector('.scene.is-active .layer[data-name="拍卖台"]');
    if (stageLayer) {
      mascotEl.style.left = `${stageLayer.offsetLeft}px`;
      mascotEl.style.top = `${stageLayer.offsetTop + STAGE_FRONT_OFFSET}px`;
      mascotEl.classList.remove("flip");
      return;
    }
  }
  // 有弹层打开时贴画布左下角，避免挡住弹层里的信息。
  const sheetOpen = Array.from(
    canvas.querySelectorAll('.scene.is-active .layer[data-role="sheet"]')
  ).some((element) => !element.classList.contains("is-hidden"));
  // 开场、自我介绍和买家失败提示都放在画面正中间。
  if (
    dialogue &&
    (dialogue.id === "opening" || dialogue.id === "intro" || dialogue.id === "buyerFail")
  ) {
    // 让对话框本身居中，小黑站在对话框左侧。
    const bubble = mascotEl.querySelector(".mascot-bubble");
    const bubbleWidth = (bubble && bubble.offsetWidth) || boxWidth;
    const bubbleOffset = (bubble && bubble.offsetLeft) || 0;
    mascotEl.style.left = `${Math.max(8, (canvasWidth - bubbleWidth) / 2 - bubbleOffset)}px`;
    mascotEl.style.top = `${Math.max(8, (canvasHeight - boxHeight) / 2)}px`;
    mascotEl.classList.remove("flip");
    return;
  }
  if (sheetOpen) {
    mascotEl.style.left = "10px";
    mascotEl.style.top = `${Math.max(8, canvasHeight - boxHeight - 10)}px`;
    mascotEl.classList.remove("flip");
    return;
  }
  let target = null;
  const anchorName = Array.isArray(dialogue && dialogue.target)
    ? dialogue.target[0]
    : dialogue && dialogue.target;
  if (anchorName) {
    const element = canvas.querySelector(
      `.scene.is-active .layer[data-name="${anchorName}"]`
    );
    if (element) {
      target = {
        x: element.offsetLeft,
        y: element.offsetTop,
        w: element.offsetWidth,
        h: element.offsetHeight
      };
    }
  }
  if (!target) {
    mascotEl.style.left = "16px";
    mascotEl.style.top = `${Math.max(8, canvasHeight - boxHeight - 16)}px`;
    mascotEl.classList.remove("flip");
    return;
  }
  const clampLeft = (value) => Math.max(8, Math.min(canvasWidth - boxWidth - 8, value));
  const clampTop = (value) => Math.max(8, Math.min(canvasHeight - boxHeight - 8, value));
  // 优先贴目标左侧，放不下再试下方、上方、右侧。
  let left = clampLeft(target.x - boxWidth - 14);
  let top = clampTop(target.y + target.h / 2 - boxHeight / 2);
  let flip = false;
  if (target.x - boxWidth - 14 < 8) {
    const below = target.y + target.h + 12;
    const above = target.y - boxHeight - 12;
    if (below + boxHeight <= canvasHeight - 8) {
      left = clampLeft(target.x + target.w / 2 - boxWidth / 2);
      top = clampTop(below);
    } else if (above >= 8) {
      left = clampLeft(target.x + target.w / 2 - boxWidth / 2);
      top = clampTop(above);
    } else {
      left = clampLeft(target.x + target.w + 14);
      top = clampTop(target.y + target.h / 2 - boxHeight / 2);
      flip = true;
    }
  }
  mascotEl.style.left = `${left}px`;
  mascotEl.style.top = `${top}px`;
  mascotEl.classList.toggle("flip", flip);
}

// 上报一个游戏动作，教学流程命中当前步骤时推进并刷新小黑台词。
function tutorialEvent(event) {
  if (!state) {
    return;
  }
  // 点击类事件必须点在当前步骤指定的按键上，随便点别的不会推进。
  if (CLICK_EVENTS.has(event)) {
    const step = currentStep(state);
    if (step && !stepAcceptsClick(step)) {
      return;
    }
  }
  const result = notifyTutorial(state, event);
  if (result.changed) {
    ui.dialogue = null;
    renderMascot();
  }
}

// 这些事件由界面点击触发，需要校验点的是不是本步的目标。
const CLICK_EVENTS = new Set([
  "bid",
  "win",
  "secondWin",
  "home",
  "openBox",
  "inspect",
  "listingOpen",
  "listing",
  "calendar",
  "calendarClosed",
  "hammer",
  "buyer"
]);

function stepAcceptsClick(step) {
  const names = step.targets || (step.target ? [step.target] : []);
  if (!names.length) {
    return true;
  }
  const layerElement = ui.lastClickLayer;
  if (!layerElement) {
    return false;
  }
  // 目标自带的弹层里的按钮也算命中，例如出售页面里的确认按钮。
  if (layerElement.dataset.role === "sheet") {
    return true;
  }
  if (names.includes(layerElement.dataset.name)) {
    return true;
  }
  return false;
}

function goto(name) {
  sceneName = name;
  ui.capacityWarning = false;
  // 先更新教学状态，再画界面，保证这一步的引导状态和界面一致。
  if (state && name === "disposal") {
    notifyTutorial(state, "disposal");
  }
  // 第 4 天的高额箱一上台，小黑就主动提示可以垫资。
  if (state && name === "auction") {
    const tutorial = ensureTutorial(state);
    const lot = currentLot(state);
    if (
      state.day >= 4 &&
      !tutorial.day4Asked &&
      state.totalDebt <= 0 &&
      lot &&
      lot.highValue
    ) {
      tutorial.day4Asked = true;
      ui.pendingLoan = bidLoanOffer(
        state,
        Math.max(0, nextBidAmount(state.auction.price) - state.cash)
      );
      ui.dialogue = DAY4_ASK;
    }
  }
  mountStage(canvas, name);
  stage.style.background = SCENE_BACKDROP[name] || "#203b4a";
  renderMascot();
  paint(name, state, ui);
  saveWorking(state);
}

function toast(text) {
  log.push(text);
  if (log.length > 40) {
    log.shift();
  }
  toastEl.textContent = text;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2800);
}

const log = [];

// 教学期买家步骤的失败分支：小黑安慰一句，并推进到下一步，避免卡死。
function buyerFailed(kind) {
  if (!state) {
    return;
  }
  const tutorial = ensureTutorial(state);
  if (tutorial.mode !== "full") {
    return;
  }
  const step = currentStep(state);
  if (!step || step.id !== "buyer") {
    return;
  }
  ui.dialogue = buyerFailDialogue(kind);
  notifyTutorial(state, "buyerFailed");
  refresh();
}

function handleMascot(optionId) {
  const tutorial = ensureTutorial(state);
  if (optionId === "skip") {
    chooseOpening(state, "skip");
    ui.dialogue = null;
    toast("已跳过新手引导，需要时可以从帮助入口重新开启。");
    refresh();
    return;
  }
  if (optionId === "full") {
    chooseOpening(state, "full");
    refresh();
    return;
  }
  if (optionId === "continue") {
    startTutorial(state);
    notifyTutorial(state, "start");
    ui.dialogue = null;
    refresh();
    return;
  }
  if (optionId === "need") {
    ui.dialogue = DAY4_YES;
    ui.pendingLoanForced = true;
    refresh();
    return;
  }
  if (optionId === "refuse") {
    ui.dialogue = DAY4_NO;
    refresh();
    return;
  }
  const closing = ui.dialogue;
  if (closing) {
    ui.dialogue = null;
    if (ui.pendingLoanForced && closing.id === "day4yes") {
      ui.pendingLoanForced = false;
      ui.loan = Object.assign({}, ui.pendingLoan, { forced: true });
    }
    refresh();
    return;
  }
  if (tutorial.mode === "full") {
    nextStep(state);
    refresh();
  }
}

function showOverlay(html) {
  overlayEl.innerHTML = html;
  overlayEl.hidden = false;
}

function hideOverlay() {
  overlayEl.hidden = true;
  overlayEl.innerHTML = "";
}

function startNewGame() {
  clearSaves();
  state = createState();
  ui.loan = null;
  ui.stamp = false;
  ui.onsiteOffers = null;
  resetSheet();
  ui.itemId = null;
  resetResalePreview();
  prepareDay(state);
  hideOverlay();
  goto("auction");
  toast("欢迎来到黑匣拍卖场！");
}

function continueGame() {
  const loaded = loadState();
  if (!loaded) {
    toast("暂无可载入记录。");
    return;
  }
  state = loaded;
  ui.loan = null;
  ui.stamp = false;
  ui.onsiteOffers = null;
  resetSheet();
  ui.itemId = null;
  resetResalePreview();
  if (!state.lots || !state.lots.length || state.auction.status === "finished") {
    prepareDay(state);
  }
  hideOverlay();
  goto(state.pendingWon ? "disposal" : "auction");
}

function handleBid() {
  const result = placeBid(state);
  if (!result.ok) {
    if (result.reason === "INSUFFICIENT_CASH") {
      const tutorial = ensureTutorial(state);
      if (state.day >= 4 && !tutorial.day4Asked && state.totalDebt <= 0) {
        // 第 4 天余额不足时，小黑先出现诱导贷款。
        tutorial.day4Asked = true;
        // 第 4 天的是竞拍垫资：额度按缺口走，利息固定 300%。
        ui.pendingLoan = bidLoanOffer(state, result.gap);
        ui.dialogue = DAY4_ASK;
        refresh();
        toast(`下一次报价需要 ¥${result.nextBid}，当前还差 ¥${result.gap}`);
        return;
      }
      ui.loan = result.loanOffer;
      refresh();
      toast(`下一次报价需要 ¥${result.nextBid}，当前还差 ¥${result.gap}`);
    }
    return;
  }
  tutorialEvent("bid");
  if (result.won) {
    claimLot(state);
    state.lotsWon = (state.lotsWon || 0) + 1;
    tutorialEvent("win");
    if (state.lotsWon >= 2) {
      tutorialEvent("secondWin");
    }
    ui.stamp = true;
    refresh();
    window.setTimeout(() => {
      ui.stamp = false;
      goto("disposal");
    }, 900);
    return;
  }
  if (result.outbid) {
    tutorialEvent("outbid");
    refresh();
    toast(`${result.outbid.name} 跟价到 ¥${result.price}`);
  }
}

function handlePass() {
  passLot(state);
  const next = advanceLot(state);
  ui.loan = null;
  refresh();
  toast(next ? "已放弃本箱，下一箱上台。" : "今日拍卖已结束。");
}

function handleTakeLoan() {
  const offer = ui.loan;
  if (!offer) {
    return;
  }
  takeLoan(state, offer);
  ui.loan = null;
  refresh();
  toast(
    `到账 ¥${offer.amount}，利息 ${Math.round((offer.interest || 0) * 100)}%，` +
      `总债务 ¥${state.totalDebt}，${offer.periods || 3} 期内还清。`
  );
}

function handleDismissLoan() {
  ui.loan = null;
  refresh();
  toast("不产生债务，可以继续加价或放弃本箱。");
}

function finishLot(message, goShop) {
  ui.loan = null;
  ui.onsiteOffers = null;
  ui.stamp = false;
  resetResalePreview();
  advanceLot(state);
  goto(goShop ? "shop" : "auction");
  if (message) {
    toast(message);
  }
}

function handleRoute(route) {
  const won = state.pendingWon;
  if (!won) {
    return;
  }
  if (route === "resale") {
    const quote = resaleQuote(state, won);
    const result = settleResale(state, won, quote);
    finishLot(result.text);
    return;
  }
  if (route === "onsite") {
    ui.onsiteOffers = buildOnsiteOffers(state, won);
    // 当场开箱是在买家面前进行，奢侈品和违禁品会被看见，麻烦值上升。
    const risk = recordOnsiteOpen(state, won);
    goto("disposal_open");
    if (risk.trouble > 0) {
      const parts = [];
      if (risk.luxury > 0) {
        parts.push(`奢侈品 ${Math.min(2, risk.luxury)} 件`);
      }
      if (risk.contraband > 0) {
        parts.push(`违禁品 ${risk.contraband} 件`);
      }
      toast(`当众开箱：${parts.join("、")}，麻烦值 +${risk.trouble}。`);
    }
    return;
  }
  if (route === "home") {
    const boxes = boxesCapacity(state);
    if (boxes.free < 1) {
      ui.capacityWarning = true;
      refresh();
      toast("货架容量不足，请先整理下层箱子格。");
      return;
    }
    const items = itemsCapacity(state);
    if (items.free < won.items.length) {
      ui.capacityWarning = true;
      refresh();
      toast(`上层物品格不足，需要 ${won.items.length} 格，当前剩 ${Math.max(0, items.free)} 格。`);
      return;
    }
    const result = carryHomeBox(state, won);
    if (result.ok) {
      tutorialEvent("home");
    }
    finishLot(result.ok ? result.text : "货架容量不足。", true);
  }
}

function handleOnsiteSell() {
  const won = state.pendingWon;
  if (!won || !ui.onsiteOffers) {
    return;
  }
  const result = settleOnsiteSell(state, won, ui.onsiteOffers);
  finishLot(result.text);
}

function handleOnsiteHome() {
  const won = state.pendingWon;
  if (!won || !ui.onsiteOffers) {
    return;
  }
  const result = carryHomeItems(state, won, ui.onsiteOffers, true);
  if (!result.ok) {
    toast("上层物品格不足，先卖掉一部分或整理货架。");
    return;
  }
  finishLot(result.text, true);
}

function handleTool(toolId) {
  const item = currentItem();
  if (!item || ui.sheet !== "inspect") {
    return;
  }
  // 切换工具前，把已经做完但还没确认的操作结算掉。
  settleCurrentOperation();
  const inspection = ensureInspection(item);
  if (toolId === "done") {
    if (ui.inspectMode === "clean" && !inspection.results.clean) {
      toast("先把污渍擦干净，再点确认清洁结果。");
      return;
    }
    if (ui.inspectMode === "magnifier" && !inspection.results.magnifier) {
      toast("先把需要核对的真实信息找齐。");
      return;
    }
    resetSheet();
    refresh();
    return;
  }
  if (toolId === "forge") {
    ui.forge = ui.forge || { materialId: null, targetId: null };
    ui.inspectMode = "forge";
    ui.inspectMessage = "";
    refresh();
    return;
  }
  if (!inspection.operations.includes(toolId)) {
    toast("这件物品不需要这个操作。");
    return;
  }
  if (inspection.results[toolId]) {
    toast(`${OPERATION_NAMES[toolId]}已经完成。`);
    return;
  }
  ui.inspectMode = toolId;
  ui.forge = null;
  ui.inspectMessage = "";
  ui.circuitDirtDone = false;
  refresh();
}

function finishCurrentOperation() {
  const item = currentItem();
  if (!item) {
    return;
  }
  const mode = ui.inspectMode;
  let result = { ok: false, text: "当前没有可以确认的操作。" };
  if (mode === "clean") {
    result = finishClean(item);
  } else if (mode === "magnifier") {
    result = finishMagnifier(item);
  }
  if (result.ok) {
    ui.inspectMode = null;
  }
  ui.inspectMessage = result.text;
  toast(result.text);
  refresh();
}

// 工作已经完成但玩家没有点确认时，在切换工具或关闭检视台前自动结算。
function settleCurrentOperation() {
  const item = currentItem();
  if (!item) {
    return;
  }
  const inspection = ensureInspection(item);
  let result = null;
  if (
    ui.inspectMode === "clean" &&
    !inspection.results.clean &&
    inspection.clean &&
    inspection.clean.patches.every((patch) => patch.progress >= 1)
  ) {
    result = finishClean(item);
  } else if (
    ui.inspectMode === "magnifier" &&
    !inspection.results.magnifier &&
    inspection.magnifier &&
    inspection.magnifier.spots.every((spot) => spot.found)
  ) {
    result = finishMagnifier(item);
  }
  if (result) {
    ui.inspectMessage = result.text;
    toast(result.text);
  }
}

function handleConfirmListing() {
  const item = currentItem();
  if (!item || !ui.draft) {
    return;
  }
  if (ui.draft.tags.length !== 2) {
    toast("请选择两个标签。");
    return;
  }
  if (item.forgery && !ui.draft.targetId) {
    toast("使用过伪造材料，请选择目标买家。");
    return;
  }
  if (item.forgery) {
    item.forgery.targetId = ui.draft.targetId;
  }
  const result = publishListing(state, ui.itemId, ui.draft);
  toast(result.text);
  if (result.ok) {
    tutorialEvent("listing");
    resetSheet();
  }
  refresh();
}

function handleCloseDay() {
  if (state.buyer) {
    showOverlay(`
      <div class="menu">
        <h1>还有买家在等待</h1>
        <p class="sub">现在结束本日，${state.buyer.name}可能取消交易。</p>
        <button class="menu-btn danger" data-menu="confirmClose">仍然结束本日</button>
        <button class="menu-btn" data-menu="cancel">继续经营</button>
      </div>
    `);
    return;
  }
  runCloseDay();
}

function runCloseDay() {
  hideOverlay();
  const report = endDay(state);

  const tutorial = ensureTutorial(state);
  // 买家没等到回复就取消了交易，同样走失败分支，避免教学卡在买家这一步。
  if (report.buyerCancelled) {
    buyerFailed("cancelled");
  }
  if (report.buyerArrived && state.buyer) {
    recordBuyer(state, state.buyer.profileId, "met");
  }
  if (report.accountClosed) {
    showOverlay(`
      <div class="menu">
        <h1>账户终止</h1>
        <p class="sub">连续 ${state.overdueCount} 次逾期未还款，黑匣信贷冻结了账户。</p>
        <button class="menu-btn" data-menu="new">重新开始</button>
      </div>
    `);
    return;
  }

  const lines = [
    `<li>今日收入 ¥${report.income}</li>`,
    `<li>上架成交收入 ¥${state.ledger.listing}</li>`,
    `<li>保管费 ¥${report.storage}</li>`,
    report.payout ? `<li>违禁品尾款到账 ¥${report.payout}</li>` : "",
    report.attentionRise ? `<li>尾款被冻结，关注度上升到 ${state.contrabandAttention}</li>` : "",
    `<li>${report.payment ? `本期还款 ¥${report.payment}` : "本期无需还款"}</li>`,
    `<li>${report.overdue ? "本期未能还清，逾期 +1" : `逾期次数 ${state.overdueCount}`}</li>`,
    `<li>当前债务 ¥${state.totalDebt}</li>`,
    report.buyerCancelled
      ? `<li>${report.buyerCancelled.name}没有等到回复，取消了交易</li>`
      : "",
    report.buyerArrived
      ? `<li>${report.buyerArrived.name}来到店里，正在等你回复</li>`
      : "",
    report.trendChanged ? `<li>市场趋势变为 ${report.trendChanged.name}</li>` : "<li>市场趋势未变</li>"
  ]
    .filter(Boolean)
    .join("");

  showOverlay(`
    <div class="settle">
      <h2>第 ${report.day} 天结束</h2>
      <ul class="facts">${lines}</ul>
      <button class="menu-btn" data-menu="nextDay">进入第 ${state.day} 天</button>
    </div>
  `);

  goto("auction");
}

stage.addEventListener("click", (event) => {
  if (ui.suppressClick) {
    ui.suppressClick = false;
    return;
  }
  const target = event.target.closest("[data-role]");
  if (!target) {
    return;
  }
  // 开始界面还没有存档状态，只放行开始和载入两个按键。
  if (!state && target.dataset.role !== "startNew" && target.dataset.role !== "startLoad") {
    return;
  }
  const layerElement = target.closest(".layer");
  // 关闭按钮永远可以点，避免弹层打开后卡死。
  if (
    layerElement &&
    target.dataset.role !== "closeSheet" &&
    !clickAllowed(layerElement)
  ) {
    toast("先完成当前这一步。");
    return;
  }
  ui.lastClickLayer = layerElement || null;
  // 加价按钮即使在余额不足时也要能点，点下去才会触发贷款分支。
  if (target.classList.contains("is-disabled") && target.dataset.role !== "bid") {
    return;
  }
  const handler = ROLE_HANDLERS[target.dataset.role];
  if (handler) {
    handler(target);
  }
});

mascotEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mascot]");
  if (button) {
    handleMascot(button.dataset.mascot);
  }
});

overlayEl.addEventListener("click", (event) => {
  const target = event.target.closest("[data-menu]");
  if (!target) {
    return;
  }
  const action = target.dataset.menu;
  if (action === "new") {
    if (hasCheckpoint()) {
      showOverlay(`
        <div class="menu">
          <h1>覆盖当前进度？</h1>
          <p class="sub">新游戏会清除已有的检查点。</p>
          <button class="menu-btn danger" data-menu="confirmNew">确认新游戏</button>
          <button class="menu-btn" data-menu="cancel">返回</button>
        </div>
      `);
      return;
    }
    startNewGame();
    return;
  }
  if (action === "confirmNew") {
    startNewGame();
    return;
  }
  if (action === "load") {
    continueGame();
    return;
  }
  if (action === "nextDay") {
    hideOverlay();
    toast(`第 ${state.day} 天开始，拍卖行已准备就绪。`);
    return;
  }
  if (action === "confirmClose") {
    runCloseDay();
    return;
  }
  if (action === "cancel") {
    hideOverlay();
  }
});

stage.addEventListener("input", (event) => {
  const input = event.target.closest('[data-role="priceRange"]');
  if (!input || !ui.draft) {
    return;
  }
  ui.draft.price = Number(input.value);
  const readout = input.parentElement.querySelector(".price-read");
  if (readout) {
    readout.textContent = `¥${ui.draft.price}`;
  }
  // 价格提示就地更新，避免整块重绘打断拖动。
  const slot = input.closest(".panel") && input.closest(".panel").querySelector('[data-role="quoteWarning"]');
  if (slot) {
    slot.innerHTML = quoteWarningHtml(ui.draft.price, Number(input.dataset.refMax) || 0);
  }
});

// ---------- 检视台的鼠标操作 ----------

// 屏幕坐标换算成画布内的像素坐标（画布本身是缩放过的）。
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const width = parseFloat(canvas.style.width) || rect.width;
  const scale = rect.width / width;
  return {
    x: (event.clientX - rect.left) / scale,
    y: (event.clientY - rect.top) / scale
  };
}

// 指针是否落在桌面上。
function overDesk(event) {
  const desk = canvas.querySelector('.scene.is-active .layer[data-name="桌面"]');
  if (!desk) {
    return false;
  }
  const rect = desk.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function stagePoint(event) {
  const element = canvas.querySelector(".scene.is-active [data-stage]");
  if (!element) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return null;
  }
  const scale = rect.width / element.clientWidth;
  return {
    element,
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
    lx: (event.clientX - rect.left) / scale,
    ly: (event.clientY - rect.top) / scale,
    size: element.clientWidth
  };
}

function moveLens(point) {
  const lens = canvas.querySelector(".scene.is-active [data-lens]");
  const inner = canvas.querySelector(".scene.is-active [data-lens-inner]");
  if (!lens || !inner) {
    return;
  }
  const size = Math.round(point.size * 0.42);
  const zoom = 2.2;
  lens.style.width = `${size}px`;
  lens.style.height = `${size}px`;
  lens.style.left = `${point.lx - size / 2}px`;
  lens.style.top = `${point.ly - size / 2}px`;
  inner.style.transform = `translate(${size / 2 - zoom * point.lx}px, ${
    size / 2 - zoom * point.ly
  }px) scale(${zoom})`;
}

function paintDirt(item) {
  const inspection = ensureInspection(item);
  if (!inspection.clean) {
    return;
  }
  inspection.clean.patches.forEach((patch) => {
    const element = canvas.querySelector(`.scene.is-active [data-dirt="${patch.id}"]`);
    if (element) {
      element.style.opacity = String(Math.max(0, 1 - patch.progress));
    }
  });
}

function paintCircuitDirt(item) {
  const inspection = ensureInspection(item);
  const element = canvas.querySelector(".scene.is-active [data-circuit-dirt]");
  if (!element || !inspection.circuit || !inspection.circuit.dirt) {
    return;
  }
  element.style.opacity = String(Math.max(0, 1 - inspection.circuit.dirt.progress));
}

function dropForge(item, point) {
  const materialId = ui.forge && ui.forge.materialId;
  if (!materialId) {
    return;
  }
  const target = canvas.querySelector(".scene.is-active [data-forge-target]");
  const stageElement = canvas.querySelector(".scene.is-active [data-stage]");
  let targetX = 0.5;
  let targetY = 0.45;
  if (target && stageElement) {
    const rect = target.getBoundingClientRect();
    const stageRect = stageElement.getBoundingClientRect();
    targetX = (rect.left + rect.width / 2 - stageRect.left) / stageRect.width;
    targetY = (rect.top + rect.height / 2 - stageRect.top) / stageRect.height;
  }
  const score = scoreForgeryDrop(point.x, point.y, targetX, targetY);
  const result = applyForgery(state, item.uid, materialId, ui.forge.targetId, score.quality);
  ui.inspectMessage = result.text;
  toast(result.text);
  if (result.ok) {
    ui.forge = null;
    ui.inspectMode = null;
  }
  refresh();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!state) {
    return;
  }
  // 把货架上层物品拖到桌面，就会打开检视台。
  const slot = event.target.closest('[data-role="item"]');
  if (slot && !ui.sheet && sceneName === "shop") {
    ui.drag = {
      kind: "shelfItem",
      itemId: slot.dataset.item,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: null
    };
    return;
  }
  if (!state || ui.sheet !== "inspect") {
    return;
  }
  const item = currentItem();
  const point = stagePoint(event);
  if (!item || !point) {
    return;
  }
  if (event.target.closest("[data-forge-piece]") && ui.forge) {
    ui.drag = { kind: "forge" };
    return;
  }
  const part = event.target.closest('[data-role="part"]');
  if (part) {
    ui.drag = { kind: "part", partId: part.dataset.part };
    return;
  }
  // 面板上的按钮交给点击事件处理，不要在这里抢走指针。
  if (event.target.closest("button")) {
    return;
  }
  if (ui.inspectMode === "clean" && ensureInspection(item).clean) {
    ui.drag = { kind: "clean", lastX: point.x, lastY: point.y };
    const result = rubClean(item, point.x, point.y, 0.07);
    paintDirt(item);
    if (result.changed && result.remaining === 0) {
      refresh();
    }
    return;
  }
  const circuit = ensureInspection(item).circuit;
  if (ui.inspectMode === "circuit" && circuit && circuit.dirt) {
    ui.drag = { kind: "circuitDirt" };
    rubCircuitDirt(item, point.x, point.y, 0.07);
    paintCircuitDirt(item);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (ui.drag && ui.drag.kind === "shelfItem") {
    const dx = event.clientX - ui.drag.startX;
    const dy = event.clientY - ui.drag.startY;
    if (!ui.drag.moved && Math.hypot(dx, dy) > 6) {
      ui.drag.moved = true;
      const item = state.inventory.find((entry) => entry.uid === ui.drag.itemId);
      const ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      ghost.textContent = item ? item.name : "物品";
      canvas.appendChild(ghost);
      ui.drag.ghost = ghost;
    }
    if (ui.drag.ghost) {
      const point = canvasPoint(event);
      ui.drag.ghost.style.left = `${point.x}px`;
      ui.drag.ghost.style.top = `${point.y}px`;
    }
    return;
  }
  if (!state || ui.sheet !== "inspect") {
    return;
  }
  const item = currentItem();
  const point = stagePoint(event);
  if (!item || !point) {
    return;
  }

  if (ui.drag && ui.drag.kind === "clean") {
    addStroke(item, Math.hypot(point.x - ui.drag.lastX, point.y - ui.drag.lastY));
    ui.drag.lastX = point.x;
    ui.drag.lastY = point.y;
    const result = rubClean(item, point.x, point.y, 0.07);
    paintDirt(item);
    if (result.changed && result.remaining === 0) {
      refresh();
    }
    return;
  }

  if (ui.drag && ui.drag.kind === "forge") {
    const piece = point.element.querySelector("[data-forge-piece]");
    if (piece) {
      piece.style.left = `${point.x * 100}%`;
      piece.style.top = `${point.y * 100}%`;
    }
    return;
  }

  if (ui.drag && ui.drag.kind === "circuitDirt") {
    const result = rubCircuitDirt(item, point.x, point.y, 0.07);
    paintCircuitDirt(item);
    if (result.done && !ui.circuitDirtDone) {
      ui.circuitDirtDone = true;
      refresh();
    }
    return;
  }

  if (ui.inspectMode === "magnifier" && ensureInspection(item).magnifier) {
    moveLens(point);
    const looked = lookThrough(item, point.x, point.y, 0.07);
    if (looked.found) {
      toast(`发现${looked.found.label}：${looked.found.value}`);
      refresh();
    }
  }
});

canvas.addEventListener("pointerup", (event) => {
  const drag = ui.drag;
  ui.drag = null;
  if (!drag) {
    return;
  }
  if (drag.kind === "shelfItem") {
    if (drag.ghost) {
      drag.ghost.remove();
    }
    if (!drag.moved) {
      return;
    }
    ui.suppressClick = true;
    if (overDesk(event)) {
      ui.itemId = drag.itemId;
      ui.inspectMode = null;
      ui.forge = null;
      ui.inspectMessage = "";
      ui.sheet = "inspect";
      // 拖拽也算一次针对上层物品格的操作。
      ui.lastClickLayer = canvas.querySelector(
        '.scene.is-active .layer[data-name="货架上层物品格"]'
      );
      refresh();
      tutorialEvent("inspect");
    }
    return;
  }
  const item = currentItem();
  if (!item) {
    return;
  }
  if (drag.kind === "part") {
    const point = stagePoint(event);
    if (!point) {
      return;
    }
    const result = seatPart(item, drag.partId, point.x, point.y);
    toast(result.text);
    refresh();
    return;
  }
  if (drag.kind === "circuitDirt") {
    return;
  }
  if (drag.kind === "forge") {
    const point = stagePoint(event);
    if (point) {
      dropForge(item, point);
    }
    return;
  }
  refresh();
});

window.addEventListener("resize", () => {
  fitStage(canvas, { width: window.innerWidth, height: window.innerHeight });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlayEl.hidden) {
    if (state) {
      hideOverlay();
    }
  }
});

// 买家到店检查：上架后等待一会就可能有买家上门，不需要等到第二天。
window.setInterval(() => {
  if (!state || state.buyer) {
    return;
  }
  const waiting = state.listings.some((entry) => entry.status === "waiting");
  if (!waiting) {
    return;
  }
  const buyer = arriveBuyer(state);
  if (buyer) {
    recordBuyer(state, buyer.profileId, "met");
    toast(`${buyer.name}来到店里，正在等你回复。`);
    refresh();
  }
}, 4000);

// 阻止浏览器原生的图片拖动和文字框选，这两种行为都会在拖动界面时留下蓝色痕迹。
["dragstart", "selectstart", "contextmenu"].forEach((type) => {
  stage.addEventListener(type, (event) => {
    event.preventDefault();
  });
});

fitStage(canvas, { width: window.innerWidth, height: window.innerHeight });
goto("start");

// 供调试使用
window.__lastBox = {
  get state() {
    return state;
  },
  get ui() {
    return ui;
  },
  get log() {
    return log;
  },
  get scene() {
    return sceneName;
  },
  get logical() {
    return LOGICAL;
  },
  saveCheckpoint: () => saveCheckpoint(state),
  ensureInspection: (item) => ensureInspection(item)
};
