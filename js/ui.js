import {
  CATEGORY_INFO,
  CONFIG,
  DESKTOP_APPS,
  STAGE_TWO_DATA
} from "./data.js?v=20260920-7";
import { Game, formatCurrency } from "./game.js?v=20260920-7";

let root;
let workspace;
let windowLayer;
let taskbarApps;
let startMenu;
let liveRegion;

const windowState = new Map();
let activeWindowId = null;
let highestZIndex = 20;
let newsSummaryVisible = false;
let newsMinimized = false;
let lastNewsId = null;
let dismissedBuyerId = null;
let newsExpanded = false;
let clockTimer = null;
let uiScreen = "MENU";
let isPaused = false;
let lastInteractionAt = Date.now();
let idleReminderArmed = true;

const GUIDE_STEPS = [
  {
    id: "MAIL",
    number: 1,
    title: "先查看贷款邮件",
    message: "关闭贷款邮件后，下一步会提示你查看日历。",
    target: "mail",
    action: "close-mail",
    buttonText: "关闭邮件"
  },
  {
    id: "CALENDAR",
    number: 2,
    title: "确认还款日期",
    message: "打开日历，确认第一次还款日、金额和剩余天数。",
    target: "calendar",
    buttonText: "打开日历"
  },
  {
    id: "NEWS",
    number: 3,
    title: "查看今日新闻",
    message: "点击右下角新闻中的“查看”，了解今天的市场情况。",
    target: null,
    action: "view-news",
    buttonText: "查看新闻"
  },
  {
    id: "AUCTION",
    number: 4,
    title: "参加线上拍卖",
    message: "打开线上拍卖，查看两条线索并决定是否参与竞拍。",
    target: "auction",
    buttonText: "打开线上拍卖"
  },
  {
    id: "SHOP",
    number: 5,
    title: "前往我的店铺",
    message: "打开我的店铺，查看库存中的物品并点开物品详情。",
    target: "shop",
    buttonText: "打开我的店铺"
  },
  {
    id: "SEARCH",
    number: 6,
    title: "用万物通搜索关键词",
    message: "点击物品详情中的黄色关键词，在万物通确认资料和价格线索。",
    target: "universal",
    buttonText: "打开万物通"
  },
  {
    id: "LIST",
    number: 7,
    title: "选择标签并上架",
    message: "返回我的店铺，选择两个标签、售价和上架日期后发布。",
    target: "shop",
    buttonText: "返回我的店铺"
  },
  {
    id: "FOLDER",
    number: 8,
    title: "查看收藏文件夹",
    message: "打开文件夹查看自留藏品和已经生效的属性。",
    target: "folder",
    buttonText: "打开文件夹"
  }
];

export function mountUI() {
  root = document.querySelector("#app");
  liveRegion = document.querySelector("#live-region");

  renderStartScreen();
  bindEvents();

  if (clockTimer) window.clearInterval(clockTimer);
  clockTimer = window.setInterval(() => {
    if (uiScreen !== "DESKTOP" || isPaused) return;
    const result = Game.tickTime(CONFIG.gameMinutesPerSecond);
    updateClock();
    updateTaskbar();
    syncDesktopState();
    updateIdleReminder();
    if (result.buyerArrived) refreshWindow("shop");
    if (result.forcedSleep) {
      closeAllWindows();
      announce("你太晚才睡，系统已强制结束今天。");
    }
  }, 1000);
}

function renderStartScreen() {
  uiScreen = "MENU";
  isPaused = false;
  windowState.clear();
  activeWindowId = null;
  root.innerHTML = `
    <section class="desktop menu-desktop">
      <div class="desktop-wallpaper" aria-hidden="true">
        <div class="wallpaper-horizon"></div>
        <div class="wallpaper-suitcase case-one"></div>
        <div class="wallpaper-suitcase case-two"></div>
        <div class="wallpaper-suitcase case-three"></div>
      </div>
      <section class="os-window menu-window">
        <header class="window-titlebar">
          <span class="window-title">
            <span class="pixel-icon pixel-icon-small">${renderAppIcon("auction")}</span>
            <span>再拍最后一箱！</span>
          </span>
        </header>
        <div class="menu-window-body">
          <div class="menu-logo">
            <span class="pixel-icon pixel-icon-large">${renderAppIcon("auction")}</span>
            <div>
              <p class="eyebrow">失物拍卖终端</p>
              <h1>再拍最后一箱！</h1>
            </div>
          </div>
          <p class="menu-copy">
            用贷款拍下无人认领的行李箱，搜索线索，与买家周旋，然后还清债务。
          </p>
          <div class="menu-actions">
            <button type="button" class="legacy-button primary" data-action="new-game">新游戏</button>
            <button
              type="button"
              class="legacy-button"
              data-action="load-game"
              ${Game.hasSavedGame() ? "" : "disabled"}
            >载入游戏</button>
          </div>
          <div class="menu-footer">
            <span>${CONFIG.brokerName}</span>
            <span>离线终端 3.1</span>
          </div>
        </div>
      </section>
      <div class="crt-overlay" aria-hidden="true"></div>
    </section>
  `;
}

function renderNicknameScreen() {
  uiScreen = "NICKNAME";
  isPaused = false;
  windowState.clear();
  root.innerHTML = `
    <section class="desktop menu-desktop">
      <div class="desktop-wallpaper" aria-hidden="true">
        <div class="wallpaper-horizon"></div>
        <div class="wallpaper-suitcase case-one"></div>
        <div class="wallpaper-suitcase case-two"></div>
        <div class="wallpaper-suitcase case-three"></div>
      </div>
      <section class="os-window nickname-window">
        <header class="window-titlebar">
          <span class="window-title">账户初始化</span>
        </header>
        <form class="nickname-body" id="nickname-form">
          <div class="boot-avatar" aria-hidden="true"></div>
          <h1>您希望我们如何称呼您呢</h1>
          <label for="nickname-input">系统登录名</label>
          <input id="nickname-input" name="nickname" maxlength="12" autocomplete="off" />
          <button type="submit" class="legacy-button primary">进入系统</button>
        </form>
      </section>
      <div class="crt-overlay" aria-hidden="true"></div>
    </section>
  `;
  const input = document.querySelector("#nickname-input");
  input?.focus();
  document.querySelector("#nickname-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    Game.confirmNickname(input?.value);
    enterDesktop();
  });
}

function enterDesktop() {
  uiScreen = "DESKTOP";
  isPaused = false;
  renderDesktop();
  refreshFromState();
  if (Game.getState().guideStep === "MAIL" && !windowState.has("mail")) {
    openApp("mail");
  }
}

function renderDesktop() {
  const state = Game.getState();
  const dockApps = DESKTOP_APPS.filter((app) => app.area === "dock");
  const desktopApps = DESKTOP_APPS.filter((app) => app.area === "desktop");
  const menuApps = DESKTOP_APPS.filter((app) => app.area !== "system");

  root.innerHTML = `
    <section class="desktop" id="desktop">
      <div class="desktop-wallpaper" aria-hidden="true">
        <div class="wallpaper-horizon"></div>
        <div class="wallpaper-suitcase case-one"></div>
        <div class="wallpaper-suitcase case-two"></div>
        <div class="wallpaper-suitcase case-three"></div>
        <div class="wallpaper-caption">失物拍卖终端</div>
      </div>

      <div class="desktop-icons" aria-label="桌面应用">
        ${desktopApps
          .map(
            (app) => `
              <button
                class="desktop-icon"
                type="button"
                data-open-app="${app.id}"
                data-tooltip="${escapeHtml(app.description)}"
                data-tooltip-position="right"
              >
                <span class="pixel-icon pixel-icon-large">${renderAppIcon(app.icon)}</span>
                <span>${escapeHtml(app.name)}</span>
                ${
                  app.id === "shop"
                    ? `<i class="app-badge icon-badge is-hidden" data-app-badge="shop" aria-label="有未读消息"></i>`
                    : ""
                }
              </button>
            `
          )
          .join("")}
      </div>

      <div class="desktop-workspace" id="desktop-workspace">
        <div class="window-layer" id="window-layer"></div>
      </div>

      <aside class="beginner-guide is-hidden" id="beginner-guide" aria-live="polite">
        <header>
          <span class="beginner-guide-step" id="beginner-guide-step">第 1 步</span>
          <strong id="beginner-guide-title">新手引导</strong>
          <button type="button" data-action="hide-guide" aria-label="暂时隐藏这一步">×</button>
        </header>
        <p id="beginner-guide-message"></p>
        <div class="beginner-guide-footer">
          <span id="beginner-guide-progress"></span>
          <span id="beginner-guide-action"></span>
        </div>
      </aside>

      <aside class="news-popup is-hidden" id="news-popup" aria-live="polite">
        <header>
          <strong>新闻通知</strong>
          <button
            type="button"
            class="news-close"
            data-action="dismiss-news"
            aria-label="关闭新闻通知"
            title="关闭"
          >×</button>
        </header>
        <div id="news-popup-content"></div>
      </aside>

      <button
        type="button"
        class="news-mini is-hidden"
        id="news-mini"
        data-action="restore-news"
      >
        新闻
      </button>

      <aside class="buyer-popup is-hidden" id="buyer-popup" aria-live="polite">
        <header>
          <strong>买家私信</strong>
          <button
            type="button"
            class="news-close"
            data-action="dismiss-buyer"
            aria-label="关闭买家通知"
            title="关闭"
          >×</button>
        </header>
        <div id="buyer-popup-content"></div>
      </aside>

      <aside class="idle-sleep-popup is-hidden" id="idle-sleep-popup" aria-live="polite">
        <strong>还没有新安排？</strong>
        <p>如果今天的事情已经处理完，可以点击右下角“休眠”结束这一天。</p>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="idle-sleep">立即休眠</button>
          <button type="button" class="legacy-button" data-action="dismiss-idle-sleep">继续查看</button>
        </div>
      </aside>

      <nav class="dock" aria-label="快速启动">
        ${dockApps
          .map(
            (app) => `
              <button
                class="dock-button"
                type="button"
                data-open-app="${app.id}"
                title="${escapeHtml(app.name)}"
                aria-label="打开${escapeHtml(app.name)}"
                data-tooltip="${escapeHtml(app.description)}"
                data-tooltip-position="top"
              >
                <span class="pixel-icon">${renderAppIcon(app.icon)}</span>
                <span>${escapeHtml(app.name)}</span>
              </button>
            `
          )
          .join("")}
      </nav>

      <footer class="taskbar">
        <button
          class="start-button"
          id="start-button"
          type="button"
          data-action="toggle-start"
          aria-expanded="false"
        >
          <span class="start-logo" aria-hidden="true"></span>
          <strong>开始</strong>
        </button>

        <div class="taskbar-apps" id="taskbar-apps" aria-label="已打开程序"></div>

        <div class="taskbar-status">
          <span class="status-pill" title="当前现金">
            <b>现金</b>
            <span id="taskbar-cash">${formatCurrency(state.cash)}</span>
          </span>
          <span
            class="status-pill trouble-${getTroubleTone(state.trouble)}"
            title="麻烦值"
            data-tooltip="麻烦值过高会引发调查或报复。"
            data-tooltip-position="top"
          >
            <b>麻烦</b>
            <span id="taskbar-trouble">${state.trouble} / ${CONFIG.maxTrouble}</span>
          </span>
          <span class="status-pill" title="信誉">
            <b>信誉</b>
            <span id="taskbar-reputation">${state.reputation}</span>
          </span>
          <span class="taskbar-clock">
            <span id="taskbar-day">第 ${state.day} 天</span>
            <strong id="taskbar-time">21:00</strong>
          </span>
          <button
            class="sleep-button"
            id="sleep-button"
            type="button"
            data-action="sleep"
            title="结束今天"
          >
            <span aria-hidden="true">◉</span>
            <b>休眠</b>
            <span class="sleep-tooltip" role="tooltip">
              结束当前一天并结算交易。
            </span>
          </button>
        </div>

        <div class="start-menu is-hidden" id="start-menu" role="menu" aria-label="开始菜单">
          <div class="start-menu-header">
            <span class="start-menu-avatar" aria-hidden="true"></span>
            <div>
              <strong>匿名买家</strong>
              <small>本地账户</small>
            </div>
          </div>
          <div class="start-menu-apps">
            ${menuApps
              .map(
                (app) => `
                  <button
                    type="button"
                    role="menuitem"
                    data-open-app="${app.id}"
                    data-tooltip="${escapeHtml(app.description)}"
                    data-tooltip-position="right"
                  >
                    <span class="pixel-icon">${renderAppIcon(app.icon)}</span>
                    <span>${escapeHtml(app.name)}</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="start-menu-footer">
            <span>系统版本 3.1</span>
            <button type="button" data-action="restart-game">重新开始</button>
          </div>
        </div>
      </footer>

      <div class="night-overlay" id="night-overlay" aria-hidden="true"></div>
      <div class="sleep-warning is-hidden" id="sleep-warning" role="alert">
        <strong>距离强制入睡还有 60 分钟</strong>
        <span>强制入睡可能增加麻烦值，或错过新闻和买家回复。</span>
      </div>
      <div class="crt-overlay" aria-hidden="true"></div>

      <div class="day-summary-overlay is-hidden" id="day-summary-overlay">
        <section class="day-summary-window">
          <header>
            <span>每日结算</span>
            <button type="button" data-action="close-summary" aria-label="关闭结算">×</button>
          </header>
          <div id="day-summary-content"></div>
        </section>
      </div>

      <div class="loan-payment-overlay is-hidden" id="loan-payment-overlay">
        <section class="loan-payment-window">
          <header>贷款还款提醒</header>
          <div id="loan-payment-content"></div>
        </section>
      </div>

      <aside class="loan-overdue-alert is-hidden" id="loan-overdue-alert">
        <strong>贷款已逾期</strong>
        <p id="loan-overdue-content"></p>
        <button type="button" class="legacy-button" data-action="open-calendar-from-payment">
          前往还款
        </button>
      </aside>

      <div class="loan-default-overlay is-hidden" id="loan-default-overlay">
        <section class="loan-default-window">
          <h1>贷款账户终止</h1>
          <p id="loan-default-reason">连续逾期导致账户被冻结。</p>
          <button type="button" class="legacy-button primary" data-action="pause-restart">
            重新开始
          </button>
        </section>
      </div>

      <div class="pause-overlay is-hidden" id="pause-overlay">
        <section class="pause-window">
          <h1>游戏已暂停</h1>
          <button type="button" class="legacy-button primary" data-action="resume-game">继续游戏</button>
          <button type="button" class="legacy-button" data-action="exit-menu">退出至菜单</button>
          <button type="button" class="legacy-button" data-action="pause-restart">重新开始</button>
        </section>
      </div>

      <div class="trouble-overlay is-hidden" id="trouble-overlay">
        <section class="trouble-window">
          <header>麻烦值提醒</header>
          <div id="trouble-overlay-content"></div>
        </section>
      </div>

      <div class="police-overlay is-hidden" id="police-overlay">
        <section class="police-window">
          <header>调查通知</header>
          <div id="police-overlay-content"></div>
        </section>
      </div>

      <div class="threat-overlay is-hidden" id="threat-overlay">
        <section class="threat-window">
          <header>匿名威胁</header>
          <div id="threat-overlay-content"></div>
        </section>
      </div>

      <div class="visitor-overlay is-hidden" id="visitor-overlay">
        <section class="visitor-window">
          <header>人物到访</header>
          <div id="visitor-overlay-content"></div>
        </section>
      </div>

      <div class="arrest-overlay is-hidden" id="arrest-overlay">
        <section class="arrest-window">
          <h1>账户已冻结</h1>
          <p>警方完成调查，游戏结束。</p>
          <button type="button" class="legacy-button primary" data-action="pause-restart">重新开始</button>
        </section>
      </div>

      <div class="trade-feedback-overlay is-hidden" id="trade-feedback-overlay">
        <section class="trade-feedback-window">
          <div id="trade-feedback-content"></div>
          <button type="button" class="legacy-button primary" data-action="close-trade-feedback">继续</button>
        </section>
      </div>
    </section>
  `;

  workspace = document.querySelector("#desktop-workspace");
  windowLayer = document.querySelector("#window-layer");
  taskbarApps = document.querySelector("#taskbar-apps");
  startMenu = document.querySelector("#start-menu");

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => clampOpenWindows()).observe(workspace);
  }
}

function bindEvents() {
  root.addEventListener("click", handleClick);
  root.addEventListener("change", handleInputChange);
  root.addEventListener("pointerdown", handleRootPointerDown, true);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", () => {
    clampOpenWindows();
    refreshFromState();
  });
}

function handleKeyDown(event) {
  markUserInteraction();
  if (event.key !== "Escape" || uiScreen !== "DESKTOP") return;
  event.preventDefault();
  togglePause();
}

function togglePause(force) {
  isPaused = typeof force === "boolean" ? force : !isPaused;
  document.querySelector("#pause-overlay")?.classList.toggle("is-hidden", !isPaused);
}

function handleInputChange(event) {
  const input = event.target.closest('[data-field="listing-price"]');
  if (!input) return;
  Game.setListingPrice(Number(input.value));
  refreshFromState();
}

function handleClick(event) {
  markUserInteraction();
  const actionButtonEarly = event.target.closest("[data-action]");
  const earlyAction = actionButtonEarly?.dataset.action;
  if (earlyAction === "new-game") {
    Game.startNewGame();
    renderNicknameScreen();
    return;
  }
  if (earlyAction === "load-game") {
    if (Game.restoreGame()) enterDesktop();
    else renderStartScreen();
    return;
  }
  if (earlyAction === "resume-game") {
    togglePause(false);
    return;
  }
  if (earlyAction === "exit-menu") {
    togglePause(false);
    renderStartScreen();
    return;
  }
  if (earlyAction === "pause-restart") {
    togglePause(false);
    Game.startNewGame();
    renderNicknameScreen();
    return;
  }

  const openButton = event.target.closest("[data-open-app]");
  if (openButton) {
    const appId = openButton.dataset.openApp;
    closeStartMenu();
    Game.onAppOpened(appId);
    openApp(appId);
    refreshFromState();
    return;
  }

  const taskbarButton = event.target.closest("[data-taskbar-app]");
  if (taskbarButton) {
    toggleTaskbarWindow(taskbarButton.dataset.taskbarApp);
    return;
  }

  const windowControl = event.target.closest("[data-window-action]");
  if (windowControl) {
    const { windowAction, windowId } = windowControl.dataset;
    if (windowAction === "close") closeWindow(windowId);
    if (windowAction === "minimize") minimizeWindow(windowId);
    if (windowAction === "maximize") toggleMaximizeWindow(windowId);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const {
    action,
    itemId,
    keyword,
    tag,
    day,
    replyId,
    outcome,
    productId,
    choice
  } = actionButton.dataset;

  if (action === "toggle-start") toggleStartMenu();
  if (action === "restart-game") {
    Game.startNewGame();
    newsSummaryVisible = false;
    newsMinimized = false;
    lastNewsId = null;
    newsExpanded = false;
    dismissedBuyerId = null;
    closeStartMenu();
    renderNicknameScreen();
    return;
  }
  if (action === "dismiss-news") {
    newsMinimized = true;
    newsExpanded = false;
    refreshFromState();
  }
  if (action === "dismiss-buyer") {
    dismissedBuyerId = Game.getState().buyerChat?.id ?? null;
    refreshFromState();
  }
  if (action === "view-buyer") {
    Game.markBuyerRead();
    openApp("shop");
    refreshFromState();
  }
  if (action === "view-news") {
    Game.viewNews();
    newsExpanded = true;
    newsSummaryVisible = true;
    newsMinimized = false;
    refreshFromState();
  }
  if (action === "take-loan") {
    Game.takeEmergencyLoan();
    refreshFromState();
  }
  if (action === "reduce-trouble") {
    Game.reduceTrouble();
    refreshFromState();
  }
  if (action === "close-trouble") {
    Game.acknowledgeTroublePopup();
    refreshFromState();
  }
  if (action === "police-lawyer") {
    Game.resolvePoliceAction("lawyer");
    refreshFromState();
  }
  if (action === "police-report") {
    Game.resolvePoliceAction("report");
    refreshFromState();
  }
  if (action === "police-ignore") {
    Game.resolvePoliceAction("ignore");
    refreshFromState();
  }
  if (action === "threat-return") {
    Game.resolveThreat("return");
    refreshFromState();
  }
  if (action === "threat-pay") {
    Game.resolveThreat("pay");
    refreshFromState();
  }
  if (action === "threat-ignore") {
    Game.resolveThreat("ignore");
    refreshFromState();
  }
  if (action === "report-special") {
    Game.reportSpecialItem(itemId);
    refreshFromState();
  }
  if (action === "close-trade-feedback") {
    Game.acknowledgeTradeFeedback();
    refreshFromState();
  }
  if (action === "open-calendar-from-trouble") {
    Game.acknowledgeTroublePopup();
    Game.onAppOpened("calendar");
    openApp("calendar");
    refreshFromState();
  }
  if (action === "open-calendar-from-payment") {
    Game.dismissPaymentNotice();
    Game.onAppOpened("calendar");
    openApp("calendar");
    refreshFromState();
  }
  if (action === "pay-loan") {
    if (!Game.payNextLoan()) {
      announce("当前现金不足，暂时无法偿还本期贷款。");
    }
    refreshFromState();
  }
  if (action === "dismiss-payment-notice") {
    Game.dismissPaymentNotice();
    refreshFromState();
  }
  if (action === "hide-guide") {
    Game.dismissCurrentGuideStep();
    refreshFromState();
  }
  if (action === "close-mail") {
    closeWindow("mail");
  }
  if (action === "dismiss-keyword-tip") {
    Game.dismissKeywordTip();
    refreshFromState();
  }
  if (action === "buy-mall-item") {
    if (!Game.buyMallItem(productId)) {
      announce("现金不足，或者该商品已经售罄。");
    }
    refreshFromState();
  }
  if (action === "toggle-draft-fake") {
    Game.toggleDraftFakeItem(productId);
    refreshFromState();
  }
  if (action === "visitor-choice") {
    Game.resolveVisitor(choice);
    refreshFromState();
  }
  if (action === "back-news") {
    newsExpanded = false;
    refreshFromState();
  }
  if (action === "restore-news") {
    newsMinimized = false;
    refreshFromState();
  }
  if (action === "bid") {
    Game.placeBid();
    refreshFromState();
  }
  if (action === "pass-auction") {
    Game.passAuction();
    refreshFromState();
  }
  if (action === "next-lot") {
    Game.nextAuctionLot();
    refreshFromState();
  }
  if (action === "auction-outcome") {
    Game.chooseAuctionOutcome(outcome);
    refreshFromState();
  }
  if (action === "onsite-sell") {
    Game.settleOnsite("sell");
    refreshFromState();
  }
  if (action === "onsite-carry") {
    Game.settleOnsite("carry");
    refreshFromState();
  }
  if (action === "back-auction-outcome") {
    const auction = Game.getState().auction;
    auction.status = "won";
    auction.result = null;
    refreshFromState();
  }
  if (action === "view-item") {
    const selectedId = Game.viewInventoryEntry(itemId);
    if (selectedId) openApp("item-detail");
    refreshFromState();
  }
  if (action === "view-listing-item") {
    Game.viewListingItem(itemId);
    openApp("item-detail");
    refreshFromState();
  }
  if (action === "search-keyword") {
    const state = Game.getState();
    const listing = state.listings.find(
      (candidate) =>
        candidate.id === state.selectedListingId &&
        candidate.itemSnapshot?.id === itemId
    );
    if (listing) {
      Game.searchListingItem(listing.id, keyword);
    } else {
      Game.searchKeyword(itemId, keyword);
    }
    openApp("universal");
    refreshFromState();
  }
  if (action === "search-onsite-keyword") {
    Game.searchAuctionItem(itemId, keyword);
    openApp("universal");
    refreshFromState();
  }
  if (action === "shop-tab") {
    Game.getState().activeShopTab = actionButton.dataset.tab;
    if (actionButton.dataset.tab === "buyers") Game.markBuyerRead();
    refreshFromState();
  }
  if (action === "universal-tab") {
    Game.getState().universalTab = actionButton.dataset.tab;
    refreshFromState();
  }
  if (action === "keep-item") {
    Game.keepItem(itemId);
    refreshFromState();
  }
  if (action === "prepare-listing") {
    Game.prepareListing(itemId);
    refreshFromState();
  }
  if (action === "back-inventory") {
    Game.getState().listingDraft = null;
    refreshFromState();
  }
  if (action === "back-shop") {
    closeWindow("item-detail");
    openApp("shop");
  }
  if (action === "toggle-tag") {
    Game.toggleListingTag(tag);
    refreshFromState();
  }
  if (action === "listing-day") {
    Game.setListingDay(Number(day));
    refreshFromState();
  }
  if (action === "publish-listing") {
    Game.publishListing();
    refreshFromState();
  }
  if (action === "reply-buyer") {
    Game.replyToBuyer(replyId);
    refreshFromState();
  }
  if (action === "back-listings") {
    Game.getState().activeShopTab = "listings";
    refreshFromState();
  }
  if (action === "sleep") {
    performSleep();
  }
  if (action === "idle-sleep") {
    hideIdleReminder();
    performSleep();
  }
  if (action === "dismiss-idle-sleep") {
    hideIdleReminder();
    idleReminderArmed = false;
  }
  if (action === "close-summary") {
    Game.acknowledgeSummary();
    refreshFromState();
  }
}

function handleRootPointerDown(event) {
  markUserInteraction();
  const windowElement = event.target.closest(".os-window");
  if (windowElement) focusWindow(windowElement.dataset.windowId);
}

function markUserInteraction() {
  lastInteractionAt = Date.now();
  idleReminderArmed = true;
  hideIdleReminder();
}

function getGuideAnchor(guide) {
  if (!guide) return null;
  if (guide.id === "NEWS") {
    return document.querySelector("#news-popup:not(.is-hidden)");
  }
  if (guide.id === "MAIL") {
    const closeButton = document.querySelector(
      '.os-window[data-window-id="mail"] [data-window-action="close"]'
    );
    if (closeButton) return closeButton;
  }
  if (guide.id === "CALENDAR") {
    return document.querySelector(
      '.dock-button[data-open-app="calendar"]'
    );
  }
  if (guide.target) {
    return (
      document.querySelector(
        `.desktop-icon[data-open-app="${guide.target}"]`
      ) ??
      document.querySelector(
        `.dock-button[data-open-app="${guide.target}"]`
      )
    );
  }
  return null;
}

function positionGuidePopup(popup, guide) {
  const anchor = getGuideAnchor(guide);
  const rootRect = root.getBoundingClientRect();
  const taskbarTop =
    document.querySelector(".taskbar")?.getBoundingClientRect().top ??
    rootRect.bottom;
  const margin = 12;
  const gap = 12;
  const width = popup.offsetWidth || 340;
  const height = popup.offsetHeight || 130;
  let left = margin;
  let top = margin;
  let placement = "right";

  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    if (guide.id === "MAIL") {
      placement = "top";
      left = rect.left - rootRect.left - width - gap;
      top = rect.bottom - rootRect.top + gap;
    } else if (
      guide.id === "NEWS" ||
      rect.left - rootRect.left > rootRect.width / 2
    ) {
      placement = "right";
      left = rect.left - rootRect.left - width - gap;
      top = rect.top - rootRect.top;
    } else if (
      anchor.closest(".dock") ||
      rect.top - rootRect.top > rootRect.height * 0.62
    ) {
      placement = "bottom";
      left = rect.left - rootRect.left;
      top = rect.top - rootRect.top - height - gap;
    } else {
      placement = "left";
      left = rect.right - rootRect.left + gap;
      top = rect.top - rootRect.top;
    }
  }

  const maxLeft = Math.max(margin, rootRect.width - width - margin);
  const maxTop = Math.max(
    margin,
    taskbarTop - rootRect.top - height - margin
  );
  popup.dataset.placement = placement;
  popup.style.left = `${clamp(left, margin, maxLeft)}px`;
  popup.style.top = `${clamp(top, margin, maxTop)}px`;
}

function updateIdleReminder() {
  const popup = document.querySelector("#idle-sleep-popup");
  if (!popup || uiScreen !== "DESKTOP" || isPaused) return;
  if (!idleReminderArmed || windowState.size > 0) return;
  if (hasBlockingOverlay()) {
    lastInteractionAt = Date.now();
    return;
  }
  if (
    Date.now() - lastInteractionAt <
    CONFIG.idleReminderSeconds * 1000
  ) {
    return;
  }
  popup.classList.remove("is-hidden");
  idleReminderArmed = false;
}

function hideIdleReminder() {
  document.querySelector("#idle-sleep-popup")?.classList.add("is-hidden");
}

function hasBlockingOverlay() {
  return [
    "#day-summary-overlay",
    "#loan-payment-overlay",
    "#loan-default-overlay",
    "#pause-overlay",
    "#trouble-overlay",
    "#police-overlay",
    "#threat-overlay",
    "#visitor-overlay",
    "#arrest-overlay",
    "#trade-feedback-overlay"
  ].some((selector) => {
    const overlay = document.querySelector(selector);
    return overlay && !overlay.classList.contains("is-hidden");
  });
}

function performSleep() {
  Game.sleep();
  newsSummaryVisible = false;
  newsMinimized = false;
  lastNewsId = null;
  newsExpanded = false;
  closeAllWindows();
  refreshFromState();
}

function handleDocumentPointerDown(event) {
  if (!startMenu || startMenu.classList.contains("is-hidden")) return;
  if (event.target.closest("#start-menu") || event.target.closest("#start-button")) {
    return;
  }
  closeStartMenu();
}

function openApp(appId) {
  const app = DESKTOP_APPS.find((candidate) => candidate.id === appId);
  if (!app) return;

  let entry = windowState.get(appId);
  if (entry) {
    if (entry.minimized) restoreWindow(appId);
    focusWindow(appId);
    refreshWindow(appId);
    return;
  }

  const windowElement = createWindowElement(app);
  const position = getNextWindowPosition(app);

  Object.assign(windowElement.style, {
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    zIndex: String(++highestZIndex)
  });

  windowLayer.append(windowElement);
  entry = {
    app,
    element: windowElement,
    minimized: false,
    maximized: false
  };
  windowState.set(appId, entry);
  activeWindowId = appId;
  updateTaskbar();
  announce(`${app.name}已打开。`);
}

function createWindowElement(app) {
  const section = document.createElement("section");
  section.className = "os-window";
  section.dataset.windowId = app.id;
  section.setAttribute("role", "dialog");
  section.setAttribute("aria-label", `${app.windowTitle}窗口`);
  section.innerHTML = `
    <header class="window-titlebar">
      <span class="window-title">
        <span class="pixel-icon pixel-icon-small">${renderAppIcon(app.icon)}</span>
        <span data-window-title>${escapeHtml(getWindowTitle(app.id))}</span>
      </span>
      <span class="window-controls">
        <button type="button" class="window-control" data-window-action="minimize" data-window-id="${app.id}" aria-label="最小化${escapeHtml(app.name)}" title="最小化">_</button>
        <button type="button" class="window-control" data-window-action="maximize" data-window-id="${app.id}" aria-label="最大化${escapeHtml(app.name)}" title="最大化">□</button>
        <button type="button" class="window-control window-close" data-window-action="close" data-window-id="${app.id}" aria-label="关闭${escapeHtml(app.name)}" title="关闭">×</button>
      </span>
    </header>
    <div class="window-body">${renderAppContent(app.id)}</div>
    <div class="window-statusbar">
      <span>${escapeHtml(app.description)}</span>
      <span>就绪</span>
    </div>
  `;

  section.addEventListener("pointerdown", () => focusWindow(app.id));
  section.querySelector(".window-titlebar").addEventListener("pointerdown", (event) => {
    beginWindowDrag(event, app.id);
  });
  return section;
}

function beginWindowDrag(event, appId) {
  if (event.button !== 0 || event.target.closest("button")) return;
  const entry = windowState.get(appId);
  if (!entry || entry.maximized) return;

  const windowElement = entry.element;
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = windowElement.offsetLeft;
  const startTop = windowElement.offsetTop;

  function move(moveEvent) {
    const maxLeft = Math.max(0, workspace.clientWidth - windowElement.offsetWidth);
    const maxTop = Math.max(0, workspace.clientHeight - Math.min(windowElement.offsetHeight, workspace.clientHeight));
    windowElement.style.left = `${clamp(startLeft + moveEvent.clientX - startX, 0, maxLeft)}px`;
    windowElement.style.top = `${clamp(startTop + moveEvent.clientY - startY, 0, maxTop)}px`;
  }

  function stop() {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  }

  focusWindow(appId);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function closeWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  Game.onWindowClosed(appId);
  entry.element.remove();
  windowState.delete(appId);
  if (windowState.size === 0) {
    lastInteractionAt = Date.now();
    idleReminderArmed = true;
  }
  if (activeWindowId === appId) {
    activeWindowId = [...windowState.values()]
      .filter((candidate) => !candidate.minimized)
      .sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0]?.app.id ?? null;
  }
  refreshFromState();
  announce(`${entry.app.name}已关闭。`);
}

function closeAllWindows() {
  windowState.forEach((entry) => entry.element.remove());
  windowState.clear();
  activeWindowId = null;
  lastInteractionAt = Date.now();
  idleReminderArmed = true;
  hideIdleReminder();
  refreshFromState();
}

function minimizeWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  entry.minimized = true;
  entry.element.classList.add("is-minimized");
  if (activeWindowId === appId) activeWindowId = null;
  updateTaskbar();
}

function restoreWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  entry.minimized = false;
  entry.element.classList.remove("is-minimized");
  focusWindow(appId);
}

function toggleMaximizeWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  entry.maximized = !entry.maximized;
  entry.element.classList.toggle("is-maximized", entry.maximized);
  entry.element.querySelector('[data-window-action="maximize"]').textContent =
    entry.maximized ? "❐" : "□";
  focusWindow(appId);
}

function focusWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry || entry.minimized) return;
  activeWindowId = appId;
  entry.element.style.zIndex = String(++highestZIndex);
  updateTaskbar();
}

function toggleTaskbarWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  if (entry.minimized) {
    restoreWindow(appId);
  } else if (activeWindowId === appId) {
    minimizeWindow(appId);
  } else {
    focusWindow(appId);
  }
}

function toggleStartMenu() {
  const nextHidden = !startMenu.classList.contains("is-hidden");
  startMenu.classList.toggle("is-hidden", nextHidden);
  document.querySelector("#start-button").setAttribute("aria-expanded", String(!nextHidden));
}

function closeStartMenu() {
  startMenu?.classList.add("is-hidden");
  document.querySelector("#start-button")?.setAttribute("aria-expanded", "false");
}

function refreshFromState() {
  updateTaskbar();
  updateClock();
  syncDesktopState();

  windowState.forEach((entry) => refreshWindow(entry.app.id));
}

function refreshWindow(appId) {
  const entry = windowState.get(appId);
  if (!entry) return;
  entry.element.querySelector(".window-body").innerHTML = renderAppContent(appId);
  const title = entry.element.querySelector("[data-window-title]");
  if (title) title.textContent = getWindowTitle(appId);
}

function updateTaskbar() {
  if (!taskbarApps) return;
  const state = Game.getState();
  const entries = [...windowState.values()];

  taskbarApps.innerHTML = entries
    .map(
      (entry) => `
        <button
          type="button"
          class="taskbar-app ${activeWindowId === entry.app.id ? "is-active" : ""} ${
            entry.minimized ? "is-minimized" : ""
          }"
          data-taskbar-app="${entry.app.id}"
          title="${escapeHtml(entry.app.name)}"
        >
          <span class="pixel-icon pixel-icon-small">${renderAppIcon(entry.app.icon)}</span>
          <span>${escapeHtml(entry.app.name)}</span>
          ${
            entry.app.id === "shop" && state.buyerChat?.unread
              ? `<i class="app-badge" aria-label="有未读消息"></i>`
              : ""
          }
        </button>
      `
    )
    .join("");

  const cashNode = document.querySelector("#taskbar-cash");
  const troubleNode = document.querySelector("#taskbar-trouble");
  const reputationNode = document.querySelector("#taskbar-reputation");
  if (cashNode) cashNode.textContent = formatCurrency(state.cash);
  if (troubleNode) {
    troubleNode.textContent = `${state.trouble} / ${CONFIG.maxTrouble}`;
    troubleNode.closest(".status-pill")?.classList.remove(
      "trouble-safe",
      "trouble-warn",
      "trouble-danger"
    );
    troubleNode.closest(".status-pill")?.classList.add(
      `trouble-${getTroubleTone(state.trouble)}`
    );
  }
  if (reputationNode) reputationNode.textContent = String(state.reputation);
}

function syncDesktopState() {
  const state = Game.getState();
  const guideTarget = Game.getGuideTarget();
  const newsPopup = document.querySelector("#news-popup");
  const newsContent = document.querySelector("#news-popup-content");
  const newsMini = document.querySelector("#news-mini");
  const buyerPopup = document.querySelector("#buyer-popup");
  const buyerPopupContent = document.querySelector("#buyer-popup-content");
  const nightOverlay = document.querySelector("#night-overlay");
  const sleepWarning = document.querySelector("#sleep-warning");
  const sleepButton = document.querySelector("#sleep-button");
  const summaryOverlay = document.querySelector("#day-summary-overlay");
  const summaryContent = document.querySelector("#day-summary-content");
  const loanPaymentOverlay = document.querySelector("#loan-payment-overlay");
  const loanPaymentContent = document.querySelector("#loan-payment-content");
  const loanOverdueAlert = document.querySelector("#loan-overdue-alert");
  const loanOverdueContent = document.querySelector("#loan-overdue-content");
  const loanDefaultOverlay = document.querySelector("#loan-default-overlay");
  const loanDefaultReason = document.querySelector("#loan-default-reason");
  const troubleOverlay = document.querySelector("#trouble-overlay");
  const troubleContent = document.querySelector("#trouble-overlay-content");
  const policeOverlay = document.querySelector("#police-overlay");
  const policeContent = document.querySelector("#police-overlay-content");
  const threatOverlay = document.querySelector("#threat-overlay");
  const threatContent = document.querySelector("#threat-overlay-content");
  const visitorOverlay = document.querySelector("#visitor-overlay");
  const visitorContent = document.querySelector("#visitor-overlay-content");
  const arrestOverlay = document.querySelector("#arrest-overlay");
  const tradeOverlay = document.querySelector("#trade-feedback-overlay");
  const tradeContent = document.querySelector("#trade-feedback-content");
  const guidePopup = document.querySelector("#beginner-guide");
  const guideStep = document.querySelector("#beginner-guide-step");
  const guideTitle = document.querySelector("#beginner-guide-title");
  const guideMessage = document.querySelector("#beginner-guide-message");
  const guideProgress = document.querySelector("#beginner-guide-progress");
  const guideAction = document.querySelector("#beginner-guide-action");

  root.querySelectorAll('[data-app-badge="shop"]').forEach((badge) => {
    badge.classList.toggle("is-hidden", !state.buyerChat?.unread);
  });

  root.querySelectorAll("[data-open-app]").forEach((button) => {
    button.classList.toggle(
      "is-guided",
      state.guideStep !== "DONE" &&
        button.dataset.openApp === guideTarget &&
        !button.closest("#start-menu")
    );
  });

  if (
    guidePopup &&
    guideStep &&
    guideTitle &&
    guideMessage &&
    guideProgress &&
    guideAction
  ) {
    const currentGuide = GUIDE_STEPS.find(
      (entry) => entry.id === state.guideStep
    );
    const shouldShow =
      Boolean(currentGuide) &&
      !(state.guidePopupDismissedSteps ?? []).includes(state.guideStep);
    guidePopup.classList.toggle("is-hidden", !shouldShow);
    if (currentGuide && shouldShow) {
      guideStep.textContent = `第 ${currentGuide.number} 步`;
      guideTitle.textContent = currentGuide.title;
      guideMessage.textContent =
        Game.getGuideMessage() || currentGuide.message;
      guideProgress.textContent = `${currentGuide.number} / ${GUIDE_STEPS.length}`;
      guideAction.innerHTML = currentGuide.action
        ? `<button type="button" class="legacy-button primary" data-action="${currentGuide.action}">${escapeHtml(
            currentGuide.buttonText
          )}</button>`
        : `<button type="button" class="legacy-button primary" data-open-app="${currentGuide.target}">${escapeHtml(
            currentGuide.buttonText
          )}</button>`;
      positionGuidePopup(guidePopup, currentGuide);
      guidePopup.classList.add("is-positioned");
    }
  }

  if (newsPopup && newsContent) {
    const news = state.news[0];
    if (news?.id !== lastNewsId) {
      lastNewsId = news?.id ?? null;
      newsExpanded = false;
      newsMinimized = false;
      newsSummaryVisible = false;
    }
    if (state.newsVisible && !state.newsRead) {
      newsSummaryVisible = true;
    }
    const shouldShow = newsSummaryVisible && !newsMinimized;
    newsPopup.classList.toggle("is-hidden", !shouldShow);
    newsPopup.classList.toggle(
      "has-buyer-notice",
      Boolean(state.buyerChat?.unread && !state.buyerChat?.replied)
    );
    if (shouldShow) {
      newsPopup.classList.toggle("is-expanded", newsExpanded);
      newsContent.innerHTML = newsExpanded
        ? `
          <strong class="key-info">${escapeHtml(news.title)}</strong>
          <p>${escapeHtml(news.detail ?? news.effect).replace(
            "平台提醒：",
            '<span class="key-alert">平台提醒：</span>'
          )}</p>
          <small>${escapeHtml(news.duration)}</small>
          <button type="button" class="legacy-button" data-action="back-news">返回</button>
        `
        : `
          <strong>${escapeHtml(news.title)}</strong>
          <p>${escapeHtml(news.effect)}</p>
          <small>${escapeHtml(news.duration)}</small>
          <button type="button" class="legacy-button primary" data-action="view-news">查看</button>
        `;
    }
    if (newsMini) {
      newsMini.classList.toggle(
        "is-hidden",
        !(newsSummaryVisible && newsMinimized)
      );
    }
  }

  if (buyerPopup && buyerPopupContent) {
    const chat = state.buyerChat;
    const shouldShow =
      Boolean(chat?.unread && !chat.replied) && dismissedBuyerId !== chat?.id;
    buyerPopup.classList.toggle("is-hidden", !shouldShow);
    if (shouldShow) {
      const buyerListing = state.listings.find(
        (listing) => listing.id === chat.listingId
      );
      buyerPopupContent.innerHTML = `
        <strong>${escapeHtml(chat.buyer?.name ?? "匿名买家")}</strong>
        <p>${escapeHtml(
          chat.buyer?.opening ?? "我看到了你上架的物品，想确认几个细节。"
        )}</p>
        <small>正在咨询：${escapeHtml(
          buyerListing?.itemSnapshot?.name ??
            buyerListing?.title ??
            "已下架商品"
        )}</small>
        <button type="button" class="legacy-button primary" data-action="view-buyer">查看</button>
      `;
    }
  }

  if (nightOverlay) {
    nightOverlay.style.opacity = String(Game.getDarknessLevel());
    nightOverlay.classList.toggle("is-active", Game.getDarknessLevel() > 0);
  }

  if (sleepWarning) {
    const shouldWarn = state.timeMinutes >= 24 * 60 && state.guideStep !== "DONE";
    sleepWarning.classList.toggle("is-hidden", !shouldWarn);
    if (shouldWarn) {
      const remaining = Math.max(
        0,
        Math.ceil(60 - (state.timeMinutes - 24 * 60))
      );
      const title = sleepWarning.querySelector("strong");
      if (title) title.textContent = `距离强制入睡还有 ${remaining} 分钟`;
    }
  }

  if (sleepButton) {
    sleepButton.classList.remove("is-hidden");
    sleepButton.classList.toggle("is-urgent", state.timeMinutes >= 24 * 60);
    sleepButton.disabled = Boolean(state.loanDefaulted || state.arrested);
  }

  if (summaryOverlay && summaryContent) {
    const summary = state.lastNightSummary;
    const shouldShow = Boolean(state.summaryOpen && summary);
    summaryOverlay.classList.toggle("is-hidden", !shouldShow);
    if (shouldShow) {
      summaryContent.innerHTML = `
        <div class="summary-heading">
          <span>第 ${summary.day} 天结束</span>
          <strong>${
            summary.loanOverdue
              ? `贷款已逾期 ${summary.overdueCount} 次`
              : `距离还款日还有 ${summary.daysUntilDue} 天`
          }</strong>
        </div>
        <div class="summary-finance">
          <div><span>收入</span><strong class="key-income">+${formatCurrency(
            summary.earned
          )}</strong></div>
          <div><span>支出</span><strong class="key-expense">-${formatCurrency(
            summary.spent
          )}</strong></div>
          <div><span>当前现金</span><strong class="key-cash">${formatCurrency(
            summary.cash
          )}</strong></div>
        </div>
        ${
          summary.loanMessage
            ? `<div class="summary-loan ${summary.loanOverdue ? "is-overdue" : ""}">
                <strong>贷款结算</strong>
                <span>${escapeHtml(summary.loanMessage)}</span>
              </div>`
            : ""
        }
        ${
          summary.visitorMessage
            ? `<div class="summary-visitor">
                <strong>人物到访</strong>
                <span>${escapeHtml(summary.visitorMessage)}</span>
              </div>`
            : ""
        }
        <div class="summary-activities">
          <strong>今日活动</strong>
          ${
            summary.activities.length
              ? summary.activities
                  .map(
                    (entry) => `
                      <div class="summary-activity">
                        <span>${escapeHtml(entry.label)}</span>
                        <strong class="${
                          entry.amount >= 0 ? "key-income" : "key-expense"
                        }">${
                          entry.amount > 0 ? "+" : ""
                        }${
                          entry.amount
                            ? `${entry.amount < 0 ? "-" : ""}${formatCurrency(
                                Math.abs(entry.amount)
                              )}`
                            : "--"
                        }</strong>
                      </div>
                    `
                  )
                  .join("")
              : `<p>今天没有产生交易。</p>`
          }
        </div>
        <button type="button" class="legacy-button primary" data-action="close-summary">
          进入第 ${state.day} 天
        </button>
      `;
    }
  }

  if (loanPaymentOverlay && loanPaymentContent) {
    const payment = state.nextPayment;
    const shouldShow = Boolean(
      state.paymentNoticeOpen &&
        !payment?.overdue &&
        !state.loanDefaulted &&
        state.day >= payment.dueDay
    );
    loanPaymentOverlay.classList.toggle("is-hidden", !shouldShow);
    if (shouldShow) {
      loanPaymentContent.innerHTML = `
        <p>今天是第 <b class="key-info">${payment.dueDay}</b> 天，本期贷款已经到期。</p>
        <div class="loan-payment-amount">
          <span>本期应还</span>
          <strong class="key-expense">${formatCurrency(payment.amount)}</strong>
        </div>
        <p>当前现金：<b class="key-cash">${formatCurrency(state.cash)}</b></p>
        <p class="key-alert">资金不足时，逾期会持续提醒；第三次逾期将直接终止账户。</p>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="open-calendar-from-payment">
            前往日历还款
          </button>
          <button type="button" class="legacy-button" data-action="dismiss-payment-notice">
            稍后处理
          </button>
        </div>
      `;
    }
  }

  if (loanOverdueAlert && loanOverdueContent) {
    const shouldShow = Boolean(
      state.nextPayment?.overdue && !state.loanDefaulted
    );
    loanOverdueAlert.classList.toggle("is-hidden", !shouldShow);
    if (shouldShow) {
      loanOverdueContent.innerHTML = `本期应还 <b>${formatCurrency(
        state.nextPayment.amount
      )}</b>，已经逾期 <b>${state.overdueCount}</b> 次。`;
    }
  }

  if (loanDefaultOverlay && loanDefaultReason) {
    loanDefaultOverlay.classList.toggle(
      "is-hidden",
      !state.loanDefaulted
    );
    if (state.loanDefaulted) {
      loanDefaultReason.textContent =
        state.loanDefaultReason ||
        "连续三次逾期未还，贷款账户已经终止。";
    }
  }

  if (troubleOverlay && troubleContent) {
    const shouldShowTrouble =
      Boolean(state.troublePopupOpen) && !state.loanDefaulted;
    troubleOverlay.classList.toggle("is-hidden", !shouldShowTrouble);
    if (shouldShowTrouble) {
      const reasons = unique(
        state.troubleReasons.map((entry) => entry.label)
      ).slice(0, 4);
      troubleContent.innerHTML = `
        <p>当前麻烦值：<strong class="key-alert">${state.trouble} / ${
          CONFIG.maxTrouble
        }</strong></p>
        <div class="trouble-reasons">
          <strong>麻烦值增加原因</strong>
          ${
            reasons.length
              ? reasons
                  .map((reason) => `<span>${escapeHtml(reason)}</span>`)
                  .join("")
              : `<span>近期的高风险交易</span>`
          }
        </div>
        <p>可以在日历中支付 <b class="key-expense">${formatCurrency(
          Game.getTroubleHandlingCost()
        )}</b> 处理 1 点麻烦值，每天最多一次。</p>
        <p class="key-alert">麻烦值达到 10 会直接结束游戏。</p>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="open-calendar-from-trouble">前往日历</button>
          <button type="button" class="legacy-button" data-action="close-trouble">稍后处理</button>
        </div>
      `;
    }
  }

  if (policeOverlay && policeContent) {
    const policeCase = state.policeCase;
    const shouldShow = Boolean(
      policeCase?.open && policeCase.stage < 3 && !state.loanDefaulted
    );
    policeOverlay.classList.toggle("is-hidden", !shouldShow);
    if (shouldShow) {
      policeContent.innerHTML = `
        <p>当前阶段：<strong class="key-alert">${
          policeCase.stage === 1 ? "调查警告" : "查扣与罚款"
        }</strong></p>
        <p>${
          policeCase.stage === 1
            ? "警方正在调查来源不明物品。你可以联系律师、主动上报风险物品，或暂时忽略。"
            : "警方已经执行查扣。继续忽略将在下一次结算时冻结账户。"
        }</p>
        <p>处理期限：第 <b class="key-info">${policeCase.deadlineDay}</b> 天</p>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="police-lawyer">联系律师</button>
          ${
            policeCase.stage === 1
              ? `<button type="button" class="legacy-button" data-action="police-report">主动上报</button>`
              : ""
          }
          <button type="button" class="legacy-button" data-action="police-ignore">暂时忽略</button>
        </div>
      `;
    }
  }

  if (threatOverlay && threatContent) {
    const threat = state.threatEvent;
    const shouldShowThreat = Boolean(threat) && !state.loanDefaulted;
    threatOverlay.classList.toggle("is-hidden", !shouldShowThreat);
    if (shouldShowThreat) {
      threatContent.innerHTML = `
        <p>${escapeHtml(threat.message)}</p>
        <p>对方要求：<b class="key-expense">${formatCurrency(
          threat.amount
        )}</b> 或交出最值钱的物品。</p>
        <div class="action-row">
          <button type="button" class="legacy-button" data-action="threat-return">交出物品</button>
          <button type="button" class="legacy-button primary" data-action="threat-pay">支付封口费</button>
          <button type="button" class="legacy-button" data-action="threat-ignore">无视威胁</button>
        </div>
      `;
    }
  }

  if (visitorOverlay && visitorContent) {
    const visitor = state.activeVisitor;
    const shouldShowVisitor = Boolean(visitor) && !state.loanDefaulted;
    visitorOverlay.classList.toggle("is-hidden", !shouldShowVisitor);
    if (shouldShowVisitor) {
      visitorContent.innerHTML = `
        <h2>${escapeHtml(visitor.name)}</h2>
        <p>${escapeHtml(visitor.message)}</p>
        <p>到访日期：<b class="key-info">第 ${visitor.arriveDay} 天</b></p>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="visitor-choice" data-choice="accept">
            ${escapeHtml(visitor.acceptLabel)}
          </button>
          <button type="button" class="legacy-button" data-action="visitor-choice" data-choice="decline">
            ${escapeHtml(visitor.declineLabel)}
          </button>
        </div>
      `;
    }
  }

  if (arrestOverlay) {
    arrestOverlay.classList.toggle("is-hidden", !state.arrested);
  }

  if (tradeOverlay && tradeContent) {
    const feedback = state.lastTradeFeedback;
    tradeOverlay.classList.toggle("is-hidden", !feedback);
    if (feedback) {
      tradeContent.innerHTML = `
        <div class="trade-result-stamp ${feedback.success ? "is-success" : "is-failed"}">
          ${feedback.success ? "成交" : "失败"}
        </div>
        <h2>${escapeHtml(feedback.title)}</h2>
        <p>${escapeHtml(feedback.text)}</p>
        <div class="trade-result-stars" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
      `;
    }
  }
}

function updateClock() {
  const timeNode = document.querySelector("#taskbar-time");
  const dayNode = document.querySelector("#taskbar-day");
  if (!timeNode) return;
  timeNode.textContent = Game.getTimeLabel();
  if (dayNode) dayNode.textContent = `第 ${Game.getState().day} 天`;
}

function clampOpenWindows() {
  if (!workspace) return;
  windowState.forEach((entry) => {
    if (entry.maximized) return;
    const maxWidth = Math.max(280, workspace.clientWidth - 16);
    const maxHeight = Math.max(220, workspace.clientHeight - 16);
    const nextWidth = Math.min(entry.app.defaultSize.width, maxWidth);
    const nextHeight = Math.min(entry.app.defaultSize.height, maxHeight);
    entry.element.style.width = `${nextWidth}px`;
    entry.element.style.height = `${nextHeight}px`;
    const maxLeft = Math.max(0, workspace.clientWidth - entry.element.offsetWidth);
    const maxTop = Math.max(0, workspace.clientHeight - Math.min(entry.element.offsetHeight, workspace.clientHeight));
    entry.element.style.left = `${clamp(entry.element.offsetLeft, 0, maxLeft)}px`;
    entry.element.style.top = `${clamp(entry.element.offsetTop, 0, maxTop)}px`;
  });
}

function getNextWindowPosition(app) {
  const availableWidth = Math.max(280, workspace.clientWidth - 16);
  const availableHeight = Math.max(260, workspace.clientHeight - 16);
  const width = Math.min(app.defaultSize.width, availableWidth);
  const height = Math.min(app.defaultSize.height, availableHeight);
  const left = Math.max(8, Math.round((workspace.clientWidth - width) / 2));
  const top = Math.max(8, Math.round((workspace.clientHeight - height) / 2));
  return { width, height, left, top };
}

function renderAppContent(appId) {
  if (appId === "mail") return renderMailApp();
  if (appId === "calendar") return renderCalendarApp();
  if (appId === "auction") return renderAuctionApp();
  if (appId === "shop") return renderShopApp();
  if (appId === "folder") return renderFolderApp();
  if (appId === "universal") return renderUniversalApp();
  if (appId === "item-detail") return renderItemDetailApp();
  return `<div class="empty-panel">没有可显示的内容。</div>`;
}

function getWindowTitle(appId) {
  if (appId === "item-detail") {
    const item = getSelectedItem();
    return item ? item.name : "物品详情";
  }
  return DESKTOP_APPS.find((app) => app.id === appId)?.windowTitle ?? "窗口";
}

function renderMailApp() {
  const state = Game.getState();
  return `
    <div class="legacy-toolbar"><span>文件</span><span>编辑</span><span>查看</span><span>帮助</span></div>
    <div class="mail-layout">
      <aside class="legacy-sidebar">
        <strong>本地文件夹</strong>
        <span class="is-selected">收件箱</span>
        <span>已发送</span>
        <span>已删除</span>
      </aside>
      <section class="mail-list">
        <div class="mail-list-head"><strong>收件箱</strong><span>1 封邮件</span></div>
        <article class="mail-preview">
          <header><span>${escapeHtml(CONFIG.brokerName)}</span><time>系统消息</time></header>
          <h3>您好，亲爱的 ${escapeHtml(state.nickname || "朋友")}！</h3>
          <p>感谢您选择${escapeHtml(
            CONFIG.brokerName
          )}。您的经营贷款已经审核通过，账户与失物拍卖权限现已激活。</p>
          <p><span class="key-info">首期还款信息已经写入日历。</span>建议您通过关键词搜索、标签定价和买家沟通提高收益。</p>
          <div class="mail-meta">
            <span>总债务</span><strong class="key-expense">${formatCurrency(Game.getState().totalDebt)}</strong>
          </div>
          <div class="mail-terms">
            <span>首期还款：<b class="key-expense">${formatCurrency(
              state.nextPayment.amount
            )}</b></span>
            <span>还款日：<b class="key-info">第 ${
              state.nextPayment.dueDay
            } 天</b></span>
            <span>还款周期：每 ${CONFIG.paymentIntervalDays} 天</span>
            <span class="key-alert">连续三次逾期将终止账户。</span>
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderCalendarApp() {
  const state = Game.getState();
  const dueDay = state.nextPayment.dueDay;
  const overdue = Boolean(
    state.nextPayment.overdue || state.day > dueDay
  );
  const dueToday = state.day === dueDay && !overdue;
  const troubleCost = Game.getTroubleHandlingCost();
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const cells = Array.from({ length: 14 }, (_, index) => {
    const day = index + 1;
    return `
      <span class="calendar-day ${day === dueDay ? "is-due" : ""} ${
        overdue && day === dueDay ? "is-overdue" : ""
      } ${day < state.day ? "is-muted" : ""}">
        ${day}
        ${day === dueDay ? `<small>${overdue ? "已逾期" : "还款"}</small>` : ""}
      </span>
    `;
  }).join("");

  return `
    <div class="legacy-toolbar"><span>文件</span><span>日期</span><span>查看</span><span>帮助</span></div>
    <div class="calendar-shell">
      <header class="calendar-head">
        <strong>第 ${state.day} 天 · 自动日历</strong>
        <span>${
          overdue
            ? `本期已逾期：<b class="key-alert">第 ${dueDay} 天</b>`
            : `下一期：<b class="key-info">第 ${dueDay} 天</b>`
        }</span>
      </header>
      <div class="calendar-weekdays">${days.map((day) => `<span>${day}</span>`).join("")}</div>
      <div class="calendar-grid calendar-grid-two-weeks">${cells}</div>
      <div class="calendar-note">
        <span class="warning-square"></span>
        <span>${overdue ? `贷款逾期 ${state.overdueCount} 次` : dueToday ? "今日到期" : "贷款还款"}</span>
        <strong class="key-expense">${formatCurrency(state.nextPayment.amount)}</strong>
      </div>
      <div class="calendar-visitors">
        <strong>人物与到访</strong>
        ${
          state.scheduledVisitors?.length
            ? state.scheduledVisitors
                .map((visitor) => {
                  const label =
                    visitor.status === "resolved"
                      ? `${visitor.name} · 已经到访`
                      : `第 ${visitor.windowStart} 到 ${visitor.windowEnd} 天 · 未知访客`;
                  return `<span class="${
                    visitor.status === "arrived" ? "is-due" : ""
                  }">${escapeHtml(label)}</span>`;
                })
                .join("")
            : `<span>本局没有安排人物到访</span>`
        }
      </div>
      <div class="loan-actions">
        <span>总债务 <b class="key-expense">${formatCurrency(
          state.totalDebt
        )}</b></span>
        <button
          type="button"
          class="legacy-button"
          data-action="reduce-trouble"
          ${
            state.troubleReductionUsed ||
            state.trouble <= 0 ||
            state.cash < troubleCost
              ? "disabled"
              : ""
          }
        >${
          state.troubleReductionUsed
            ? "今日已处理麻烦"
            : `处理麻烦 -${formatCurrency(troubleCost)}`
        }</button>
        <button
          type="button"
          class="legacy-button primary"
          data-action="pay-loan"
          ${
            (!dueToday && !overdue) || state.cash < state.nextPayment.amount
              ? "disabled"
              : ""
          }
        >${
          state.cash < state.nextPayment.amount
            ? "现金不足"
            : `立即还款 ${formatCurrency(state.nextPayment.amount)}`
        }</button>
        <button
          type="button"
          class="legacy-button"
          data-action="take-loan"
          ${state.loanTakenToday ? "disabled" : ""}
        >${state.loanTakenToday ? "今日已借款" : "应急贷款 +¥1,000"}</button>
      </div>
      <div class="calendar-rules">
        <strong>当前局内规则</strong>
        ${
          state.activeRules?.length
            ? state.activeRules
                .map((id) => {
                  const rule = STAGE_TWO_DATA.runRules.find(
                    (candidate) => candidate.id === id
                  );
                  return rule
                    ? `<span><b class="key-info">${escapeHtml(
                        rule.name
                      )}</b>：${escapeHtml(rule.description)}</span>`
                    : "";
                })
                .join("")
            : `<span>尚未生效</span>`
        }
        ${
          state.marketEffect
            ? `<span><b class="key-income">市场影响</b>：${
                state.marketEffect.category === "all"
                  ? "全品类"
                  : escapeHtml(
                      CATEGORY_INFO[state.marketEffect.category]?.name ??
                        "相关物品"
                    )
              } 价格 × ${state.marketEffect.multiplier}</span>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderAuctionApp() {
  const state = Game.getState();
  const auction = state.auction;
  const nextBid = roundBid(auction.currentPrice * 1.1);
  const playerLeading = auction.highBidder === "player";

  if (auction.status === "bidding") {
    return `
      <div class="legacy-toolbar"><span>文件</span><span>拍卖</span><span>查看</span><span>帮助</span></div>
      <div class="auction-shell">
        <section class="auction-list-pane">
          <header><strong>今日批次</strong><span>第 1 箱</span></header>
          <div class="auction-box-card">
            <div class="box-pixel-art" aria-hidden="true"></div>
            <strong>${escapeHtml(auction.destination)}</strong>
            <span>${escapeHtml(auction.appearance)}</span>
          </div>
        </section>
        <section class="auction-detail-pane">
          <div class="auction-info">
            <p class="eyebrow">只看得到两条线索</p>
            <h2>${escapeHtml(auction.destination)} · ${escapeHtml(
              auction.appearance
            )}</h2>
            <p>${escapeHtml(auction.appearanceDescription)}</p>
            <div class="auction-price">
              <span>当前报价</span>
              <strong class="key-info">${formatCurrency(auction.currentPrice)}</strong>
            </div>
            <div class="auction-feedback feedback-${escapeHtml(
              auction.lastAction ?? "start"
            )}">
              ${
                auction.lastAction === "won"
                  ? "你的出价已经领先并赢得拍卖。"
                  : auction.lastAction === "outbid"
                    ? "其他买家超过了你。"
                    : "拍卖正在进行。"
              }
            </div>
            <div class="competitor-list">
              ${auction.competitors
                .map(
                  (rival) => `
                    <div class="competitor-row ${auction.highBidder === rival.id ? "is-leading" : ""}">
                      <span>${escapeHtml(rival.name)}</span>
                      <strong>${auction.highBidder === rival.id ? "领先" : "观望"}</strong>
                    </div>
                  `
                )
                .join("")}
              <div class="competitor-row player-bid-row ${playerLeading ? "is-leading" : ""}">
                <span>你的出价</span>
                <strong>${playerLeading ? "领先" : "未领先"}</strong>
              </div>
            </div>
            <div class="action-row">
              <button type="button" class="legacy-button primary" data-action="bid">
                加价到 ${formatCurrency(nextBid)}
              </button>
              <button type="button" class="legacy-button" data-action="pass-auction">
                放弃
              </button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  if (auction.status === "won" && !auction.result) {
    return `
      <div class="legacy-toolbar"><span>文件</span><span>拍卖</span><span>查看</span><span>帮助</span></div>
      <div class="auction-result">
        <div class="auction-win-effect" aria-hidden="true">
          <span>成交</span>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="auction-result-box">
          <div class="box-pixel-art large" aria-hidden="true"></div>
          <strong>箱子已经成交</strong>
          <span>你花了 ${formatCurrency(auction.currentPrice)}</span>
        </div>
        <div class="outcome-grid">
          <button type="button" class="legacy-button outcome-button" data-action="auction-outcome" data-outcome="resale">
            <strong>原封转卖</strong>
            <span>立即让其他买家出价</span>
          </button>
          <button type="button" class="legacy-button outcome-button" data-action="auction-outcome" data-outcome="onsite">
            <strong>现场开箱</strong>
            <span>所有物品立即公开出售</span>
          </button>
          <button type="button" class="legacy-button outcome-button" data-action="auction-outcome" data-outcome="home">
            <strong>带回家</strong>
            <span>物品进入我的店铺库存</span>
          </button>
        </div>
      </div>
    `;
  }

  if (auction.status === "onsite-preview") {
    const total = Game.getOnsiteSaleTotal();
    const difference = total - auction.currentPrice;
    return `
      <div class="legacy-toolbar"><span>文件</span><span>拍卖</span><span>查看</span><span>帮助</span></div>
      <section class="onsite-preview">
        <header>
          <button type="button" class="legacy-button" data-action="back-auction-outcome">返回</button>
          <div>
            <p class="eyebrow">现场开箱结果</p>
            <h2>物品已经公开</h2>
          </div>
          <strong class="key-income">${formatCurrency(total)}</strong>
        </header>
        <div class="onsite-offer-summary ${
          difference >= 0 ? "is-profit" : "is-loss"
        }">
          <span>成交成本 <b>${formatCurrency(auction.currentPrice)}</b></span>
          <span>现场总报价 <b>${formatCurrency(total)}</b></span>
          <strong>${
            difference >= 0
              ? `现场卖出可赚 ${formatCurrency(difference)}`
              : `现场卖出将亏 ${formatCurrency(Math.abs(difference))}`
          }</strong>
        </div>
        <div class="onsite-item-grid">
          ${auction.items
            .map(
              (item) => `
                <article class="inventory-card">
                  <strong>${escapeHtml(item.name)}</strong>
                  <p>${escapeHtml(item.description)}</p>
                  <div class="keyword-row">
                    ${item.keywords
                      .map((keyword) =>
                        state.day > 1
                          ? `<button type="button" class="keyword-chip is-searchable" data-action="search-onsite-keyword" data-item-id="${item.id}" data-keyword="${escapeHtml(keyword)}">${escapeHtml(keyword)}</button>`
                          : `<span class="keyword-chip">${escapeHtml(keyword)}</span>`
                      )
                      .join("")}
                  </div>
                  <div class="onsite-price">${
                    item.category === "special"
                      ? "现场买家拒绝收购"
                      : `现场报价 ${formatCurrency(getOnsiteOffer(item))}`
                  }</div>
                </article>
              `
            )
            .join("")}
        </div>
        <div class="action-row">
          <button type="button" class="legacy-button primary" data-action="onsite-sell">全部卖给现场</button>
          <button type="button" class="legacy-button" data-action="onsite-carry">全部带回家</button>
        </div>
      </section>
    `;
  }

  const title =
    auction.status === "lost" || (!auction.result && auction.status === "resolved")
      ? "没有获得箱子"
      : auction.result?.title ?? "拍卖结束";
  const detail =
    auction.result?.detail ??
    "你可以关闭拍卖窗口，继续处理店铺库存中的基础物品。";

  return `
    <div class="legacy-toolbar"><span>文件</span><span>拍卖</span><span>查看</span><span>帮助</span></div>
    <div class="window-placeholder auction-finished">
      <div class="box-pixel-art" aria-hidden="true"></div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      <div class="action-row">
        ${
          auction.lotNumber < auction.maxLots
            ? `<button type="button" class="legacy-button primary" data-action="next-lot">下一箱</button>`
            : `<span class="auction-closed-note">今日拍卖已经结束。</span>`
        }
      </div>
    </div>
  `;
}

function renderShopApp() {
  const state = Game.getState();
  const activeTab = state.activeShopTab ?? "inventory";
  const tabs = [
    ["inventory", "库存"],
    ["listings", "上架中"],
    ["sold", "已售出"],
    ["buyers", "买家私聊"]
  ];

  return `
    <div class="legacy-toolbar"><span>文件</span><span>库存</span><span>查看</span><span>帮助</span></div>
    <div class="tab-strip" role="tablist" aria-label="我的店铺页面">
      ${tabs
        .map(
          ([id, label]) => `
            <button
              type="button"
              class="legacy-tab ${activeTab === id ? "is-active" : ""}"
              data-action="shop-tab"
              data-tab="${id}"
              role="tab"
              aria-selected="${activeTab === id}"
            >${label}${id === "buyers" && state.buyerChat?.unread ? "<i class='tab-dot'></i>" : ""}</button>
          `
        )
        .join("")}
    </div>
    <div class="shop-shell">${renderShopTab(activeTab)}</div>
  `;
}

function renderShopTab(tab) {
  const state = Game.getState();
  if (tab === "inventory") {
    if (state.listingDraft) return renderListingEditor();
    return `
      <aside class="shop-summary">
        <div><span>库存</span><strong>${state.inventory.length}</strong></div>
        <div><span>上架中</span><strong>${state.listings.filter((l) => l.status === "active").length}</strong></div>
        <div><span>已售出</span><strong>${state.listings.filter((l) => l.status === "sold").length}</strong></div>
        <div><span>信誉</span><strong>${state.reputation}</strong></div>
      </aside>
      <section class="shop-content">
        ${
          state.inventory.length
            ? `<div class="inventory-grid">${state.inventory.map(renderInventoryItem).join("")}</div>`
            : `<div class="empty-panel">库存为空</div>`
        }
      </section>
    `;
  }

  if (tab === "listings") {
    const listings = state.listings.filter((listing) => listing.status === "active");
    return `
      <section class="shop-content full-span">
        ${
          listings.length
            ? `<div class="listing-list">${listings.map(renderListingRow).join("")}</div>`
            : `<div class="empty-panel">没有正在上架的商品</div>`
        }
      </section>
    `;
  }

  if (tab === "sold") {
    const sold = state.listings.filter((listing) =>
      ["sold", "failed"].includes(listing.status)
    );
    return `
      <section class="shop-content full-span">
        ${
          sold.length
            ? `<div class="listing-list">${sold.map(renderListingRow).join("")}</div>`
            : `<div class="empty-panel">还没有成交记录</div>`
        }
      </section>
    `;
  }

  return `
    <section class="shop-content full-span buyer-panel">
      ${state.buyerChat ? renderBuyerChat(state.buyerChat) : `<div class="empty-panel">还没有买家私信</div>`}
    </section>
  `;
}

function renderInventoryItem(item) {
  const isBox = item.type === "box";
  const tagSource = item.unlockedTags?.length ? item.unlockedTags : item.keywords ?? [];
  return `
    <article class="inventory-card ${item.category === "special" ? "special-item" : ""}">
      ${
        item.category === "special"
          ? `<span class="contraband-badge">违禁物品</span>`
          : ""
      }
      <div class="inventory-card-head">
        <span class="inventory-icon ${isBox ? "is-box" : ""}" aria-hidden="true"></span>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${isBox ? "未打开箱子" : getItemStatusLabel(item.status)}</span>
        </div>
      </div>
      ${
        isBox
          ? ""
          : `<p>${escapeHtml(item.description ?? "")}</p>
             <div class="keyword-row">
               ${tagSource
                 .slice(0, 2)
                 .map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`)
                 .join("")}
             </div>
             ${
               item.effect
                 ? `<div class="item-effect-badge"><span>特殊效果</span><strong>${escapeHtml(
                     item.effect
                   )}</strong></div>`
                 : ""
             }`
      }
      <div class="inventory-actions">
        <button type="button" class="legacy-button" data-action="view-item" data-item-id="${item.id}">
          ${isBox ? "打开" : "查看"}
        </button>
        ${
          !isBox && item.status !== "listed"
            ? item.category === "special"
              ? `<button type="button" class="legacy-button" data-action="report-special" data-item-id="${item.id}">上报</button>
                 <button
                   type="button"
                   class="legacy-button"
                   data-action="prepare-listing"
                   data-item-id="${item.id}"
                 >冒险上架</button>`
              : `<button
                 type="button"
                 class="legacy-button"
                 data-action="prepare-listing"
                 data-item-id="${item.id}"
               >上架</button>
               <button type="button" class="legacy-button" data-action="keep-item" data-item-id="${item.id}">自留</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderListingEditor() {
  const state = Game.getState();
  const draft = state.listingDraft;
  const item = state.inventory.find((candidate) => candidate.id === draft.itemId);
  const priceRange = state.searchResult?.itemId === item?.id
    ? state.searchResult.priceRange
    : [
        Math.round((item?.baseValue ?? 100) * 0.5),
        Math.round((item?.baseValue ?? 100) * 1.6)
      ];
  const selectedFakeProduct = STAGE_TWO_DATA.mallProducts.find(
    (product) => product.id === draft.fakeItemId
  );
  const minPrice = priceRange[0];
  const maxPrice = Math.round(
    priceRange[1] * 1.6 * (selectedFakeProduct?.priceMultiplier ?? 1)
  );
  const researchedTags = new Set(item?.unlockedTags ?? []);
  const baseTags = new Set(["旧物", "来源不明"]);
  const availableTags = unique([
    ...(item?.unlockedTags ?? []),
    ...(item?.keywords ?? []),
    ...STAGE_TWO_DATA.listingTags
  ]).slice(0, 8);
  const days = Array.from({ length: 6 }, (_, index) => state.day + index);

  return `
    <section class="shop-content full-span listing-editor">
      <header>
        <button type="button" class="legacy-button" data-action="back-inventory">返回</button>
        <div>
          <p class="eyebrow">上架商品</p>
          <h2>${escapeHtml(item?.name ?? "物品")}</h2>
        </div>
        <span class="selection-count">${draft.tags.length} / 2 标签</span>
      </header>
      <div class="listing-workspace">
        <aside class="listing-item-preview">
          <div class="detail-icon" aria-hidden="true"></div>
          <strong>${escapeHtml(item?.name ?? "物品")}</strong>
          <p>${escapeHtml(item?.description ?? "")}</p>
          <div class="keyword-row">
            ${(item?.keywords ?? [])
              .map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`)
              .join("")}
          </div>
          <small>参考价格 ${formatCurrency(priceRange[0])} - ${formatCurrency(
            priceRange[1]
          )}</small>
        </aside>
        <div class="listing-fields">
          <div class="tag-legend">
            <span><i class="legend-base"></i>基础标签</span>
            <span><i class="legend-researched"></i>万物通已验证</span>
            <span><i class="legend-unverified"></i>未经验证</span>
          </div>
          <div class="listing-section">
            <strong>选择标签</strong>
            <div class="tag-picker">
              ${availableTags
                .map(
                  (tag) => `
                    <button
                      type="button"
                      class="tag-option ${
                        draft.tags.includes(tag) ? "is-selected" : ""
                      } ${
                        researchedTags.has(tag)
                          ? "is-researched"
                          : baseTags.has(tag)
                            ? "is-base"
                            : "is-unverified"
                      }"
                      data-action="toggle-tag"
                      data-tag="${escapeHtml(tag)}"
                    >${escapeHtml(tag)}</button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="listing-section">
            <strong>可伪造物品</strong>
            ${
              STAGE_TWO_DATA.mallProducts.some(
                (product) =>
                  product.type === "fake" &&
                  (state.fakeItems?.[product.id] ?? 0) > 0
              )
                ? `<div class="fake-picker">
                    ${STAGE_TWO_DATA.mallProducts
                      .filter(
                        (product) =>
                          product.type === "fake" &&
                          (state.fakeItems?.[product.id] ?? 0) > 0
                      )
                      .map(
                        (product) => `
                          <button
                            type="button"
                            class="fake-option ${
                              draft.fakeItemId === product.id
                                ? "is-selected"
                                : ""
                            }"
                            data-action="toggle-draft-fake"
                            data-product-id="${product.id}"
                          >
                            <b>${escapeHtml(product.name)} × ${
                              state.fakeItems[product.id]
                            }</b>
                            <span>${escapeHtml(product.effect)}</span>
                          </button>
                        `
                      )
                      .join("")}
                  </div>`
                : `<span class="mall-empty">没有可用的伪造物品，可在万物通商城购买。</span>`
            }
          </div>
          <div class="listing-section">
            <strong>设置售价</strong>
            <div class="price-editor">
              <input
                type="range"
                min="${minPrice}"
                max="${maxPrice}"
                step="10"
                value="${draft.price}"
                data-field="listing-price"
              />
              <strong>${formatCurrency(draft.price)}</strong>
            </div>
          </div>
          <div class="listing-section">
            <strong>选择上架日期</strong>
            <div class="day-picker">
              ${days
                .map(
                  (day) => `
                    <button
                      type="button"
                      class="day-option ${draft.day === day ? "is-selected" : ""}"
                      data-action="listing-day"
                      data-day="${day}"
                    >第 ${day} 天</button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="action-row">
            <button
              type="button"
              class="legacy-button primary"
              data-action="publish-listing"
              ${draft.tags.length === 2 ? "" : "disabled"}
            >发布上架</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderListingRow(listing) {
  const statusText = {
    active: "等待买家",
    sold: "已成交",
    failed: "交易失败"
  }[listing.status];
  return `
    <article class="listing-row">
      <div>
        <strong>${escapeHtml(listing.title)}</strong>
        <span>${listing.tags.map(escapeHtml).join(" · ")}</span>
        ${
          listing.fakeItemName
            ? `<span class="listing-fake-note">已使用：${escapeHtml(
                listing.fakeItemName
              )}</span>`
            : ""
        }
        <button
          type="button"
          class="legacy-button listing-view-button"
          data-action="view-listing-item"
          data-item-id="${listing.id}"
        >查看物品</button>
      </div>
      <div class="listing-price">${formatCurrency(listing.price)}</div>
      <div class="listing-date">第 ${listing.listingDay} 天</div>
      <strong class="listing-status status-${listing.status}">${statusText}</strong>
    </article>
  `;
}

function renderBuyerChat(chat) {
  const state = Game.getState();
  chat.history ??= [];
  chat.trust ??= 50;
  chat.questionIndex ??= 0;
  const buyer = chat.buyer ?? {};
  const question = buyer.questions?.[chat.questionIndex] ?? {
    text: buyer.opening ?? "我看到了你上架的物品，想确认几个细节。",
    replies: []
  };
  const replies = Array.isArray(question.replies)
    ? question.replies.filter((reply) => reply?.id && reply?.text)
    : [];
  const trustTone =
    chat.trust >= 70 ? "high" : chat.trust >= 35 ? "medium" : "low";
  const listing = state.listings.find(
    (candidate) => candidate.id === chat.listingId
  );
  const listingItem = listing?.itemSnapshot;
  return `
    <div class="secondary-header">
      <button type="button" class="legacy-button" data-action="back-listings">返回上架中</button>
    </div>
    <div class="buyer-profile">
      <span class="buyer-avatar buyer-avatar-${escapeHtml(
        buyer.avatar ?? "crane"
      )}" aria-hidden="true"></span>
      <div>
        <strong>${escapeHtml(buyer.name ?? "匿名买家")}</strong>
        <span>用户编号：${escapeHtml(
          buyer.displayId ?? buyer.id ?? "访客-001"
        )}</span>
      </div>
    </div>
    <div class="buyer-listing-context">
      <span>本次咨询的商品</span>
      <strong>${escapeHtml(listingItem?.name ?? listing?.title ?? "已下架商品")}</strong>
      <small>${
        listing
          ? `你的标价：${formatCurrency(listing.price)}`
          : "该商品已经结束交易"
      }</small>
      ${
        buyer.wantsDiscount
          ? `<em class="buyer-discount-note">买家希望降价，坚持原价有概率导致交易失败。</em>`
          : ""
      }
    </div>
    <div class="trust-meter trust-${trustTone}">
      <div class="trust-meter-head">
        <span>买家信任度</span>
        <strong>${chat.trust}%</strong>
      </div>
      <div class="trust-track">
        <i style="width:${chat.trust}%"></i>
      </div>
    </div>
    <div class="chat-thread">
      ${chat.history
        .map(
          (entry) =>
            `<div class="chat-message buyer">${escapeHtml(
              entry?.question ?? "买家发来了一条消息。"
            )}</div>
             <div class="chat-message seller">${escapeHtml(
               entry?.answer ?? "已回复。"
             )}</div>`
        )
        .join("")}
      ${
        !chat.replied
          ? `<div class="chat-message buyer">${escapeHtml(
              question.text ?? "请问可以补充一下物品信息吗？"
            )}</div>`
          : ""
      }
    </div>
    ${
      !chat.replied && !chat.blacklisted
        ? replies.length
          ? `<div class="reply-options">
            ${replies
              .map(
                (reply) => `
                  <button
                    type="button"
                    class="legacy-button"
                    data-action="reply-buyer"
                    data-reply-id="${escapeHtml(reply.id)}"
                  >${escapeHtml(reply.text)}</button>
                `
              )
              .join("")}
          </div>`
          : `<div class="pending-sale">买家正在整理问题，请稍后再查看。</div>`
        : chat.blacklisted
          ? `<div class="pending-sale trust-failed">买家已经将你拉黑，交易结束。</div>`
          : `<div class="pending-sale">三轮谈判已经结束，交易结果已经结算。</div>`
    }
  `;
}

function renderUniversalApp() {
  const state = Game.getState();
  const activeTab = state.universalTab ?? "search";
  return `
    <div class="legacy-toolbar"><span>文件</span><span>搜索</span><span>商城</span><span>帮助</span></div>
    <div class="universal-shell">
      <div class="universal-search">
        <span>搜索：</span>
        <input type="text" value="${escapeHtml(
          state.searchResult?.keyword ?? ""
        )}" placeholder="点击物品关键词" readonly />
        <button type="button" disabled>搜索</button>
      </div>
      <div class="universal-tabs">
        <button type="button" class="legacy-tab ${activeTab === "search" ? "is-active" : ""}" data-action="universal-tab" data-tab="search">搜索结果</button>
        <button type="button" class="legacy-tab ${activeTab === "mall" ? "is-active" : ""}" data-action="universal-tab" data-tab="mall">商城</button>
      </div>
      <div class="universal-content">
        ${activeTab === "search" ? renderSearchResults() : renderMall()}
      </div>
    </div>
  `;
}

function renderSearchResults() {
  const state = Game.getState();
  const selectedItem = getSelectedItem();
  const keywords = selectedItem?.keywords ?? [];
  const result = state.searchResult;

  return `
    <section class="search-layout">
      <div class="search-keywords">
        <strong>物品关键词</strong>
        ${
          selectedItem
            ? keywords
                .map(
                  (keyword) => `
                    <button
                      type="button"
                      class="keyword-chip is-searchable"
                      data-action="search-keyword"
                      data-item-id="${selectedItem.id}"
                      data-keyword="${escapeHtml(keyword)}"
                    >${escapeHtml(keyword)}</button>
                  `
                )
                .join("")
            : `<span class="muted-copy">请先从库存打开一件物品。</span>`
        }
      </div>
      <div class="search-results">
        ${
          result
            ? `
              <h3>${escapeHtml(result.title)}</h3>
              <div class="search-fact"><span>价格区间</span><strong class="key-income">${formatCurrency(
                result.priceRange[0]
              )} - ${formatCurrency(result.priceRange[1])}</strong></div>
              <div class="search-fact"><span>市场需求</span><strong class="key-info">${escapeHtml(
                result.demand
              )}</strong></div>
              <div class="search-fact"><span>风险</span><strong class="key-alert">${escapeHtml(
                result.risk
              )}</strong></div>
              <div class="search-fact"><span>潜在买家</span><strong class="key-info">${escapeHtml(
                result.buyer
              )}</strong></div>
              <div class="unlocked-tags">
                ${result.unlockedTags
                  .map((tag) => `<span class="keyword-chip">${escapeHtml(tag)}</span>`)
                  .join("")}
              </div>
              ${
                result.evidence
                  ? (Array.isArray(result.evidence)
                      ? result.evidence
                      : [result.evidence]
                    )
                      .map(renderSearchEvidence)
                      .join("")
                  : ""
              }
            `
            : `<div class="empty-panel">点击左侧关键词查看物品资料。</div>`
        }
      </div>
    </section>
  `;
}

function renderSearchEvidence(evidence) {
  const highlightedBody = escapeHtml(evidence.body).replace(
    escapeHtml(evidence.highlight),
    `<mark class="research-highlight">${escapeHtml(
      evidence.highlight
    )}</mark>`
  );
  return `
    <article class="search-evidence evidence-${escapeHtml(evidence.type)}">
      <span class="evidence-label">${escapeHtml(evidence.label)}</span>
      <h4>${escapeHtml(evidence.title)}</h4>
      <p>${highlightedBody}</p>
      <div class="evidence-effect">
        <span>效果</span>
        <strong>${escapeHtml(evidence.effect)}</strong>
      </div>
      <div class="evidence-tags">
        <span>适合标签</span>
        ${(evidence.tags ?? [])
          .map((tag) => `<b>${escapeHtml(tag)}</b>`)
          .join("")}
      </div>
      <small>${escapeHtml(evidence.duration)}</small>
    </article>
  `;
}

function renderMall() {
  const state = Game.getState();
  const groups = [
    { id: "service", title: "服务" },
    { id: "collection", title: "藏品" },
    { id: "fake", title: "可伪造物品" }
  ];
  return `
    <div class="mall-status">
      <span>保护服务：<b>${state.protectionCharges ?? 0}</b></span>
      <span>伪造护航：<b>${state.cleanupShield ?? 0}</b></span>
      <span>保险：<b>${state.insuranceActive ? "生效中" : "未购买"}</b></span>
    </div>
    <div class="mall-grid">
      ${groups
        .map(
          (group) => `
            <section class="mall-group">
              <strong>${group.title}</strong>
              ${
                state.mallStock
                  .map((productId) =>
                    STAGE_TWO_DATA.mallProducts.find(
                      (product) => product.id === productId
                    )
                  )
                  .filter((product) => product?.type === group.id)
                  .map(
                    (product) => `
                      <article class="mall-product">
                        <div>
                          <b>${escapeHtml(product.name)}</b>
                          <p>${escapeHtml(product.description)}</p>
                          <span>${escapeHtml(product.effect)}</span>
                          ${
                            product.type === "fake"
                              ? `<small>已有 ${state.fakeItems?.[product.id] ?? 0} 件</small>`
                              : ""
                          }
                        </div>
                        <button
                          type="button"
                          class="legacy-button primary"
                          data-action="buy-mall-item"
                          data-product-id="${product.id}"
                          ${state.cash < product.price ? "disabled" : ""}
                        >${formatCurrency(product.price)}</button>
                      </article>
                    `
                  )
                  .join("") ||
                `<span class="mall-empty">今日商品已经售罄</span>`
              }
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFolderApp() {
  const state = Game.getState();
  const items = state.folder;
  const activeCombos = Game.getCollectionComboState();
  const archetypeHint = Game.getArchetypeHint();
  const activeEffectKeys = new Set();
  const folderItems = items.map((item) => {
    const isStacked =
      Boolean(item.effectKey) && activeEffectKeys.has(item.effectKey);
    if (item.effectKey) activeEffectKeys.add(item.effectKey);
    return {
      ...item,
      effectActive: Boolean(item.effectKey) && !isStacked,
      effectStacked: isStacked
    };
  });
  return `
    <div class="legacy-toolbar"><span>文件</span><span>编辑</span><span>查看</span><span>帮助</span></div>
    <div class="folder-shell">
      <aside class="folder-tree">
        <strong>收藏档案</strong>
        <span class="is-selected">全部藏品</span>
        <span>未分类</span>
      </aside>
      <section class="folder-content">
        <div class="folder-effect-note">
          同类特殊效果不能叠加，每类效果只会让一件藏品生效。
        </div>
        <div class="folder-combo-panel">
          <strong>收藏组合</strong>
          ${
            activeCombos.length
              ? activeCombos
                  .map(
                    (combo) => `
                      <span>
                        <b class="key-income">${escapeHtml(combo.name)}</b>
                        ${escapeHtml(combo.effect)}
                      </span>
                    `
                  )
                  .join("")
              : `<span>还没有藏品满足组合条件。</span>`
          }
        </div>
        ${
          archetypeHint
            ? `<div class="folder-archetype-hint">
                <strong>交易倾向</strong>
                <span>${escapeHtml(archetypeHint)}</span>
              </div>`
            : ""
        }
        ${
          items.length
            ? `<div class="folder-item-list">
                ${folderItems
                  .map(
                    (item) => `
                      <article class="folder-item">
                        <div class="folder-paper-icon" aria-hidden="true"></div>
                        <div class="folder-item-copy">
                          <div class="folder-item-title">
                            <strong>${escapeHtml(item.name)}</strong>
                            ${
                              item.effectActive
                                ? `<span class="folder-effect-badge is-active">生效</span>`
                                : item.effectStacked
                                  ? `<span class="folder-effect-badge">同类效果已生效</span>`
                                  : ""
                            }
                          </div>
                          <p>${escapeHtml(item.description ?? "")}</p>
                          <span>${escapeHtml(item.effect ?? "自留物品")}</span>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </div>`
            : `<div class="empty-panel">没有藏品</div>`
        }
      </section>
    </div>
  `;
}

function renderItemDetailApp() {
  const state = Game.getState();
  const item = getSelectedItem();
  if (!item) {
    return `<div class="empty-panel">请先从我的店铺选择一件物品。</div>`;
  }
  const discoveredFacts = (item.facts ?? []).filter(
    (fact) => fact.discovered
  );

  return `
    <div class="item-detail-shell">
      ${
        item.category === "special"
          ? `<div class="contraband-alert">违禁物品：不能正常交易，上报或冒险出售都会产生后果。</div>`
          : ""
      }
      <header>
        <button type="button" class="legacy-button" data-action="back-shop">返回店铺</button>
        <div class="detail-icon" aria-hidden="true"></div>
        <div>
          <p class="eyebrow">物品详情</p>
          <h2>${escapeHtml(item.name)}</h2>
          <span>${getItemStatusLabel(item.status)}</span>
        </div>
      </header>
      ${
        !state.keywordTipShown
          ? `<aside class="keyword-usage-tip">
              <div>
                <strong>关键词可以点击</strong>
                <p>点击下方的黄色关键词，会自动打开万物通搜索物品资料。</p>
              </div>
              <button type="button" class="legacy-button" data-action="dismiss-keyword-tip">知道了</button>
            </aside>`
          : ""
      }
      <div class="item-research-fields">
        <span>物品编号：<b class="key-info">${escapeHtml(
          item.discoveredCode
            ? item.code ?? "未确认"
            : "尚未确认"
        )}</b></span>
        <span>来源：<b class="key-alert">${escapeHtml(
          item.discoveredSource
            ? item.source ?? "尚未确认"
            : "尚未通过万物通确认"
        )}</b></span>
      </div>
      ${
        discoveredFacts.length
          ? `<div class="detail-section">
              <strong>万物通已确认</strong>
              <div class="item-fact-list">
                ${discoveredFacts
                  .map(
                    (fact) => `
                      <span>${escapeHtml(fact.label)}：<b class="key-info">${escapeHtml(
                        fact.value
                      )}</b></span>
                    `
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      <p class="item-description">${escapeHtml(item.description ?? "")}</p>
      <div class="detail-section">
        <strong>关键词</strong>
        <div class="keyword-row">
          ${(item.keywords ?? [])
            .map(
              (keyword) => `
                <button
                  type="button"
                  class="keyword-chip is-searchable"
                  data-action="search-keyword"
                  data-item-id="${item.id}"
                  data-keyword="${escapeHtml(keyword)}"
                >${escapeHtml(keyword)}</button>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="detail-section">
        <strong>当前估价</strong>
        <p>${
          item.searched
            ? "已通过万物通补充资料。"
            : `未知，参考区间 ${formatCurrency(
                Math.round(item.baseValue * 0.7)
              )} - ${formatCurrency(Math.round(item.baseValue * 1.4))}`
        }</p>
      </div>
      ${
        item.effect
          ? `<div class="detail-section item-effect-section">
              <strong>特殊效果</strong>
              <p class="key-effect">${escapeHtml(item.effect)}</p>
            </div>`
          : ""
      }
    </div>
  `;
}

function getSelectedItem() {
  const state = Game.getState();
  return (
    state.inventory.find((item) => item.id === state.selectedItemId) ??
    state.folder.find((item) => item.id === state.selectedItemId) ??
    state.listings.find(
      (listing) => listing.id === state.selectedListingId
    )?.itemSnapshot ??
    (state.onsiteSearchItem?.id === state.searchResult?.itemId
      ? state.onsiteSearchItem
      : null) ??
    null
  );
}

function renderAppIcon(icon) {
  if (icon === "mail") {
    return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="6" width="28" height="20" fill="#d6d6d6" stroke="#000" stroke-width="2"/><path d="M3 8 L16 18 L29 8" fill="none" stroke="#000080" stroke-width="3"/></svg>`;
  }
  if (icon === "calendar") {
    return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="5" width="26" height="23" fill="#f2f2f2" stroke="#000" stroke-width="2"/><rect x="3" y="5" width="26" height="6" fill="#000080"/><rect x="7" y="14" width="5" height="4" fill="#9b9b9b"/><rect x="14" y="14" width="5" height="4" fill="#9b9b9b"/><rect x="21" y="14" width="5" height="4" fill="#c64b3c"/></svg>`;
  }
  if (icon === "auction") {
    return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="7" y="11" width="19" height="16" fill="#9c7a43" stroke="#000" stroke-width="2"/><path d="M11 11 V8 Q11 4 16 4 Q21 4 21 8 V11" fill="none" stroke="#000" stroke-width="2"/><rect x="13" y="16" width="7" height="4" fill="#f0cf55"/></svg>`;
  }
  if (icon === "shop") {
    return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><rect x="3" y="5" width="26" height="22" fill="#d8d1b6" stroke="#000" stroke-width="2"/><rect x="3" y="5" width="26" height="6" fill="#000080"/><path d="M6 14 H26 V25 H6 Z" fill="#b5a77c" stroke="#000" stroke-width="2"/><rect x="10" y="16" width="12" height="7" fill="#f1eee0"/></svg>`;
  }
  if (icon === "universal") {
    return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><circle cx="13" cy="13" r="9" fill="#b8d9d6" stroke="#000" stroke-width="3"/><circle cx="13" cy="13" r="4" fill="#4e7c80"/><path d="M20 20 L29 29" stroke="#000" stroke-width="5"/><path d="M4 7 H9 M18 4 V9 M25 8 H29" stroke="#000080" stroke-width="2"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true"><path d="M2 8 H12 L15 11 H30 V27 H2 Z" fill="#d6b554" stroke="#000" stroke-width="2"/><rect x="8" y="16" width="16" height="8" fill="#f2e4a3" stroke="#000" stroke-width="2"/></svg>`;
}

function getTroubleTone(value) {
  if (value >= 7) return "danger";
  if (value >= 4) return "warn";
  return "safe";
}

function getItemStatusLabel(status) {
  const labels = {
    unviewed: "尚未查看",
    viewed: "已查看",
    researched: "已查询",
    kept: "已自留",
    listed: "已上架"
  };
  return labels[status] ?? "可用";
}

function roundBid(value) {
  return Math.max(10, Math.round(value / 10) * 10);
}

function getOnsiteOffer(item) {
  return Math.max(
    0,
    Number(item?.onsiteOffer) ||
      Number(item?.onsitePrice) ||
      0
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function announce(message) {
  if (!liveRegion || !message) return;
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
