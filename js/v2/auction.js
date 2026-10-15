// 拍卖流程：加价、竞争对手跟价、赢下箱子、放弃、贷款。

import { loanOffer, scheduleRepayment } from "./state.js";
import { currentLot } from "./boxes.js";

// 每次加价按当前价的 10% 向上取整，最低加 10 元。
export function nextBidAmount(price) {
  return Math.max(price + 10, Math.ceil((price * 1.1) / 10) * 10);
}

export function leaderName(state, lot) {
  if (!state.auction.leader) {
    return "无人应价";
  }
  if (state.auction.leader === "player") {
    return "你";
  }
  const competitor = lot.competitors.find((entry) => entry.id === state.auction.leader);
  return competitor ? competitor.name : "竞争对手";
}

// 玩家出价。余额不足时不扣款，返回现金缺口和贷款广告。
export function placeBid(state) {
  const lot = currentLot(state);
  if (!lot || state.auction.status !== "live") {
    return { ok: false, reason: "NO_LOT" };
  }

  const amount = nextBidAmount(state.auction.price);
  if (state.cash < amount) {
    return {
      ok: false,
      reason: "INSUFFICIENT_CASH",
      nextBid: amount,
      cash: state.cash,
      gap: amount - state.cash,
      loanOffer: loanOffer(state.borrowCount, amount - state.cash)
    };
  }

  state.auction.price = amount;
  state.auction.leader = "player";
  state.auction.lastAction = "bid";
  state.auction.bids = state.auction.bids || {};
  state.auction.bids.player = amount;
  return Object.assign({ ok: true, amount }, resolveCompetitors(state, lot));
}

// 竞争对手按激进度从高到低依次决定是否跟价，第一个跟价的成为领先者。
function resolveCompetitors(state, lot) {
  const order = lot.competitors.slice().sort((a, b) => b.aggression - a.aggression);
  for (const competitor of order) {
    const next = nextBidAmount(state.auction.price);
    if (competitor.budget >= next && Math.random() < competitor.aggression) {
      state.auction.price = next;
      state.auction.leader = competitor.id;
      state.auction.lastAction = "outbid";
      state.auction.bids = state.auction.bids || {};
      state.auction.bids[competitor.id] = next;
      return { outbid: competitor, price: next };
    }
  }
  return { won: true };
}

// 玩家赢下箱子：扣款、生成待处置箱子。
export function claimLot(state) {
  const lot = currentLot(state);
  if (!lot) {
    return null;
  }
  state.cash -= state.auction.price;
  state.auction.status = "won";
  state.auction.lastAction = "win";
  const won = Object.assign({}, lot, {
    price: state.auction.price,
    acquisitionCost: state.auction.price
  });
  state.pendingWon = won;
  state.ledger.purchase = (state.ledger.purchase || 0) + state.auction.price;
  return won;
}

export function passLot(state) {
  state.auction.status = "passed";
  state.auction.lastAction = "pass";
}

export function advanceLot(state) {
  state.lotIndex += 1;
  state.pendingWon = null;
  const lot = currentLot(state);
  if (!lot) {
    state.auction.status = "finished";
    state.auction.lastAction = "end";
    return null;
  }
  state.auction.status = "live";
  state.auction.price = lot.startPrice;
  state.auction.leader = null;
  state.auction.bids = {};
  state.auction.lastAction = "start";
  return lot;
}

export function startLot(state, lot) {
  state.auction.status = "live";
  state.auction.price = lot.startPrice;
  state.auction.leader = null;
  state.auction.bids = {};
  state.auction.lastAction = "start";
}

// 借款：应急贷款走递增表，第 4 天竞拍垫资单独处理。
export function takeLoan(state, offer) {
  state.cash += offer.amount;
  state.totalDebt += offer.debtAdded;
  state.borrowCount += 1;
  state.borrowToday = true;
  state.lastBorrowDay = state.day;
  state.ledger.loan = (state.ledger.loan || 0) + offer.amount;
  // 每笔借款建立 3 期还款计划：到账金额 + 利息 = 需要还的债务。
  scheduleRepayment(state, offer.debtAdded, offer.periods, offer.interval);
  state.loanHistory = state.loanHistory || [];
  state.loanHistory.push({
    day: state.day,
    type: offer.type || "emergency",
    amount: offer.amount,
    interest: offer.interest,
    debt: offer.debtAdded,
    periods: offer.periods,
    interval: offer.interval
  });
  return offer;
}

export function restartAuction(state) {
  const lot = currentLot(state);
  if (!lot) {
    return null;
  }
  startLot(state, lot);
  return lot;
}
