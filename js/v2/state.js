// 2.0 存档与进度状态。
// 工作状态持续写入 WORKING_KEY，检查点只在本日结束时写入 CHECKPOINT_KEY，载入只读检查点。

export const WORKING_KEY = "lastbox-auction-v2-working";
export const CHECKPOINT_KEY = "lastbox-auction-v2-checkpoint";
export const STATE_VERSION = "2.0.0";

// 借贷方案：额度按缺口决定，压力来自利息。利息随借款次数上升，不再是额度递增。
// 来自《数值平衡与资源换算表》第 13 章。
export const LOAN_INTEREST = [0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.0];
export const LOAN_LIMITS = { min: 500, max: 2000, step: 100 };
export const LOAN_TERM = { periods: 3, interval: 3 };

// 第 4 天高额优先寄售箱的黑匣紧急竞拍垫资：固定高息，不吃普通贷款的利息递增。
export const BID_LOAN = {
  interest: 3.0,
  min: 1000,
  max: 2000,
  step: 100,
  periods: 3,
  interval: 3
};

export function ceilStep(value, step) {
  return Math.ceil(value / step) * step;
}

export function interestFor(borrowCount) {
  return LOAN_INTEREST[Math.min(borrowCount, LOAN_INTEREST.length - 1)];
}

// 普通应急贷款：额度 = 缺口（向上取整到 100），利息按借款次数递增。
export function loanOffer(borrowCount, gap = 0) {
  const amount = Math.min(
    LOAN_LIMITS.max,
    Math.max(LOAN_LIMITS.min, ceilStep(Math.max(gap, 0), LOAN_LIMITS.step))
  );
  const interest = interestFor(borrowCount);
  return {
    amount,
    interest,
    debtAdded: Math.round(amount * (1 + interest)),
    count: borrowCount + 1,
    periods: LOAN_TERM.periods,
    interval: LOAN_TERM.interval,
    remainingToday: 1,
    type: "emergency"
  };
}

// 第 4 天黑匣垫资：额度覆盖竞拍缺口，利息固定 300%。
export function bidLoanOffer(state, gap = 0) {
  const amount = Math.min(
    BID_LOAN.max,
    Math.max(BID_LOAN.min, ceilStep(Math.max(gap, 0), BID_LOAN.step))
  );
  return {
    amount,
    interest: BID_LOAN.interest,
    debtAdded: Math.round(amount * (1 + BID_LOAN.interest)),
    count: state.borrowCount + 1,
    periods: BID_LOAN.periods,
    interval: BID_LOAN.interval,
    remainingToday: 1,
    forced: true,
    type: "bid"
  };
}

// 市场趋势池。每条持续 5 到 10 天，影响对应品类的售价倍率。
export const MARKET_TRENDS = [
  { id: "luxury_up", name: "奢侈品升值", lift: { luxury: 1.15, common: 1, junk: 0.95 } },
  { id: "junk_up", name: "旧物回潮", lift: { luxury: 1, common: 1.05, junk: 1.2 } },
  { id: "documents_up", name: "纸品走俏", lift: { luxury: 1.05, common: 1.12, junk: 1.05 } },
  { id: "electronics_up", name: "电子翻新热", lift: { luxury: 1, common: 1.15, junk: 1.02 } },
  { id: "quiet", name: "市场平稳", lift: { luxury: 1, common: 1, junk: 1 } },
  { id: "oversupply", name: "货源过剩", lift: { luxury: 0.9, common: 0.94, junk: 0.9 } }
];

export function createState() {
  return {
    version: STATE_VERSION,
    day: 1,
    cash: 800,
    totalDebt: 0,
    reputation: 50,
    trouble: 0,
    shopLevel: 1,
    auctionLevel: "low",
    borrowCount: 0,
    borrowToday: false,
    lastBorrowDay: 0,
    paidPeriods: 0,
    nextPayment: { amount: 0, dueDay: 0 },
    overdueCount: 0,
    // 还款计划：每笔借款按 3 期、每期 3 天分摊，还清前一直生效。
    debtPlan: { debt: 0, periods: 0, interval: 3, termDays: 0, perPayment: 0 },
    loanHistory: [],
    trend: MARKET_TRENDS[4],
    trendEndDay: 6,
    lots: [],
    lotIndex: 0,
    auction: { price: 0, leader: null, status: "idle", lastAction: null, bids: {} },
    pendingWon: null,
    shelfBoxes: [],
    inventory: [],
    keepsakes: [],
    listings: [],
    buyer: null,
    fakeStock: {},
    contrabandSales: 0,
    contrabandAttention: 0,
    pendingPayouts: [],
    officialRelation: 0,
    reportMisses: 0,
    cleanupShield: 0,
    listingSeq: 0,
    buyerBlacklist: {},
    buyerDeceived: {},
    // 线索物品与买家故事进度。
    clueSeen: {},
    ownedClues: {},
    cluePity: {},
    storyUnlocked: {},
    tutorial: null,
    compendium: null,
    notebook: null,
    ledger: {
      resale: 0,
      onsite: 0,
      home: 0,
      storage: 0,
      payment: 0,
      cost: 0,
      contraband: 0,
      report: 0,
      listing: 0
    },
    lastSettlement: null
  };
}

// 店铺等级决定货架容量，等级 2 起保管费打折。
export const CAPACITY = {
  1: { boxSlots: 3, itemSlots: 6 },
  2: { boxSlots: 4, itemSlots: 9 },
  3: { boxSlots: 5, itemSlots: 12 }
};

export function capacityOf(state) {
  return CAPACITY[state.shopLevel] || CAPACITY[1];
}

export function paymentAmount(state) {
  const plan = state.debtPlan || {};
  if (plan.perPayment > 0) {
    return Math.min(plan.perPayment, Math.max(0, plan.debt));
  }
  return 0;
}

// 借到一笔钱时建立或续接还款计划。
export function scheduleRepayment(state, debtAdded, periods, interval) {
  const plan = state.debtPlan || { debt: 0, periods: 0, interval: 3, termDays: 0, perPayment: 0 };
  plan.debt += Math.round(debtAdded);
  plan.periods = Math.max(1, Math.min(3, periods || 3));
  plan.interval = Math.max(1, interval || 3);
  plan.termDays = plan.periods * plan.interval;
  plan.perPayment = ceilStep(plan.debt / plan.periods, 100);
  state.debtPlan = plan;
  state.paidPeriods = 0;
  state.nextPayment = {
    amount: plan.perPayment,
    dueDay: state.day + plan.interval
  };
  return plan;
}

export function saveWorking(state) {
  if (!state) {
    return;
  }
  try {
    localStorage.setItem(WORKING_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("保存工作状态失败", error);
  }
}

export function saveCheckpoint(state) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("保存检查点失败", error);
  }
}

export function clearSaves() {
  localStorage.removeItem(WORKING_KEY);
  localStorage.removeItem(CHECKPOINT_KEY);
}

export function hasCheckpoint() {
  return localStorage.getItem(CHECKPOINT_KEY) !== null;
}

export function loadState() {
  const raw = localStorage.getItem(CHECKPOINT_KEY) || localStorage.getItem(WORKING_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return Object.assign(createState(), parsed);
  } catch (error) {
    console.warn("读取存档失败", error);
    return null;
  }
}
