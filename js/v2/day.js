// 结束本日：保管费、还款、市场趋势刷新、生成第二天批次。

import { generateDailyLots, levelFor, randInt, round10 } from "./boxes.js";
import { MARKET_TRENDS, ceilStep, saveCheckpoint } from "./state.js";
import { arriveBuyer, cancelWaitingBuyer } from "./listing.js";
import { keepsakeModifiers } from "./keepsake.js";

const STORAGE_FEE = { box: 25, item: 10 };

export function storageFee(state) {
  // 夹层收纳类藏品降低单件物品的保管费，最低不收费。
  const itemFee = Math.max(0, STORAGE_FEE.item + keepsakeModifiers(state).storageDelta);
  const raw =
    state.shelfBoxes.length * STORAGE_FEE.box + state.inventory.length * itemFee;
  const discount = state.shopLevel >= 2 ? 0.8 : 1;
  return round10(raw * discount);
}

function refreshTrend(state) {
  if (state.trendEndDay && state.day <= state.trendEndDay) {
    return null;
  }
  const pool = MARKET_TRENDS.filter((trend) => !state.trend || trend.id !== state.trend.id);
  const next = pool[randInt(0, pool.length - 1)];
  state.trend = next;
  state.trendEndDay = state.day + randInt(5, 10) - 1;
  return next;
}

// 生成当天的批次和趋势，新游戏第一天和进入下一天都走这里。
export function prepareDay(state) {
  state.borrowToday = false;
  const trendChanged = refreshTrend(state);

  const level = levelFor(state);
  const generated = generateDailyLots(state);
  state.auctionLevel = generated.level;
  state.lots = generated.lots;
  state.lotIndex = 0;
  state.pendingWon = null;
  state.auction = { price: 0, leader: null, status: "idle", lastAction: null, bids: {} };
  if (state.lots.length) {
    state.auction.price = state.lots[0].startPrice;
    state.auction.status = "live";
    state.auction.lastAction = "start";
  }

  return { trendChanged, level };
}

export function startNextDay(state) {
  state.day += 1;
  return prepareDay(state);
}

export function endDay(state) {
  const report = {
    day: state.day,
    income: state.ledger.resale + state.ledger.onsite,
    storage: storageFee(state),
    payment: 0,
    overdue: false,
    accountClosed: false,
    trendChanged: null,
    payout: 0,
    buyerArrived: null,
    buyerCancelled: null,
    attentionRise: 0
  };

  // 违禁品尾款结算与调查判定
  state.pendingPayouts = state.pendingPayouts.filter((payout) => {
    if (payout.dueDay > state.day) {
      return true;
    }
    const base =
      0.08 +
      payout.order * 0.06 +
      state.contrabandAttention * 0.08 -
      state.officialRelation * 0.02;
    const chance = Math.min(0.82, Math.max(0.05, base));
    if (Math.random() < chance) {
      state.trouble = Math.min(10, state.trouble + 1);
      state.contrabandAttention += 1;
      report.attentionRise += 1;
      return false;
    }
    state.cash += payout.amount;
    state.ledger.contraband += payout.amount;
    report.payout += payout.amount;
    return false;
  });

  if (report.storage > 0) {
    state.cash -= report.storage;
    state.ledger.storage = report.storage;
  }

  if (state.totalDebt > 0) {
    const plan = state.debtPlan;
    if (plan && plan.debt > 0) {
      if (!state.nextPayment.dueDay) {
        state.nextPayment.dueDay = state.day + plan.interval;
        state.nextPayment.amount = plan.perPayment;
      }
      if (state.day >= state.nextPayment.dueDay) {
        // 本期应还：计划每期金额，最后一期把剩余债务一次还完。
        const due = Math.min(plan.debt, state.nextPayment.amount || plan.perPayment);
        if (state.cash >= due) {
          state.cash -= due;
          state.totalDebt = Math.max(0, state.totalDebt - due);
          plan.debt = Math.max(0, plan.debt - due);
          state.paidPeriods += 1;
          state.overdueCount = 0;
          report.payment = due;
          state.ledger.payment = due;
        } else {
          state.overdueCount += 1;
          state.trouble = Math.min(10, state.trouble + 1);
          report.overdue = true;
          report.accountClosed = state.overdueCount >= 3;
        }
        state.nextPayment = {
          amount: ceilStep(plan.debt / Math.max(1, plan.periods), 100),
          dueDay: state.day + (plan.interval || 3)
        };
      }
    } else if (state.day >= state.nextPayment.dueDay && state.nextPayment.dueDay) {
      // 兼容旧存档：没有还款计划时按剩余债务一次结清。
      const due = Math.min(state.totalDebt, state.nextPayment.amount || state.totalDebt);
      if (state.cash >= due) {
        state.cash -= due;
        state.totalDebt = Math.max(0, state.totalDebt - due);
        state.overdueCount = 0;
        report.payment = due;
        state.ledger.payment = due;
      } else {
        state.overdueCount += 1;
        report.overdue = true;
        report.accountClosed = state.overdueCount >= 3;
      }
      state.nextPayment.dueDay = state.day + 7;
    }
  }

  if (state.totalDebt <= 0) {
    state.nextPayment = { amount: 0, dueDay: 0 };
    state.debtPlan = { debt: 0, periods: 0, interval: 3, termDays: 0, perPayment: 0 };
  }

  state.ledger = {
    resale: 0,
    onsite: 0,
    home: 0,
    storage: 0,
    payment: 0,
    cost: 0,
    contraband: 0,
    report: 0,
    listing: 0
  };

  report.buyerCancelled = cancelWaitingBuyer(state);

  if (!report.accountClosed) {
    const advanced = startNextDay(state);
    report.trendChanged = advanced.trendChanged;
  }

  report.buyerArrived = advanceDayBuyers(state);

  state.lastSettlement = report;
  saveCheckpoint(state);
  return report;
}

function advanceDayBuyers(state) {
  const buyer = arriveBuyer(state);
  return buyer ? { name: buyer.name, questions: buyer.questions.length } : null;
}
