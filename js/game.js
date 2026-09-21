import { CONFIG, STAGE_TWO_DATA } from "./data.js?v=20260920-8";

const SAVE_VERSION = 3;
const DAY_START = 8 * 60;
const MIDNIGHT = 24 * 60;
const FORCED_SLEEP = 25 * 60;

let state = createInitialState();

export const Game = {
  getState() {
    return state;
  },

  restoreGame() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.version !== SAVE_VERSION) return false;
      normalizeState(parsed);
      if (
        parsed.day > 1 &&
        parsed.auction?.day !== parsed.day &&
        parsed.guideStep === "DONE"
      ) {
        parsed.auction = createAuctionState(
          pickDailyAuctionBox(),
          parsed.day,
          1
        );
      }
      parsed.dailyLedger ??= [];
      parsed.troubleReasons ??= [];
      parsed.troubleReductionUsed ??= false;
      parsed.loanTakenToday ??= false;
      parsed.onsiteSearchItem ??= null;
      state = parsed;
      commit();
      return true;
    } catch {
      return false;
    }
  },

  hasSavedGame() {
    try {
      return localStorage.getItem(CONFIG.storageKey) !== null;
    } catch {
      return false;
    }
  },

  startNewGame() {
    state = createInitialState();
    try {
      localStorage.removeItem(CONFIG.storageKey);
      localStorage.removeItem(CONFIG.workingStorageKey);
    } catch {
      // Starting a new game can continue without storage.
    }
  },

  confirmNickname(nickname) {
    state.nickname = String(nickname || "").trim().slice(0, 12) || "朋友";
    commit();
  },

  onWindowClosed(appId) {
    if (this.getState().guideStep === "MAIL" && appId === "mail") {
      this.setGuideStep("CALENDAR");
    }

    if (
      state.day === 1 &&
      state.guideStep === "CALENDAR" &&
      state.calendarOpened &&
      !state.newsRead &&
      appId === "calendar"
    ) {
      state.newsVisible = true;
      this.setGuideStep("NEWS");
    }

    if (appId === "auction" && state.auction.status !== "resolved") {
      if (state.auction.status !== "lost") {
        state.auction.status = "lost";
      }
      state.auction.status = "resolved";
      this.setGuideStep("SHOP");
    }

    if (appId === "shop" && state.guideStep === "LIST") {
      this.setGuideStep("FOLDER");
    }

    if (appId === "folder" && state.guideStep === "FOLDER") {
      this.checkBuyerArrival();
      this.setGuideStep("DONE");
    }

    commit();
  },

  onAppOpened(appId) {
    if (appId === "calendar") {
      state.calendarOpened = true;
    }

    if (appId === "folder") {
      state.folderOpened = true;
      this.checkBuyerArrival();
    }

    if (appId === "shop" && state.activeShopTab === "buyers") {
      this.markBuyerRead();
    }

    commit();
  },

  viewNews() {
    state.newsRead = true;
    state.newsVisible = false;
    this.setGuideStep("AUCTION");
    commit();
  },

  placeBid() {
    const auction = state.auction;
    if (auction.status !== "bidding") return;

    const nextBid = roundBid(auction.currentPrice * 1.1);
    if (nextBid > state.cash) {
      state.lastMessage = "现金不足，无法继续加价。";
      commit();
      return;
    }

    state.cash -= 0;
    auction.currentPrice = nextBid;
    auction.highBidder = "player";

    const counter = findCounterBid(auction.competitors, nextBid);
    if (counter) {
      auction.currentPrice = roundBid(nextBid * 1.1);
      auction.highBidder = counter.id;
      auction.lastAction = "outbid";
      state.lastMessage = `${counter.name}继续跟价。`;
    } else {
      auction.status = "won";
      state.cash -= auction.currentPrice;
      auction.lastAction = "won";
      recordActivity("拍下箱子", -auction.currentPrice);
      state.lastMessage = `成交，你花 ${formatCurrency(
        auction.currentPrice
      )} 拿下了箱子。`;
      this.setGuideStep("AUCTION");
    }
    commit();
  },

  passAuction() {
    if (state.auction.status !== "bidding") return;
    state.auction.status = "lost";
    state.auction.lastAction = "lost";
    state.lastMessage = "你没有拍下这只箱子。";
    commit();
  },

  chooseAuctionOutcome(outcome) {
    const auction = state.auction;
    if (auction.status !== "won") return;

    if (outcome === "resale") {
      const quote = applyResaleModifiers(
        roundBid(auction.currentPrice * 1.28)
      );
      state.cash += quote;
      recordActivity("原封转卖", quote);
      recordArchetypeProgress("quick_cash");
      auction.result = {
        type: "resale",
        title: "原封转卖完成",
        detail: `买家以 ${formatCurrency(quote)} 原封收走箱子。`
      };
    }

    if (outcome === "onsite") {
      auction.items = auction.items.map((item) => ({
        ...item,
        onsiteOffer: calculateOnsiteOffer(item)
      }));
      auction.status = "onsite-preview";
      if (auction.items.some((item) => item.category === "luxury")) {
        recordTrouble(1, "现场公开奢侈品");
      }
      state.lastMessage = "箱子已经当众打开。";
      commit();
      return;
    }

    if (outcome === "home") {
      state.inventory.push({
        ...createAuctionBoxEntry(auction),
        status: "unopened"
      });
      auction.result = {
        type: "home",
        title: "箱子已带回",
        detail: "箱子已经进入我的店铺库存。"
      };
    }

    auction.status = "resolved";
    this.setGuideStep("SHOP");
    commit();
  },

  settleOnsite(mode) {
    const auction = state.auction;
    if (auction.status !== "onsite-preview") return;

    if (mode === "sell") {
      const total = calculateOnsiteSaleTotal(auction);
      state.cash += total;
      recordActivity("现场全部卖出", total);
      recordArchetypeProgress("quick_cash");
      auction.result = {
        type: "onsite-sell",
        title: "现场全部卖出",
        detail: `物品全部被现场买家买走，共收入 ${formatCurrency(total)}。`
      };
    } else {
      state.inventory.unshift(
        ...auction.items.map((item, index) => ({
          ...item,
          id: `onsite_carry_${Date.now().toString(36)}_${index}`,
          status: "viewed",
          searched: false,
          unlockedTags: []
        }))
      );
      auction.result = {
        type: "onsite-carry",
        title: "全部带回家",
        detail: "公开开出的物品已经进入我的店铺库存。"
      };
      recordActivity("现场开箱后带走物品");
    }

    auction.status = "resolved";
    this.setGuideStep("SHOP");
    commit();
  },

  nextAuctionLot() {
    const current = state.auction;
    if (current.lotNumber >= current.maxLots) return;
    state.auction = createAuctionState(
      pickDailyAuctionBox(),
      state.day,
      current.lotNumber + 1
    );
    state.lastMessage = `第 ${state.auction.lotNumber} 箱已经上架。`;
    commit();
  },

  takeEmergencyLoan() {
    if (state.loanTakenToday) return;
    state.cash += 1000;
    state.totalDebt += hasArchetypeEffect("archetype_debt") ? 900 : 1200;
    state.loanTakenToday = true;
    recordActivity("应急贷款到账", 1000);
    recordArchetypeProgress("debt");
    state.lastMessage = "应急贷款已经到账，总债务增加。";
    commit();
  },

  reduceTrouble() {
    const cost = getTroubleHandlingCost();
    if (state.troubleReductionUsed || state.trouble <= 0 || state.cash < cost) return;
    state.cash -= cost;
    state.trouble -= 1;
    state.troubleReductionUsed = true;
    recordActivity("麻烦值处理", -cost);
    state.lastMessage = "律师与安保服务已经介入，麻烦值降低。";
    commit();
  },

  acknowledgeTroublePopup() {
    state.troublePopupOpen = false;
    commit();
  },

  resolvePoliceAction(action) {
    const policeCase = state.policeCase;
    if (!policeCase) return;

    if (action === "lawyer") {
      let cost = policeCase.stage === 1 ? 800 : 1200;
      if (hasCollectionEffect("combo_clean_books")) cost -= 100;
      if (hasArchetypeEffect("archetype_compliant")) cost -= 100;
      cost = Math.max(300, cost);
      if (state.cash < cost) return;
      state.cash -= cost;
      recordActivity("法律处理", -cost);
      state.trouble = Math.max(0, state.trouble - (policeCase.stage === 1 ? 2 : 1));
      state.policeCase = null;
      state.lastMessage = "律师已经介入，调查暂时结束。";
    }

    if (action === "report") {
      removeAllSpecialItems();
      state.trouble = Math.max(0, state.trouble - 1);
      state.policeCase = null;
      recordArchetypeProgress("compliant");
      state.lastMessage = "违禁物品已经上报，调查记录得到清理。";
    }

    if (action === "ignore") {
      policeCase.open = false;
      policeCase.deadlineDay = state.day + 1;
    }
    commit();
  },

  resolveThreat(action) {
    const event = state.threatEvent;
    if (!event) return;

    if (action === "return") {
      const valuable = [...state.inventory]
        .filter((item) => item.status !== "listed")
        .sort((a, b) => b.baseValue - a.baseValue)[0];
      if (valuable) {
        state.inventory = state.inventory.filter(
          (item) => item.id !== valuable.id
        );
      }
      state.trouble = Math.max(0, state.trouble - 2);
      state.lastMessage = "你交出了对方要求的物品，威胁暂时解除。";
    }

    if (action === "pay") {
      if (state.cash < event.amount) return;
      state.cash -= event.amount;
      recordActivity("支付封口费", -event.amount);
      state.trouble = Math.max(0, state.trouble - 1);
      state.lastMessage = "你支付了封口费，对方暂时离开。";
    }

    if (action === "ignore") {
      const loss = Math.min(state.cash, 600);
      state.cash -= loss;
      recordActivity("势力报复损失", -loss);
      recordTrouble(2, "无视势力威胁");
      state.lastMessage = "你无视了威胁，店铺遭到破坏。";
      recordArchetypeProgress("risk", 2);
    }
    state.threatEvent = null;
    commit();
  },

  reportSpecialItem(itemId) {
    const item = state.inventory.find((candidate) => candidate.id === itemId);
    if (!item || item.category !== "special") return;
    removeSpecialItemEverywhere(itemId);
    state.reputation += 5;
    state.trouble = Math.max(0, state.trouble - 2);
    recordArchetypeProgress("compliant");
    recordActivity("上报特殊物品");
    state.lastMessage = "特殊物品已经上报，信誉提高。";
    commit();
  },

  viewInventoryEntry(entryId) {
    const entry = state.inventory.find((item) => item.id === entryId);
    if (!entry) return null;
    state.selectedListingId = null;

    if (entry.type === "box" && !entry.opened) {
      entry.opened = true;
      const openedItems = entry.items.map((item) => ({
        ...item,
        id: `${entry.id}_${item.id}`,
        status: "viewed",
        searched: false,
        unlockedTags: []
      }));
      state.inventory = state.inventory.filter((item) => item.id !== entryId);
      state.inventory.unshift(...openedItems);
      state.selectedItemId = openedItems[0]?.id ?? null;
      state.guideStep = "SEARCH";
      commit();
      return state.selectedItemId;
    }

    state.selectedItemId = entry.id;
    if (entry.status === "unviewed") entry.status = "viewed";
    if (state.guideStep === "SHOP" || state.guideStep === "VIEW_ITEM") {
      state.guideStep = "SEARCH";
    }
    commit();
    return entry.id;
  },

  viewListingItem(listingId) {
    const listing = state.listings.find(
      (candidate) => candidate.id === listingId
    );
    if (!listing?.itemSnapshot) return;
    state.selectedListingId = listing.id;
    state.selectedItemId = listing.itemSnapshot.id;
    commit();
  },

  searchKeyword(itemId, keyword) {
    const item =
      state.inventory.find((candidate) => candidate.id === itemId) ??
      state.folder.find((candidate) => candidate.id === itemId);
    if (!item) return;
    normalizeItemData(item);
    state.keywordTipShown = true;

    item.searched = true;
    item.status = "researched";
    item.tagConfidence = "high";
    const fact =
      item.facts.find((candidate) => candidate.keyword === keyword) ??
      item.facts.find((candidate) => !candidate.discovered) ??
      item.facts[0];
    if (fact) fact.discovered = true;
    if (fact?.kind === "code") item.discoveredCode = true;
    if (fact?.kind === "source") item.discoveredSource = true;
    item.unlockedTags = unique([
      ...(item.unlockedTags ?? []),
      item.category === "luxury" ? "私人来源" : "可收藏",
      item.keywords[0]
    ]);
    propagateTypeKnowledge(item, keyword, fact);

    state.searchResult = {
      itemId,
      keyword,
      title: `${item.name} · 搜索结果`,
      priceRange: [
        roundToTen(item.baseValue * 0.82),
        roundToTen(item.baseValue * 1.55)
      ],
      demand: item.category === "luxury" ? "收藏买家需求较高" : "普通买家需求稳定",
      risk: "来源描述无法完全确认",
      buyer: "收藏买家",
      unlockedTags: item.unlockedTags,
      evidence: buildSearchEvidence(item, keyword, fact)
    };
    state.guideStep = "LIST";
    commit();
  },

  searchAuctionItem(itemId, keyword) {
    if (state.day <= 1) return;
    const item = state.auction.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    normalizeItemData(item);
    state.keywordTipShown = true;
    item.searched = true;
    const fact =
      item.facts.find((candidate) => candidate.keyword === keyword) ??
      item.facts.find((candidate) => !candidate.discovered) ??
      item.facts[0];
    if (fact) fact.discovered = true;
    if (fact?.kind === "code") item.discoveredCode = true;
    if (fact?.kind === "source") item.discoveredSource = true;
    item.unlockedTags = unique([
      ...(item.unlockedTags ?? []),
      item.category === "luxury" ? "私人来源" : "可收藏",
      item.keywords[0]
    ]);
    propagateTypeKnowledge(item, keyword, fact);
    state.onsiteSearchItem = { ...item };
    state.searchResult = {
      itemId,
      keyword,
      title: `${item.name} · 现场搜索`,
      priceRange: [
        roundToTen(item.baseValue * 0.82),
        roundToTen(item.baseValue * 1.45)
      ],
      demand: item.category === "luxury" ? "收藏买家需求较高" : "普通买家需求稳定",
      risk: "公开开箱后的来源风险",
      buyer: "收藏买家",
      unlockedTags: item.unlockedTags,
      evidence: buildSearchEvidence(item, keyword, fact)
    };
    state.universalTab = "search";
    commit();
  },

  searchListingItem(listingId, keyword) {
    const listing = state.listings.find(
      (candidate) => candidate.id === listingId
    );
    const item = listing?.itemSnapshot;
    if (!item) return;
    normalizeItemData(item);
    state.keywordTipShown = true;
    const fact =
      item.facts.find((candidate) => candidate.keyword === keyword) ??
      item.facts.find((candidate) => !candidate.discovered) ??
      item.facts[0];
    if (fact) fact.discovered = true;
    if (fact?.kind === "code") item.discoveredCode = true;
    if (fact?.kind === "source") item.discoveredSource = true;
    item.unlockedTags = unique([
      ...(item.unlockedTags ?? []),
      item.category === "luxury" ? "私人来源" : "可收藏",
      item.keywords[0]
    ]);
    propagateTypeKnowledge(item, keyword, fact);
    state.searchResult = {
      itemId: item.id,
      keyword,
      title: `${item.name} · 上架物品搜索`,
      priceRange: [
        roundToTen(item.baseValue * 0.82),
        roundToTen(item.baseValue * 1.55)
      ],
      demand: item.category === "luxury" ? "收藏买家需求较高" : "普通买家需求稳定",
      risk: "来源描述无法完全确认",
      buyer: "收藏买家",
      unlockedTags: item.unlockedTags,
      evidence: buildSearchEvidence(item, keyword, fact)
    };
    state.universalTab = "search";
    commit();
  },

  keepItem(itemId) {
    const index = state.inventory.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const [item] = state.inventory.splice(index, 1);
    item.status = "kept";
    state.folder.push(item);
    state.folderViewed = true;
    recordArchetypeProgress("storage");
    state.guideStep = "FOLDER";
    commit();
  },

  prepareListing(itemId) {
    const item = state.inventory.find((candidate) => candidate.id === itemId);
    if (!item) return;
    state.listingDraft = {
      itemId,
      tags: [],
      day: state.day,
      fakeItemId: null,
      price:
        state.searchResult?.itemId === itemId
          ? Math.round(
              (state.searchResult.priceRange[0] +
                state.searchResult.priceRange[1]) /
                2
            )
          : Math.round(item.baseValue)
    };
    state.activeShopTab = "inventory";
    commit();
  },

  toggleListingTag(tag) {
    if (!state.listingDraft) return;
    const tags = state.listingDraft.tags;
    if (tags.includes(tag)) {
      state.listingDraft.tags = tags.filter((candidate) => candidate !== tag);
    } else if (tags.length < 2) {
      state.listingDraft.tags = [...tags, tag];
    }
    commit();
  },

  setListingDay(day) {
    if (!state.listingDraft) return;
    state.listingDraft.day = Math.max(state.day, Math.min(state.day + 5, day));
    commit();
  },

  setListingPrice(price) {
    if (!state.listingDraft) return;
    const item = state.inventory.find(
      (candidate) => candidate.id === state.listingDraft.itemId
    );
    const fakeProduct = STAGE_TWO_DATA.mallProducts.find(
      (candidate) => candidate.id === state.listingDraft.fakeItemId
    );
    const min = Math.max(10, Math.round((item?.baseValue ?? 100) * 0.5));
    const max = Math.max(
      min,
      Math.round(
        (item?.baseValue ?? 100) *
          2.5 *
          (fakeProduct?.priceMultiplier ?? 1)
      )
    );
    state.listingDraft.price = Math.max(min, Math.min(max, Number(price) || min));
    commit();
  },

  publishListing() {
    const draft = state.listingDraft;
    if (!draft || draft.tags.length !== 2) return;
    const item = state.inventory.find((candidate) => candidate.id === draft.itemId);
    if (!item) return;
    normalizeItemData(item);

    const fakeProduct = draft.fakeItemId
      ? STAGE_TWO_DATA.mallProducts.find(
          (candidate) =>
            candidate.id === draft.fakeItemId && candidate.type === "fake"
        )
      : null;
    const basePriceRange =
      state.searchResult?.itemId === item.id
        ? state.searchResult.priceRange
        : [
            roundToTen(item.baseValue * 0.8),
            roundToTen(item.baseValue * 1.2)
          ];
    const listingPriceRange = fakeProduct
      ? [
          roundToTen(basePriceRange[0] * fakeProduct.priceMultiplier),
          roundToTen(basePriceRange[1] * fakeProduct.priceMultiplier)
        ]
      : basePriceRange;

    item.status = "listed";
    const listing = {
      id: `listing_${Date.now().toString(36)}`,
      itemId: item.id,
      itemSnapshot: JSON.parse(JSON.stringify(item)),
      title: item.name,
      price: draft.price,
      priceRange: listingPriceRange,
      tags: draft.tags,
      confidence:
        !fakeProduct &&
        draft.tags.every(
          (tag) =>
            item.unlockedTags?.includes(tag) ||
            ["旧物", "来源不明"].includes(tag)
        )
        ? "high"
        : "low",
      fakeItemId: fakeProduct?.id ?? null,
      fakeItemName: fakeProduct?.name ?? null,
      fakeExposureChance: fakeProduct?.exposureChance ?? 0,
      listingDay: draft.day,
      status: "active",
      buyerAttempts: 0
    };
    if (fakeProduct) {
      state.fakeItems[fakeProduct.id] = Math.max(
        0,
        (state.fakeItems[fakeProduct.id] ?? 0) - 1
      );
      recordArchetypeProgress("risk");
    }
    const buyerDelay =
      1 +
      Math.floor(Math.random() * 8) +
      (hasActiveRule("logistics_break") ? 30 : 0);
    state.listings.push(listing);
    state.inventory = state.inventory.filter(
      (candidate) => candidate.id !== item.id
    );
    state.activeListingId = listing.id;
    state.buyerSchedule.push({
      id: `buyerschedule_${Date.now().toString(36)}`,
      time: state.timeMinutes + buyerDelay,
      listingId: listing.id
    });
    state.listingDraft = null;
    state.buyerArrivalAt = state.timeMinutes + buyerDelay;
    state.buyerAttempts = 0;
    this.setGuideStep("FOLDER");
    commit();
  },

  checkBuyerSchedule() {
    if (state.buyerChat) return;
    const index = state.buyerSchedule.findIndex(
      (entry) => entry.time <= state.timeMinutes
    );
    if (index < 0) return;
    const [entry] = state.buyerSchedule.splice(index, 1);
    const listing = state.listings.find(
      (candidate) => candidate.id === entry.listingId
    );
    if (!listing || listing.status !== "active") return;
    state.activeListingId = listing.id;
    state.buyerAttempts = listing.buyerAttempts ?? 0;
    state.buyerArrivalAt = state.timeMinutes;
    this.checkBuyerArrival();
  },

  checkBuyerArrival() {
    if (!state.activeListingId || state.buyerChat) return;
    if (state.buyerAttempts >= 3) return;
    if (state.timeMinutes < state.buyerArrivalAt) return;

    const listing = state.listings.find(
      (candidate) => candidate.id === state.activeListingId
    );
    if (!listing || listing.status !== "active") return;

    const profile = pickBuyerProfile();
    const listingItem = normalizeItemData(listing.itemSnapshot);
    let questions = selectBuyerQuestions(listingItem);
    const averageRange =
      (listing.priceRange[0] + listing.priceRange[1]) / 2;
    const wantsDiscount =
      Math.random() < (listing.price > averageRange ? 0.7 : 0.38);
    if (wantsDiscount && !questions.some((question) => question.id === "final_price")) {
      const discountQuestion = STAGE_TWO_DATA.buyerQuestionPool.find(
        (question) => question.id === "final_price"
      );
      if (discountQuestion) {
        questions = [...questions.slice(0, 2), { ...discountQuestion }];
      }
    }
    const effectTrust =
      listingItem?.effectKey === "buyer_trust" ? 10 : 0;
    const collectionTrust =
      (hasCollectionEffect("buyer_trust_global") ? 5 : 0) +
      (hasCollectionEffect("combo_buyer_network") ? 5 : 0) +
      (hasArchetypeEffect("archetype_negotiation") ? 4 : 0);
    const ruleTrust =
      (hasActiveRule("mystery_buyers") ? 5 : 0) -
      (hasActiveRule("strict_review") && listing.confidence === "low" ? 10 : 0);
    const priceRatio =
      listing.price / Math.max(1, listing.priceRange[1]);
    const priceTrustPenalty =
      priceRatio > 1
        ? Math.min(28, Math.round((priceRatio - 1) * 36))
        : 0;
    const tagTrustPenalty =
      listing.confidence === "high"
        ? 0
        : hasActiveRule("strict_review")
          ? 20
          : 12;
    const confidenceBonus = listing.confidence === "high" ? 10 : 0;
    state.buyerChat = {
      id: `buyer_${Date.now().toString(36)}`,
      listingId: listing.id,
      buyer: { ...profile, questions, wantsDiscount },
      questionIndex: 0,
      trust: Math.max(
        5,
        Math.min(
          90,
          profile.initialTrust +
            confidenceBonus +
            effectTrust +
            collectionTrust +
            ruleTrust -
            priceTrustPenalty -
            tagTrustPenalty
        )
      ),
      history: [],
      unread: true,
      replied: false,
      blacklisted: false
    };
    state.buyerAttempts += 1;
    listing.buyerAttempts = state.buyerAttempts;
  },

  markBuyerRead() {
    if (state.buyerChat) {
      state.buyerChat.unread = false;
      state.activeShopTab = "buyers";
    }
    commit();
  },

  replyToBuyer(replyId) {
    const chat = state.buyerChat;
    if (!chat || chat.replied) return;
    const question = chat.buyer.questions[chat.questionIndex];
    const reply = question?.replies.find(
      (candidate) => candidate.id === replyId
    );
    if (!reply) return;

    chat.trust = Math.max(0, Math.min(100, chat.trust + reply.trust));
    chat.history.push({
      question: question.text,
      answer: reply.text,
      trustDelta: reply.trust
    });
    if (reply.trust > 0) recordArchetypeProgress("negotiation");
    if (question.id === "final_price") {
      const listing = state.listings.find(
        (candidate) => candidate.id === chat.listingId
      );
      if (reply.id === "firm") {
        chat.discountRefused = true;
        chat.priceConcession = 0;
      }
      if (reply.id === "small") {
        chat.priceConcession = roundToTen((listing?.price ?? 0) * 0.08);
      }
      if (reply.id === "free") {
        chat.priceConcession = roundToTen((listing?.price ?? 0) * 0.18);
      }
    }
    chat.unread = false;
    recordActivity("回复买家私信");

    if (chat.trust <= 0) {
      chat.blacklisted = true;
      chat.replied = true;
      state.reputation = Math.max(0, state.reputation - 5);
      state.buyerArrivalAt = state.timeMinutes + 20;
      if (state.buyerAttempts >= 3) {
        const listing = state.listings.find(
          (candidate) => candidate.id === chat.listingId
        );
        if (listing) {
          listing.status = "failed";
          restoreListingItem(listing);
        }
        state.lastMessage = "连续买家已经将你拉黑，商品下架。";
      } else {
        state.lastMessage = "当前买家将你拉黑，仍在等待新的买家。";
      }
    } else if (chat.questionIndex < chat.buyer.questions.length - 1) {
      chat.questionIndex += 1;
      state.lastMessage = "买家继续追问。";
    } else {
      chat.replied = true;
      const listing = state.listings.find(
        (candidate) => candidate.id === chat.listingId
      );
      if (listing && listing.status === "active") {
        this.settleChatTrade(chat, listing);
      }
    }
    commit();
  },

  settleChatTrade(chat, listing) {
    const listingItem = listing.itemSnapshot;
    let feedback;
    const obstruction = resolveTradeObstruction(chat, listing);
    if (obstruction) {
      chat.result = obstruction;
      state.lastTradeFeedback = obstruction;
      state.lastMessage = obstruction.text;
      return;
    }

    if (chat.trust >= 70) {
      let salePrice = listing.price;
      salePrice = applyBuyerPriceConcession(salePrice, chat);
      salePrice = applySaleModifiers(salePrice, listingItem);
      const netSale = calculateNetSale(salePrice, listingItem);
      state.cash += netSale;
      listing.status = "sold";
      state.reputation +=
        2 + (listingItem?.effectKey === "reputation_bonus" ? 1 : 0);
      if (listingItem?.category === "special") {
        recordTrouble(3, "在线出售违禁物品");
        recordArchetypeProgress("risk", 2);
      }
      recordActivity("在线商品成交", netSale);
      recordArchetypeProgress("storage");
      feedback = {
        id: `trade_${Date.now().toString(36)}`,
        success: true,
        amount: netSale,
        title: "买家接受报价",
        text: `商品按你设定的 ${formatCurrency(
          salePrice
        )} 成交，扣除手续费后到账 ${formatCurrency(netSale)}。`
      };
    } else if (chat.trust >= 35) {
      let salePrice = listing.price;
      salePrice = applyBuyerPriceConcession(salePrice, chat);
      salePrice = applySaleModifiers(salePrice, listingItem);
      const netSale = calculateNetSale(salePrice, listingItem);
      state.cash += netSale;
      listing.status = "sold";
      state.reputation +=
        1 + (listingItem?.effectKey === "reputation_bonus" ? 1 : 0);
      if (listingItem?.category === "special") {
        recordTrouble(3, "在线出售违禁物品");
        recordArchetypeProgress("risk", 2);
      }
      recordActivity("在线商品成交", netSale);
      recordArchetypeProgress("storage");
      feedback = {
        id: `trade_${Date.now().toString(36)}`,
        success: true,
        amount: netSale,
        title: "买家压价成交",
        text: `经过谈判，商品仍按 ${formatCurrency(
          salePrice
        )} 成交，扣除手续费后到账 ${formatCurrency(netSale)}。`
      };
    } else {
      state.reputation = Math.max(0, state.reputation - 2);
      recordActivity("在线交易失败");
      if (state.buyerAttempts < 3) {
        listing.status = "active";
        state.buyerSchedule.push({
          id: `buyerschedule_${Date.now().toString(36)}`,
          time: state.timeMinutes + 20,
          listingId: listing.id
        });
      } else {
        listing.status = "failed";
        restoreListingItem(listing);
      }
      feedback = {
        id: `trade_${Date.now().toString(36)}`,
        success: false,
        amount: 0,
        title: "买家取消交易",
        text:
          listing.status === "active"
            ? "商品仍在等待新的买家。"
            : "连续交易失败，商品已经回到库存。"
      };
    }

    chat.result = feedback;
    state.lastTradeFeedback = feedback;
    state.lastMessage = feedback.text;
  },

  acknowledgeTradeFeedback() {
    state.lastTradeFeedback = null;
    state.buyerChat = null;
    state.activeListingId = null;
    this.checkBuyerSchedule();
    commit();
  },

  getGuideTarget() {
    const targets = {
      MAIL: "mail",
      CALENDAR: "calendar",
      NEWS: null,
      AUCTION: "auction",
      SHOP: "shop",
      SEARCH: "universal",
      LIST: "shop",
      FOLDER: "folder",
      SLEEP: null,
      DONE: null
    };
    return targets[state.guideStep] ?? null;
  },

  getGuideMessage() {
    const messages = {
      MAIL: "点击窗口右上角的 × 关闭邮件。",
      CALENDAR: "打开日历，查看还款日期。",
      NEWS: "点击右下角新闻中的“查看”。",
      AUCTION: "打开线上拍卖，决定是否参与竞拍。",
      SHOP: "打开我的店铺，查看库存物品。",
      SEARCH: "打开万物通，点击物品关键词进行搜索。",
      LIST: "返回我的店铺，选择两个标签和上架日期。",
      FOLDER: "打开文件夹，查看自留藏品。",
      SLEEP: "点击任务栏上的休眠，结束今天。",
      DONE: ""
    };
    return messages[state.guideStep] ?? "";
  },

  setGuideStep(step) {
    if (state.guideStep === step) return;
    if (state.guideStep !== "DONE") {
      state.guidePopupDismissedSteps = unique([
        ...(state.guidePopupDismissedSteps ?? []),
        state.guideStep
      ]);
      state.guideStep = step;
    }
  },

  getDarknessLevel() {
    if (state.timeMinutes < MIDNIGHT) return 0;
    if (state.timeMinutes >= FORCED_SLEEP) return 1;
    return Math.min(1, 0.22 + ((state.timeMinutes - MIDNIGHT) / 60) * 0.72);
  },

  canSleep() {
    return state.guideStep === "SLEEP" || state.guideStep === "DONE";
  },

  tickTime(minutes = 1) {
    if (state.arrested || state.loanDefaulted) {
      return { forcedSleep: false, buyerArrived: false, day: state.day };
    }
    state.timeMinutes += minutes;
    if (
      state.timeMinutes >= state.nextNewsTime &&
      !state.newsRead &&
      !state.newsVisible &&
      (state.day > 1 || state.calendarOpened)
    ) {
      state.newsVisible = true;
    }
    if (!state.policeCase && state.trouble >= 6) {
      state.policeCase = {
        stage: 1,
        deadlineDay: state.day + 1,
        open: true
      };
    }
    if (
      state.buyerChat?.blacklisted &&
      state.timeMinutes >= state.buyerArrivalAt &&
      state.buyerAttempts < 3
    ) {
      state.buyerChat = null;
    }
    this.checkBuyerSchedule();
    this.checkBuyerArrival();
    const visitorMessage = processVisitorArrivals();
    if (visitorMessage) state.lastMessage = visitorMessage;
    let forcedSleep = false;
    if (state.timeMinutes >= FORCED_SLEEP) {
      applyForcedSleepPenalty();
      this.sleep();
      forcedSleep = true;
    } else {
      commit();
    }
    return {
      forcedSleep,
      buyerArrived: Boolean(state.buyerChat?.unread),
      day: state.day
    };
  },

  sleep() {
    let saleMessage = "今天没有完成交易。";
    const listing = state.listings.find(
      (candidate) => candidate.id === state.activeListingId
    );
    const listingItem = listing?.itemSnapshot ?? null;
    const chat = state.buyerChat;

    if (state.auction.status !== "resolved") {
      state.auction.status = "resolved";
      state.auction.result = state.auction.result ?? {
        type: "closed",
        title: "今日拍卖已经结束",
        detail: "你可以继续处理库存、上架物品或等待下一天。"
      };
    }

    if (
      listing &&
      listing.status === "active" &&
      chat?.replied &&
      !chat.blacklisted
    ) {
      const obstruction = resolveTradeObstruction(chat, listing);
      if (obstruction) {
        saleMessage = obstruction.text;
      } else if (chat.trust >= 70) {
        let salePrice = listing.price;
        salePrice = applyBuyerPriceConcession(salePrice, chat);
        salePrice = applySaleModifiers(salePrice, listingItem);
        const netSale = calculateNetSale(salePrice, listingItem);
        state.cash += netSale;
        recordActivity("在线商品成交", netSale);
        listing.status = "sold";
        state.inventory = state.inventory.filter(
          (item) => item.id !== listing.itemId
        );
        state.reputation +=
          2 + (listingItem?.effectKey === "reputation_bonus" ? 1 : 0);
        if (listingItem?.category === "special") {
          recordTrouble(3, "在线出售违禁物品");
          recordArchetypeProgress("risk", 2);
        }
        recordArchetypeProgress("storage");
        saleMessage = `商品按你设定的 ${formatCurrency(
          salePrice
        )} 成交，扣除手续费后到账 ${formatCurrency(netSale)}。`;
      } else if (chat.trust >= 35) {
        let salePrice = listing.price;
        salePrice = applyBuyerPriceConcession(salePrice, chat);
        salePrice = applySaleModifiers(salePrice, listingItem);
        const netSale = calculateNetSale(salePrice, listingItem);
        state.cash += netSale;
        recordActivity("在线商品成交", netSale);
        listing.status = "sold";
        state.inventory = state.inventory.filter(
          (item) => item.id !== listing.itemId
        );
        state.reputation +=
          1 + (listingItem?.effectKey === "reputation_bonus" ? 1 : 0);
        if (listingItem?.category === "special") {
          recordTrouble(3, "在线出售违禁物品");
          recordArchetypeProgress("risk", 2);
        }
        recordArchetypeProgress("storage");
        saleMessage = `经过谈判，商品仍按 ${formatCurrency(
          salePrice
        )} 成交，扣除手续费后到账 ${formatCurrency(netSale)}。`;
      } else {
        listing.status =
          state.buyerAttempts < 3 ? "active" : "failed";
        if (listing.status === "failed") restoreListingItem(listing);
        state.reputation = Math.max(0, state.reputation - 2);
        recordActivity("在线交易失败");
        saleMessage =
          listing.status === "active"
            ? "当前买家取消了交易，商品仍在等待新买家。"
            : "连续交易失败，商品已经下架。";
      }
    } else if (chat?.blacklisted) {
      saleMessage = "买家已经将你拉黑，交易失败。";
      const blacklistedListing = state.listings.find(
        (candidate) => candidate.id === chat.listingId
      );
      if (
        state.buyerAttempts >= 3 &&
        blacklistedListing?.status === "failed"
      ) {
        restoreListingItem(blacklistedListing);
      }
    }

    const storedItems = state.inventory.filter(
      (item) => item.status !== "listed"
    ).length;
    if (storedItems > 0) {
      let feePerItem = 15;
      if (hasCollectionEffect("storage_guard")) feePerItem -= 5;
      if (hasArchetypeEffect("archetype_storage")) feePerItem -= 5;
      const storageFee = storedItems * Math.max(5, feePerItem);
      state.cash = Math.max(0, state.cash - storageFee);
      recordActivity("物品保管费", -storageFee);
    }

    const loanMessage = settleLoanAtDayEnd();

    const policeMessage = processPoliceDeadline();

    const earned = state.dailyLedger
      .filter((entry) => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const spent = Math.abs(
      state.dailyLedger
        .filter((entry) => entry.amount < 0)
        .reduce((sum, entry) => sum + entry.amount, 0)
    );

    state.lastNightSummary = {
      day: state.day,
      saleMessage,
      loanMessage,
      policeMessage,
      cash: state.cash,
      earned,
      spent,
      activities: [...state.dailyLedger],
      daysUntilDue: Math.max(0, state.nextPayment.dueDay - state.day),
      overdueCount: state.overdueCount,
      loanOverdue: state.nextPayment.overdue
    };
    state.summaryOpen = true;
    state.day += 1;
    state.timeMinutes = DAY_START;
    refreshActiveRules();
    prepareDailyNews();
    maybeCreateThreatEvent();
    state.guideStep = "DONE";
    state.newsVisible = true;
    state.newsRead = false;
    state.calendarOpened = false;
    state.folderOpened = false;
    state.buyerChat = null;
    state.activeListingId = null;
    state.buyerAttempts = 0;
    state.buyerArrivalAt = null;
    state.buyerSchedule = [];
    prepareBuyerSchedule();
    state.mallStock = createMallStock();
    const visitorMessage = processVisitorArrivals();
    if (visitorMessage) {
      state.lastNightSummary.visitorMessage = visitorMessage;
    } else {
      const upcomingVisitor = state.scheduledVisitors.find(
        (visitor) =>
          visitor.status === "scheduled" &&
          visitor.arriveDay === state.day + 1
      );
      if (upcomingVisitor) {
        state.lastNightSummary.visitorMessage =
          "日历提醒：一位访客预计明天到达，请提前整理物品。";
      }
    }
    state.selectedItemId = null;
    state.selectedListingId = null;
    state.onsiteSearchItem = null;
    state.searchResult = null;
    state.listingDraft = null;
    state.loanTakenToday = false;
    state.troubleReductionUsed = false;
    state.auction = createAuctionState(pickDailyAuctionBox(), state.day, 1);
    state.lastMessage = saleMessage;
    state.dailyLedger = [];
    schedulePaymentNotice();
    commit();
    saveCheckpoint();
  },

  acknowledgeSummary() {
    state.summaryOpen = false;
    commit();
  },

  payNextLoan() {
    if (!isLoanDue() || state.cash < state.nextPayment.amount) return false;
    completeLoanPayment();
    state.lastMessage = "本期贷款已经结清。";
    commit();
    return true;
  },

  dismissPaymentNotice() {
    state.paymentNoticeOpen = false;
    commit();
  },

  dismissKeywordTip() {
    state.keywordTipShown = true;
    commit();
  },

  dismissCurrentGuideStep() {
    const step = state.guideStep;
    if (!step || step === "DONE") return;
    state.guidePopupDismissedSteps = unique([
      ...(state.guidePopupDismissedSteps ?? []),
      step
    ]);
    commit();
  },

  toggleWindowLayoutPreservation() {
    state.preserveWindowLayout = !state.preserveWindowLayout;
    state.lastMessage = state.preserveWindowLayout
      ? "休眠后会恢复今天的窗口布局。"
      : "已关闭窗口布局保留。";
    commit();
  },

  saveWindowLayout(layout) {
    state.savedWindowLayout = Array.isArray(layout) ? layout : [];
    commit();
  },

  buyMallItem(productId) {
    if (!state.mallStock.includes(productId)) return false;
    const product = STAGE_TWO_DATA.mallProducts.find(
      (candidate) => candidate.id === productId
    );
    if (!product || state.cash < product.price) return false;

    state.cash -= product.price;
    recordActivity(`购买${product.name}`, -product.price);
    state.mallStock = state.mallStock.filter((id) => id !== productId);

    if (product.type === "service") {
      if (product.id === "service_lawyer") {
        state.trouble = Math.max(0, state.trouble - 2);
        if (state.policeCase?.stage === 1) state.policeCase = null;
      }
      if (product.id === "service_protection") {
        state.protectionCharges += 1;
      }
      if (product.id === "service_cleanup") {
        state.trouble = Math.max(0, state.trouble - 1);
        state.cleanupShield += 1;
      }
      if (product.id === "service_insurance") {
        state.insuranceActive = true;
      }
    }

    if (product.type === "collection") {
      const template =
        STAGE_TWO_DATA.shopCollectionItems.find(
          (item) => item.id === product.itemTemplateId
        ) ??
        STAGE_TWO_DATA.folderItemPool.find(
          (item) => item.id === product.itemTemplateId
        );
      if (template) {
        state.folder.push({
          ...initializeItem(template),
          id: `${template.id}_${Date.now().toString(36)}`,
          templateId: template.id
        });
      }
    }

    if (product.type === "fake") {
      state.fakeItems[product.id] = (state.fakeItems[product.id] ?? 0) + 1;
    }

    state.lastMessage = `${product.name}已经交付。`;
    commit();
    return true;
  },

  toggleDraftFakeItem(productId) {
    const draft = state.listingDraft;
    const product = STAGE_TWO_DATA.mallProducts.find(
      (candidate) => candidate.id === productId && candidate.type === "fake"
    );
    if (!draft || !product || (state.fakeItems[productId] ?? 0) <= 0) return;
    const currentProduct = STAGE_TWO_DATA.mallProducts.find(
      (candidate) => candidate.id === draft.fakeItemId
    );
    if (draft.fakeItemId === productId) {
      draft.price = roundToTen(
        draft.price / (currentProduct?.priceMultiplier ?? 1)
      );
      draft.fakeItemId = null;
    } else {
      if (currentProduct) {
        draft.price = roundToTen(
          draft.price / currentProduct.priceMultiplier
        );
      }
      draft.fakeItemId = productId;
      draft.price = roundToTen(draft.price * product.priceMultiplier);
    }
    commit();
  },

  resolveVisitor(action) {
    const visitor = state.activeVisitor;
    if (!visitor) return;
    const result = applyVisitorChoice(visitor, action);
    state.visitorHistory.push({
      id: `visitor_history_${Date.now().toString(36)}`,
      visitorId: visitor.id,
      action,
      result
    });
    state.scheduledVisitors = state.scheduledVisitors.map((entry) =>
      entry.id === visitor.scheduleId
        ? { ...entry, status: "resolved", resolvedDay: state.day }
        : entry
    );
    state.activeVisitor = null;
    state.lastMessage = result;
    processVisitorArrivals();
    commit();
  },

  getOnsiteSaleTotal() {
    return calculateOnsiteSaleTotal(state.auction);
  },

  getTroubleHandlingCost() {
    return getTroubleHandlingCost();
  },

  getCollectionComboState() {
    return getActiveCollectionCombos().map((combo) => ({ ...combo }));
  },

  getArchetypeHint() {
    return state.archetypeHint ?? "";
  },

  getTimeLabel() {
    const normalized = Math.floor(state.timeMinutes % MIDNIGHT);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }
};

function createInitialState() {
  return {
    version: SAVE_VERSION,
    nickname: "",
    day: 1,
    timeMinutes: DAY_START,
    cash: CONFIG.startingCash,
    totalDebt: CONFIG.debtTarget,
    reputation: 50,
    trouble: 0,
    nextPayment: {
      amount: CONFIG.firstPayment,
      dueDay: CONFIG.paymentIntervalDays,
      overdue: false
    },
    guideStep: "MAIL",
    guidePopupDismissedSteps: [],
    preserveWindowLayout: false,
    savedWindowLayout: [],
    calendarOpened: false,
    folderOpened: false,
    newsRead: false,
    newsVisible: false,
    news: [{ ...STAGE_TWO_DATA.news }],
    nextNewsTime: DAY_START,
    marketEffect: null,
    runRules: pickRunRules(),
    activeRules: [],
    policeCase: null,
    threatEvent: null,
    arrested: false,
    auction: createAuctionState(STAGE_TWO_DATA.auctionBox, 1, 1),
    inventory: [createStarterItem()],
    folder: [createFolderItem()],
    listings: [],
    activeListingId: null,
    buyerArrivalAt: null,
    buyerChat: null,
    buyerAttempts: 0,
    buyerSchedule: [],
    mallStock: createMallStock(),
    fakeItems: {},
    protectionCharges: 0,
    insuranceActive: false,
    cleanupShield: 0,
    archetypeScores: {},
    activeArchetype: null,
    archetypeHint: "",
    scheduledVisitors: createVisitorSchedule(),
    activeVisitor: null,
    visitorHistory: [],
    selectedItemId: null,
    selectedListingId: null,
    onsiteSearchItem: null,
    listingDraft: null,
    searchResult: null,
    keywordTipShown: false,
    activeShopTab: "inventory",
    lastMessage: "",
    lastNightSummary: null,
    lastTradeFeedback: null,
    dailyLedger: [],
    summaryOpen: false,
    overdueCount: 0,
    paymentNoticeOpen: false,
    paymentNoticeDay: 0,
    loanDefaulted: false,
    loanDefaultReason: "",
    loanTakenToday: false,
    troubleReductionUsed: false,
    troublePopupOpen: false,
    troubleReasons: []
  };
}

function normalizeState(parsed) {
  parsed.inventory = Array.isArray(parsed.inventory)
    ? parsed.inventory.map(normalizeItemData)
    : [];
  parsed.folder = Array.isArray(parsed.folder)
    ? parsed.folder.map(normalizeItemData)
    : [];
  parsed.listings = Array.isArray(parsed.listings)
    ? parsed.listings.map((listing) => {
        if (listing?.itemSnapshot) {
          listing.itemSnapshot = normalizeItemData(listing.itemSnapshot);
        }
        return listing;
      })
    : [];
  if (parsed.auction?.items) {
    parsed.auction.items = parsed.auction.items.map(normalizeItemData);
    if (parsed.auction.status === "onsite-preview") {
      parsed.auction.items = parsed.auction.items.map((item) => ({
        ...item,
        onsiteOffer:
          Number.isFinite(Number(item.onsiteOffer))
            ? Number(item.onsiteOffer)
            : calculateOnsiteOffer(item)
      }));
    }
  }
  if (parsed.onsiteSearchItem) {
    parsed.onsiteSearchItem = normalizeItemData(parsed.onsiteSearchItem);
  }
  parsed.guidePopupDismissedSteps = Array.isArray(
    parsed.guidePopupDismissedSteps
  )
    ? parsed.guidePopupDismissedSteps
    : [];
  parsed.preserveWindowLayout = Boolean(parsed.preserveWindowLayout);
  parsed.savedWindowLayout = Array.isArray(parsed.savedWindowLayout)
    ? parsed.savedWindowLayout
    : [];

  parsed.nextPayment ??= {
    amount: CONFIG.firstPayment,
    dueDay: CONFIG.paymentIntervalDays
  };
  parsed.nextPayment.amount = Number(parsed.nextPayment.amount) || CONFIG.firstPayment;
  parsed.nextPayment.dueDay =
    Number(parsed.nextPayment.dueDay) || CONFIG.paymentIntervalDays;
  parsed.overdueCount = Math.max(
    0,
    Number(parsed.overdueCount) || 0
  );
  if (
    parsed.day > parsed.nextPayment.dueDay &&
    parsed.overdueCount === 0
  ) {
    parsed.overdueCount = 1;
  }
  parsed.nextPayment.overdue = Boolean(
    parsed.nextPayment.overdue || parsed.overdueCount > 0
  );
  parsed.paymentNoticeDay = Number(parsed.paymentNoticeDay) || 0;
  parsed.paymentNoticeOpen = Boolean(
    parsed.paymentNoticeOpen ||
      (parsed.day >= parsed.nextPayment.dueDay &&
        !parsed.nextPayment.overdue &&
        parsed.paymentNoticeDay < parsed.day)
  );
  if (parsed.paymentNoticeOpen) {
    parsed.paymentNoticeDay = parsed.day;
  }
  parsed.loanDefaulted = Boolean(parsed.loanDefaulted);
  parsed.loanDefaultReason ??= "";
  parsed.arrested = Boolean(parsed.arrested);
  parsed.troubleReasons ??= [];
  parsed.dailyLedger ??= [];
  parsed.buyerSchedule ??= [];
  parsed.mallStock = Array.isArray(parsed.mallStock)
    ? parsed.mallStock
    : createMallStock();
  parsed.fakeItems =
    parsed.fakeItems && typeof parsed.fakeItems === "object"
      ? parsed.fakeItems
      : {};
  parsed.protectionCharges = Math.max(
    0,
    Number(parsed.protectionCharges) || 0
  );
  parsed.insuranceActive = Boolean(parsed.insuranceActive);
  parsed.cleanupShield = Math.max(
    0,
    Number(parsed.cleanupShield) || 0
  );
  parsed.archetypeScores =
    parsed.archetypeScores && typeof parsed.archetypeScores === "object"
      ? parsed.archetypeScores
      : {};
  parsed.activeArchetype ??= null;
  parsed.archetypeHint ??= "";
  parsed.scheduledVisitors = Array.isArray(parsed.scheduledVisitors)
    ? parsed.scheduledVisitors
    : createVisitorSchedule();
  parsed.activeVisitor ??= null;
  parsed.visitorHistory ??= [];
  parsed.buyerAttempts ??= 0;
  parsed.loanTakenToday ??= false;
  parsed.troubleReductionUsed ??= false;
  parsed.onsiteSearchItem ??= null;
  parsed.searchResult ??= null;
  parsed.keywordTipShown ??= false;
  parsed.listingDraft ??= null;
  if (parsed.listingDraft) parsed.listingDraft.fakeItemId ??= null;
  parsed.summaryOpen ??= false;
  parsed.troublePopupOpen ??= false;
  parsed.newsVisible ??= false;
  parsed.newsRead ??= false;
  parsed.news = Array.isArray(parsed.news)
    ? parsed.news.map((news) => ({
        ...news,
        duration: news?.duration ?? "今天有效"
      }))
    : [];
  parsed.activeShopTab ??= "inventory";
  parsed.universalTab ??= "search";

  if (
    parsed.selectedItemId &&
    ![
      ...parsed.inventory,
      ...parsed.folder,
      ...parsed.listings.map((listing) => listing.itemSnapshot)
    ].some((item) => item?.id === parsed.selectedItemId)
  ) {
    parsed.selectedItemId = null;
  }
  if (
    parsed.selectedListingId &&
    !parsed.listings.some(
      (listing) => listing.id === parsed.selectedListingId
    )
  ) {
    parsed.selectedListingId = null;
  }

  if (parsed.buyerChat) {
    normalizeBuyerChat(parsed.buyerChat, parsed);
  }
  return parsed;
}

function normalizeBuyerChat(chat, sourceState) {
  chat.history = Array.isArray(chat.history) ? chat.history : [];
  chat.trust = Number.isFinite(Number(chat.trust)) ? Number(chat.trust) : 50;
  chat.questionIndex = Math.max(0, Number(chat.questionIndex) || 0);
  chat.buyer = chat.buyer && typeof chat.buyer === "object" ? chat.buyer : {};
  chat.buyer.name ||= "匿名买家";
  chat.buyer.displayId ||= "访客-001";
  chat.buyer.avatar ||= "crane";
  chat.buyer.opening ||= "我看到了你上架的物品，想确认几个细节。";

  const listing = sourceState.listings.find(
    (candidate) => candidate.id === chat.listingId
  );
  const questions = selectBuyerQuestions(listing?.itemSnapshot);
  if (!Array.isArray(chat.buyer.questions) || !chat.buyer.questions.length) {
    chat.buyer.questions = questions;
  }
  chat.buyer.questions = chat.buyer.questions
    .filter((question) => question?.text && Array.isArray(question.replies))
    .map((question) => ({
      ...question,
      replies: question.replies.filter(
        (reply) => reply?.id && reply?.text
      )
    }))
    .filter((question) => question.replies.length > 0);
  if (!chat.buyer.questions.length) {
    chat.buyer.questions = questions;
  }
  chat.questionIndex = Math.min(
    chat.questionIndex,
    Math.max(0, chat.buyer.questions.length - 1)
  );
}

function createAuctionState(template, day, lotNumber) {
  return {
    templateId: template.id,
    day,
    lotNumber,
    maxLots: 2,
    status: "bidding",
    destination: template.destination,
    appearance: template.appearance,
    appearanceDescription: template.appearanceDescription,
    startingPrice: template.startingPrice,
    currentPrice: template.startingPrice,
    highBidder: template.competitors[0].id,
    lastAction: "start",
    competitors: template.competitors.map((rival) => ({
      ...rival,
      active: true
    })),
    items: template.items.map((item) => initializeItem(item)),
    result: null
  };
}

function createStarterItem() {
  const templates = STAGE_TWO_DATA.starterItems;
  const selected = templates[Math.floor(Math.random() * templates.length)];
  return {
    ...initializeItem(selected),
    status: "unviewed",
    searched: false,
    unlockedTags: []
  };
}

function createFolderItem() {
  const templates = STAGE_TWO_DATA.folderItemPool;
  const selected = templates[Math.floor(Math.random() * templates.length)];
  return initializeItem(selected);
}

function initializeItem(item) {
  const initialized = {
    ...item,
    code: item.code ?? makeItemCode(item),
    source: item.source ?? getItemProvenance(item),
    discoveredCode: false,
    discoveredSource: false
  };
  initialized.facts = generateItemFacts(initialized);
  if (
    !initialized.effect &&
    !["special", "collection"].includes(initialized.category) &&
    Math.random() < 0.35
  ) {
    const effect =
      STAGE_TWO_DATA.itemEffectPool[
        Math.floor(Math.random() * STAGE_TWO_DATA.itemEffectPool.length)
      ];
    initialized.effect = effect.effect;
    initialized.effectKey = effect.effectKey;
  }
  return initialized;
}

function generateItemFacts(item) {
  const existing = Array.isArray(item.facts) ? item.facts : [];
  const keywordFacts = (item.keywords ?? []).map((keyword, index) => {
    const kind = getFactKind(keyword, index);
    const previous = existing.find(
      (fact) => fact?.keyword === keyword && fact?.kind === kind
    );
    return {
      id: previous?.id ?? `${item.id}_fact_${index + 1}`,
      keyword,
      kind,
      label: previous?.label ?? getFactLabel(kind),
      value:
        previous?.value ?? getFactValue(item, keyword, kind),
      discovered: previous?.discovered === true
    };
  });
  const secondaryFacts = [
    {
      id: `${item.id}_fact_condition`,
      kind: "condition",
      label: "物品状态",
      value:
        item.baseValue > 500 ? "可以正常使用" : "已经无法使用"
    },
    {
      id: `${item.id}_fact_record`,
      kind: "record",
      label: "公开交易记录",
      value: Math.random() < 0.45 ? "有" : "没有"
    },
    {
      id: `${item.id}_fact_packaging`,
      kind: "packaging",
      label: "包装与托运标签",
      value: Math.random() < 0.55 ? "包装还在" : "包装丢失"
    },
    {
      id: `${item.id}_fact_owner`,
      kind: "owner",
      label: "上一任主人",
      value: Math.random() < 0.4 ? "身份明确" : "身份不明确"
    },
    {
      id: `${item.id}_fact_urgency`,
      kind: "urgency",
      label: "出售紧迫程度",
      value:
        Math.random() < 0.5 ? "需要尽快出手" : "可以长期等待"
    }
  ].map((fact) => {
    const previous = existing.find(
      (candidate) =>
        candidate?.id === fact.id || candidate?.kind === fact.kind
    );
    return {
      ...fact,
      label: previous?.label ?? fact.label,
      value: previous?.value ?? fact.value,
      discovered: previous?.discovered === true
    };
  });
  return [...keywordFacts, ...secondaryFacts];
}

function normalizeItemData(item) {
  if (!item || typeof item !== "object") return item;
  if (item.type === "box") {
    item.items = Array.isArray(item.items)
      ? item.items.map(normalizeItemData)
      : [];
    return item;
  }
  item.keywords = Array.isArray(item.keywords)
    ? item.keywords.filter(Boolean).map(String)
    : [];
  item.code = item.code || makeItemCode(item);
  item.source = item.source || getItemProvenance(item);
  item.facts = generateItemFacts(item);
  item.unlockedTags = Array.isArray(item.unlockedTags)
    ? item.unlockedTags.filter(Boolean)
    : [];
  item.searched = item.searched === true;
  item.discoveredCode =
    item.discoveredCode === true ||
    item.facts.some((fact) => fact.kind === "code" && fact.discovered);
  item.discoveredSource =
    item.discoveredSource === true ||
    item.facts.some((fact) => fact.kind === "source" && fact.discovered);
  return item;
}

function propagateTypeKnowledge(sourceItem, keyword, sourceFact) {
  if (!sourceFact || sourceFact.kind === "code") return;
  const typeKey = sourceItem.templateId ?? sourceItem.name;
  if (!typeKey) return;
  getAllOwnedItems().forEach((candidate) => {
    if (candidate === sourceItem) return;
    normalizeItemData(candidate);
    const typeCandidateKey = candidate.templateId ?? candidate.name;
    if (typeCandidateKey !== typeKey) return;
    const matchingFact = candidate.facts.find(
      (fact) =>
        fact.kind === sourceFact.kind &&
        fact.keyword === keyword
    );
    if (!matchingFact) return;
    matchingFact.discovered = true;
    matchingFact.value = sourceFact.value;
    if (matchingFact.kind === "source") {
      candidate.discoveredSource = true;
    }
    candidate.unlockedTags = unique([
      ...(candidate.unlockedTags ?? []),
      ...(sourceItem.unlockedTags ?? [])
    ]);
  });
}

function getAllOwnedItems() {
  const items = [
    ...state.inventory,
    ...state.folder,
    ...(state.auction?.items ?? []),
    ...state.listings.map((listing) => listing.itemSnapshot)
  ];
  const boxItems = state.inventory.flatMap((item) =>
    item.type === "box" && Array.isArray(item.items) ? item.items : []
  );
  return [...items, ...boxItems].filter(Boolean);
}

function getFactLabel(kind) {
  if (kind === "code") return "具体编号";
  if (kind === "name") return "磨损姓名";
  if (kind === "source") return "物品来源";
  return "物品特征";
}

function getFactKind(keyword, index) {
  if (/编号|批次|刻度|档案|单据/.test(keyword)) return "code";
  if (/姓名|刻字|签名/.test(keyword)) return "name";
  if (/来源|渠道|标记|印章/.test(keyword)) return "source";
  return index === 0 ? "feature" : "source";
}

function getFactValue(item, keyword, kind) {
  if (kind === "code") return item.code;
  if (kind === "source") return getItemProvenance(item);
  if (kind === "name") {
    const initial = keyword.match(/\b[A-Z]\b/)?.[0];
    const namesByInitial = {
      L: ["L. M.", "L. K.", "L. S."],
      A: ["A. K.", "A. R.", "A. W."],
      R: ["R. S.", "R. M.", "R. L."],
      J: ["J. W.", "J. K.", "J. M."],
      M: ["M. D.", "M. R.", "M. S."]
    };
    const pool =
      namesByInitial[initial] ??
      Object.values(namesByInitial).flat();
    const familyKey = item.templateId ?? item.name ?? keyword;
    return pool[hashString(familyKey) % pool.length];
  }
  if (kind === "feature") return `${keyword}`;
  return keyword;
}

function hashString(value) {
  let hash = 0;
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function makeItemCode(item) {
  const prefix =
    item.name?.match(/[A-Za-z]/)?.[0]?.toUpperCase() ??
    ["R", "K", "M", "X", "L"][Math.floor(Math.random() * 5)];
  return `${prefix}-${Math.floor(10000 + Math.random() * 89999)}`;
}

function makeDistinctCode(excluded) {
  let code = makeItemCode({});
  while (excluded.includes(code)) {
    code = makeItemCode({});
  }
  return code;
}

function pickDailyAuctionBox() {
  const boxes = STAGE_TWO_DATA.dailyAuctionBoxes;
  return boxes[Math.floor(Math.random() * boxes.length)];
}

function pickBuyerProfile() {
  const buyers = STAGE_TWO_DATA.buyerProfiles;
  return buyers[Math.floor(Math.random() * buyers.length)];
}

function pickRunRules() {
  return shuffle([...STAGE_TWO_DATA.runRules])
    .slice(0, 2)
    .map((rule) => ({
      ...rule,
      startDay: 2 + Math.floor(Math.random() * 4)
    }));
}

function refreshActiveRules() {
  state.activeRules = state.runRules
    .filter((rule) => rule.startDay <= state.day)
    .map((rule) => rule.id);
}

function selectBuyerQuestions(item) {
  normalizeItemData(item);
  const informationFacts = shuffle(
    [...(item?.facts ?? [])].filter((fact) =>
      ["code", "name", "source", "feature"].includes(fact.kind)
    )
  ).slice(0, 2);
  const templates = STAGE_TWO_DATA.buyerQuestionTemplates;
  const factualQuestions = informationFacts.map((fact) => {
    const template = templates[fact.kind] ?? templates.proof;
    return {
      id: fact.id,
      kind: fact.kind,
      text: fact.discovered
        ? template.text
        : `${template.text} 交易前需要你给出准确答案。`,
      replies: buildRepliesForFact(fact)
    };
  });
  const generalPool = STAGE_TWO_DATA.buyerQuestionPool.filter(
    (question) =>
      !["code", "source", "proof"].includes(question.kind)
  );
  const generalQuestions = shuffle([...generalPool]).slice(
    0,
    3 - factualQuestions.length
  );
  return [...factualQuestions, ...generalQuestions];
}

function buildRepliesForFact(fact) {
  if (!fact.discovered) {
    return shuffle([
      {
        id: "not_researched",
        text: "我没有在万物通核实过这项信息。",
        trust: -14
      },
      {
        id: "guess",
        text: "标签大致是这样，但我不能确认。",
        trust: -20
      },
      {
        id: "overclaim",
        text: "肯定没问题，不用再查。",
        trust: -26
      }
    ]);
  }
  const correct = String(fact.value ?? "无法确认");
  if (["record", "condition", "packaging", "owner", "urgency"].includes(fact.kind)) {
    const oppositeMap = {
      record: correct === "有" ? "没有" : "有",
      condition:
        correct === "可以正常使用" ? "已经无法使用" : "可以正常使用",
      packaging:
        correct === "包装还在" ? "包装丢失" : "包装还在",
      owner:
        correct === "身份明确" ? "身份不明确" : "身份明确",
      urgency:
        correct === "需要尽快出手"
          ? "可以长期等待"
          : "需要尽快出手"
    };
    return shuffle([
      { id: "correct", text: correct, trust: 25 },
      { id: "wrong", text: oppositeMap[fact.kind], trust: -20 }
    ]);
  }

  let decoys;
  if (fact.kind === "code") {
    decoys = [makeDistinctCode([correct]), makeDistinctCode([correct])];
    while (decoys[1] === decoys[0]) {
      decoys[1] = makeDistinctCode([correct, decoys[0]]);
    }
  } else if (fact.kind === "name") {
    decoys = ["A. R.", "M. K.", "T. S."].filter(
      (name) => name !== correct
    ).slice(0, 2);
  } else if (fact.kind === "source") {
    decoys = [
      "来源完全不明",
      "某位匿名收藏家赠送"
    ].filter((source) => source !== correct);
  } else if (fact.kind === "feature") {
    decoys = ["没有明显标记", "标记已经完全磨损"].filter(
      (value) => value !== correct
    );
  } else {
    decoys = ["无法确认", "没有相关记录"];
  }

  return shuffle([
    { id: "correct", text: correct, trust: 30 },
    { id: "wrong_1", text: decoys[0], trust: -25 },
    { id: "wrong_2", text: decoys[1] ?? "不确定", trust: -25 }
  ]);
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function createAuctionBoxEntry(auction) {
  const source = auction?.items?.length
    ? auction.items
    : STAGE_TWO_DATA.auctionBox.items;
  return {
    id: `box_${Date.now().toString(36)}`,
    type: "box",
    name: "无人认领行李箱",
    destination: auction?.destination ?? STAGE_TWO_DATA.auctionBox.destination,
    appearance: auction?.appearance ?? STAGE_TWO_DATA.auctionBox.appearance,
    opened: false,
    items: source.map((item) => JSON.parse(JSON.stringify(item)))
  };
}

function findCounterBid(competitors, currentBid) {
  return competitors.find(
    (rival) =>
      rival.active &&
      currentBid <= rival.budget &&
      Math.random() < rival.aggression
  );
}

function applyForcedSleepPenalty() {
  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    recordTrouble(1, "熬夜导致风险增加");
  }
  if (roll === 1) {
    state.newsRead = true;
    state.newsVisible = false;
    state.lastMessage = "你睡得太晚，错过了一条重要新闻。";
  }
  if (roll === 2 && state.buyerChat) {
    state.buyerChat.status = "missed";
  }
}

function unique(values) {
  return [...new Set(values)];
}

function roundToTen(value) {
  return Math.round(value / 10) * 10;
}

function roundBid(value) {
  return Math.max(10, Math.round(value / 10) * 10);
}

function createMallStock() {
  const groups = ["service", "collection", "fake"];
  return groups.flatMap((type) =>
    shuffle(
      STAGE_TWO_DATA.mallProducts.filter(
        (product) => product.type === type
      )
    )
      .slice(0, 2)
      .map((product) => product.id)
  );
}

function createVisitorSchedule() {
  const count = Math.random() < 0.55 ? 1 : 2;
  return shuffle([...STAGE_TWO_DATA.visitorTemplates])
    .slice(0, count)
    .map((template, index) => {
      const [minDay, maxDay] = template.dayRange;
      const arriveDay =
        minDay + Math.floor(Math.random() * (maxDay - minDay + 1));
      return {
        id: `visitor_schedule_${Date.now().toString(36)}_${index}`,
        templateId: template.id,
        name: template.name,
        windowStart: minDay,
        windowEnd: maxDay,
        arriveDay,
        status: "scheduled"
      };
    });
}

function processVisitorArrivals() {
  if (state.activeVisitor) return "";
  const schedule = state.scheduledVisitors.find(
    (entry) => entry.status === "scheduled" && state.day >= entry.arriveDay
  );
  if (!schedule) return "";
  const template = STAGE_TWO_DATA.visitorTemplates.find(
    (candidate) => candidate.id === schedule.templateId
  );
  if (!template) return "";
  schedule.status = "arrived";
  state.activeVisitor = {
    ...template,
    id: `visitor_event_${Date.now().toString(36)}`,
    scheduleId: schedule.id,
    arriveDay: schedule.arriveDay
  };
  return `${template.name}今天会到访，请提前处理物品和交易。`;
}

function applyVisitorChoice(visitor, action) {
  const accepted = action === "accept";
  if (visitor.type === "collector") {
    if (!accepted) {
      state.reputation = Math.max(0, state.reputation - 1);
      return "你谢绝了收藏家，对方没有留下联系方式。";
    }
    const activeEffects = new Set(
      state.folder.map((item) => item.effectKey).filter(Boolean)
    ).size;
    const combos = getActiveCollectionCombos().length;
    const reward = 500 + activeEffects * 260 + combos * 600;
    state.cash += reward;
    state.reputation += combos > 0 ? 4 : 2;
    recordActivity("收藏家拜访", reward);
    return `收藏家认可了你的整理方式，支付了 ${formatCurrency(reward)}。`;
  }

  if (visitor.type === "auditor") {
    const riskyListings = state.listings.filter(
      (listing) => listing.fakeItemId && listing.status === "active"
    );
    if (!accepted) {
      state.reputation = Math.max(0, state.reputation - 6);
      recordTrouble(2, "拒绝平台审核");
      return "你拖延了审核，平台降低了你的信誉。";
    }
    if (riskyListings.length > 0) {
      const fine = Math.min(state.cash, 300 + riskyListings.length * 250);
      state.cash -= fine;
      state.reputation = Math.max(0, state.reputation - 4);
      recordActivity("平台审核罚款", -fine);
      recordTrouble(1, "平台审核发现伪造商品");
      recordArchetypeProgress("risk", 2);
      return `审核员识破了伪造商品，罚款 ${formatCurrency(fine)}。`;
    }
    state.reputation += 4;
    return "平台审核通过，信誉提高。";
  }

  if (visitor.type === "appraiser") {
    if (!accepted) return "鉴定师离开了，没有物品获得补充资料。";
    const item = state.inventory.find(
      (candidate) => candidate.type !== "box"
    );
    if (!item) return "库存里没有可供鉴定的物品。";
    normalizeItemData(item);
    item.facts.forEach((fact) => {
      fact.discovered = true;
    });
    item.discoveredCode = true;
    item.discoveredSource = true;
    item.baseValue = roundToTen(item.baseValue * 1.12);
    item.tagConfidence = "high";
    state.reputation += 2;
    return `${item.name}已经完成鉴定，完整资料得到确认。`;
  }

  if (visitor.type === "investigator") {
    if (!accepted) {
      recordTrouble(3, "拒绝调查员检查");
      recordArchetypeProgress("risk", 2);
      return "你拒绝检查，调查压力迅速上升。";
    }
    removeAllSpecialItems();
    state.trouble = Math.max(0, state.trouble - 2);
    state.reputation += 3;
    recordArchetypeProgress("compliant");
    return "你配合了检查，风险物品被清理，信誉提高。";
  }

  if (visitor.type === "wholesaler") {
    if (!accepted) return "你保留了库存，收购商离开了。";
    const items = state.inventory.filter((item) =>
      ["junk", "common"].includes(item.category)
    );
    if (!items.length) return "库存里没有收购商愿意接手的物品。";
    const total = items.reduce(
      (sum, item) => sum + Math.round(item.baseValue * 0.78),
      0
    );
    const ids = new Set(items.map((item) => item.id));
    state.inventory = state.inventory.filter(
      (item) => !ids.has(item.id)
    );
    state.cash += total;
    recordActivity("收购商批量收购", total);
    recordArchetypeProgress("quick_cash");
    return `收购商买走了 ${items.length} 件物品，共支付 ${formatCurrency(total)}。`;
  }

  if (visitor.type === "mystery_buyer") {
    if (!accepted) return "你拒绝了没有留下记录的交易。";
    const special = [...state.inventory, ...state.folder]
      .filter((item) => item.category === "special")
      .sort((a, b) => b.baseValue - a.baseValue)[0];
    if (!special) {
      state.reputation += 1;
      return "神秘买家没有找到特殊物品，只留下了一张空名片。";
    }
    const price = roundToTen(special.baseValue * 1.5);
    state.cash += price;
    removeSpecialItemEverywhere(special.id);
    recordActivity("神秘买家秘密交易", price);
    recordTrouble(4, "向神秘买家出售特殊物品");
    recordArchetypeProgress("risk", 3);
    return `特殊物品以 ${formatCurrency(price)} 秘密成交，但麻烦也增加了。`;
  }

  return "人物事件已经处理。";
}

function resolveTradeObstruction(chat, listing) {
  if (listing.fakeItemId && !listing.fakeRiskCleared) {
    if (state.cleanupShield > 0) {
      state.cleanupShield -= 1;
      listing.fakeRiskCleared = true;
      state.lastMessage = "数据清理服务掩盖了这一次伪造痕迹。";
      return null;
    }
    const strictPenalty = hasActiveRule("strict_review") ? 0.14 : 0;
    const fakeChance =
      (listing.fakeExposureChance ?? 0) +
      strictPenalty -
      (hasArchetypeEffect("archetype_negotiation") ? 0.04 : 0);
    if (Math.random() < Math.max(0.08, fakeChance)) {
      state.reputation = Math.max(0, state.reputation - 6);
      recordTrouble(3, "伪造交易被买家识破");
      recordArchetypeProgress("risk", 2);
      return failListingTrade(
        listing,
        "伪造被识破",
        "买家发现商品资料不一致，交易终止，信誉和麻烦都受到影响。",
        true
      );
    }
  }

  const effectivePrice = Math.max(
    10,
    listing.price - (Number(chat.priceConcession) || 0)
  );
  const suggestedMax = Math.max(1, listing.priceRange?.[1] ?? 1);
  const priceRatio = effectivePrice / suggestedMax;
  const priceFailureChance =
    priceRatio > 1 ? Math.min(0.72, (priceRatio - 1) * 0.5) : 0;
  const tagFailureChance =
    listing.confidence === "low"
      ? hasActiveRule("strict_review")
        ? 0.28
        : 0.18
      : 0;
  const combinedRisk =
    1 - (1 - priceFailureChance) * (1 - tagFailureChance);
  if (combinedRisk > 0 && Math.random() < combinedRisk) {
    state.reputation = Math.max(0, state.reputation - 2);
    return failListingTrade(
      listing,
      "买家放弃购买",
      listing.confidence === "low" && priceRatio > 1
        ? "买家认为标签未经核实，而且报价明显高于参考区间，因此终止了交易。"
        : listing.confidence === "low"
          ? "买家无法确认标签信息，最终放弃了交易。"
          : "买家认为报价明显高于参考区间，最终放弃了交易。"
    );
  }

  if (chat.discountRefused && chat.buyer?.wantsDiscount) {
    const failureChance =
      chat.trust >= 70 ? 0.24 : chat.trust >= 35 ? 0.46 : 0.68;
    if (Math.random() < failureChance) {
      state.reputation = Math.max(0, state.reputation - 1);
      return failListingTrade(
        listing,
        "买家取消交易",
        "买家希望降价，但你坚持原价，对方最终放弃了交易。"
      );
    }
  }
  return null;
}

function failListingTrade(listing, title, text, forceFailed = false) {
  if (!forceFailed && state.buyerAttempts < 3) {
    listing.status = "active";
    state.buyerSchedule.push({
      id: `buyerschedule_${Date.now().toString(36)}`,
      time: state.timeMinutes + 20,
      listingId: listing.id
    });
  } else {
    listing.status = "failed";
    restoreListingItem(listing);
  }
  return {
    id: `trade_${Date.now().toString(36)}`,
    success: false,
    amount: 0,
    title,
    text
  };
}

function applyResaleModifiers(value) {
  let result = value;
  if (hasCollectionEffect("resale_bonus")) result *= 1.08;
  if (hasCollectionEffect("combo_quick_cash")) result *= 1.08;
  if (hasArchetypeEffect("archetype_quick_cash")) result *= 1.05;
  return Math.round(result);
}

function applyBuyerPriceConcession(value, chat) {
  return Math.max(
    10,
    Math.round(value - (Number(chat?.priceConcession) || 0))
  );
}

function getTroubleHandlingCost() {
  let cost = 400;
  if (hasCollectionEffect("trouble_discount")) cost -= 100;
  if (hasCollectionEffect("combo_clean_books")) cost -= 50;
  if (hasArchetypeEffect("archetype_compliant")) cost -= 50;
  return Math.max(150, cost);
}

function getActiveCollectionCombos() {
  const ownedTemplates = new Set(
    state.folder.map((item) => item.templateId ?? item.id)
  );
  return STAGE_TWO_DATA.collectionCombos.filter((combo) =>
    combo.itemIds.every((itemId) => ownedTemplates.has(itemId))
  );
}

function hasArchetypeEffect(effectKey) {
  if (!state.activeArchetype) return false;
  const archetype = STAGE_TWO_DATA.hiddenArchetypes.find(
    (candidate) => candidate.id === state.activeArchetype
  );
  return archetype?.effectKey === effectKey;
}

function recordArchetypeProgress(archetypeId, amount = 1) {
  state.archetypeScores ??= {};
  state.archetypeScores[archetypeId] =
    (state.archetypeScores[archetypeId] ?? 0) + amount;
  const eligible = STAGE_TWO_DATA.hiddenArchetypes
    .filter(
      (archetype) =>
        (state.archetypeScores[archetype.id] ?? 0) >= archetype.threshold
    )
    .sort(
      (left, right) =>
        (state.archetypeScores[right.id] ?? 0) -
        (state.archetypeScores[left.id] ?? 0)
    );
  if (!eligible.length) return;
  const next = eligible[0];
  if (state.activeArchetype !== next.id) {
    state.activeArchetype = next.id;
  }
  state.archetypeHint = next.hint;
}

function calculateOnsiteOffer(item) {
  if (item?.category === "special") return 0;
  const basePrice =
    Number(item.onsitePrice) > 0
      ? Number(item.onsitePrice)
      : Number(item.baseValue) * 0.65;
  const ranges = {
    junk: [0.35, 0.7],
    common: [0.55, 0.95],
    luxury: [0.72, 1.32]
  };
  const [min, max] = ranges[item.category] ?? ranges.common;
  const multiplier = min + Math.random() * (max - min);
  return Math.max(10, roundToTen(basePrice * multiplier));
}

function getOnsiteOffer(item) {
  return Math.max(
    0,
    Number(item?.onsiteOffer) ||
      Number(item?.onsitePrice) ||
      0
  );
}

function calculateOnsiteSaleTotal(auction) {
  let total = (auction?.items ?? []).reduce(
    (sum, item) => sum + getOnsiteOffer(item),
    0
  );
  if (hasActiveRule("cash_shortage")) total = Math.round(total * 1.1);
  if (hasCollectionEffect("combo_quick_cash")) {
    total = Math.round(total * 1.08);
  }
  if (hasArchetypeEffect("archetype_quick_cash")) {
    total = Math.round(total * 1.05);
  }
  if (hasActiveRule("collector_heat")) {
    const luxuryTotal = auction.items
      .filter((item) => item.category === "luxury")
      .reduce((sum, item) => sum + getOnsiteOffer(item), 0);
    total += Math.round(luxuryTotal * 0.15);
  }
  if (
    auction.items.some(
      (item) => item.effectKey === "onsite_bonus_global"
    )
  ) {
    total = Math.round(total * 1.1);
  }
  return total;
}

function recordActivity(label, amount = 0) {
  state.dailyLedger.push({
    id: `ledger_${Date.now().toString(36)}_${state.dailyLedger.length}`,
    label,
    amount
  });
}

function recordTrouble(amount, reason) {
  const before = state.trouble;
  state.trouble = Math.min(CONFIG.maxTrouble, state.trouble + amount);
  state.troubleReasons.unshift({
    id: `trouble_${Date.now().toString(36)}_${state.troubleReasons.length}`,
    label: reason,
    amount
  });
  state.troubleReasons = state.troubleReasons.slice(0, 6);
  if (before < 5 && state.trouble >= 5) {
    state.troublePopupOpen = true;
  }
}

function hasActiveRule(ruleId) {
  return state.activeRules?.includes(ruleId);
}

function applySaleModifiers(value, item) {
  let result = value;
  if (item?.effectKey === "sale_bonus") result *= 1.1;
  if (
    item?.effectKey === "sale_bonus_global" ||
    hasCollectionEffect("sale_bonus_global")
  ) {
    result *= 1.05;
  }
  if (hasActiveRule("collector_heat") && item?.category === "luxury") {
    result *= 1.15;
  }
  if (hasActiveRule("counterfeit_flood") && item?.category === "luxury") {
    result *= 0.9;
  }
  if (
    item?.category === "special" &&
    hasArchetypeEffect("archetype_risk")
  ) {
    result *= 1.18;
  }
  if (hasCollectionEffect("combo_buyer_network")) result *= 1.03;
  const effect = state.marketEffect;
  if (
    effect &&
    (effect.category === "all" || effect.category === item?.category)
  ) {
    result *= effect.multiplier;
  }
  return Math.round(result);
}

function calculateNetSale(value, item) {
  let fee =
    item?.effectKey === "fee_reduction" ||
    hasCollectionEffect("fee_reduction")
      ? 0.95
      : 0.9;
  if (hasCollectionEffect("combo_clean_books")) fee -= 0.03;
  if (hasArchetypeEffect("archetype_negotiation")) fee -= 0.02;
  fee = Math.max(0.82, fee);
  return Math.round(value * fee);
}

function hasCollectionEffect(effectKey) {
  if (state.folder.some((item) => item.effectKey === effectKey)) {
    return true;
  }
  return getActiveCollectionCombos().some(
    (combo) => combo.effectKey === effectKey
  );
}

function getItemProvenance(item) {
  if (item.category === "luxury") return "私人来源，缺少完整购买记录";
  if (item.category === "junk") return "来源不明的生活杂物";
  return "无人认领行李中的普通物品";
}

function buildSearchEvidence(item, keyword, fact) {
  const revealedValue = fact?.value ?? item.source ?? getItemProvenance(item);
  const low = Math.round(item.baseValue * 0.7);
  const high = Math.round(item.baseValue * 1.4);
  const categoryName =
    item.category === "luxury"
      ? "奢侈品"
      : item.category === "junk"
        ? "普通旧货"
        : item.category === "special"
          ? "特殊物品"
          : "普通物品";
  const templates = [
    {
      type: "market_rise",
      label: "相关新闻",
      title: `${categoryName}需求回暖`,
      body: `最近本地市场对带有“${keyword}”的${categoryName}需求上升，尤其是记录中出现“${revealedValue}”的版本。买家愿意用高于平时的价格收购状态完整的物品。`,
      highlight: revealedValue,
      effect: `在线售价 +20%`,
      tags: ["收藏级", "私人来源", revealedValue],
      duration: "持续 2 天"
    },
    {
      type: "inspection",
      label: "相关新闻",
      title: "检查加强",
      body: `平台和警方正在检查与“${keyword}”有关的物品。来源不明或标签夸大的商品更容易被举报，记录中出现了“${revealedValue}”。`,
      highlight: revealedValue,
      effect: "违禁品风险提高",
      tags: ["真实标签", "保留来源依据"],
      duration: "持续 3 天"
    },
    {
      type: "market_crash",
      label: "相关新闻",
      title: "旧货市场饱和",
      body: `大量同类物品涌入市场，与“${keyword}”有关的在线报价被压低。只有带明确编号或来源的物品还能维持价格，档案中显示“${revealedValue}”。`,
      highlight: revealedValue,
      effect: "普通同类售价 -15%",
      tags: ["唯一编号", "官方认证", revealedValue],
      duration: "持续 2 天"
    },
    {
      type: "buyer_interest",
      label: "相关新闻",
      title: "有买家正在寻找相关物品",
      body: `一名收藏买家正在寻找带有“${keyword}”的物品。此人出价较高，但问题很多，尤其在意来源和编号。他提到了“${revealedValue}”。`,
      highlight: revealedValue,
      effect: "高价值买家出现率提高",
      tags: ["准备物品编号", "准备来源说明"],
      duration: "剩余 3 天"
    },
    {
      type: "similar_item",
      label: "同类物品",
      title: "找到一件状态接近的同类物品",
      body: `同类物品页面显示，一件带有“${revealedValue}”的物品最终以接近 ${formatCurrency(
        high
      )} 的价格成交。卖家特别强调编号和来源必须写清楚。`,
      highlight: revealedValue,
      effect: `参考价格 ${formatCurrency(low)} - ${formatCurrency(high)}`,
      tags: ["同类成交", "编号清晰"],
      duration: "记录有效"
    },
    {
      type: "help_post",
      label: "求助帖",
      title: "有人发帖询问这件物品的来历",
      body: `求助帖中有人询问“${keyword}”的含义。回复里提到“${revealedValue}”，并提醒买家交易前确认该信息。发帖人愿意提供少量线索费。`,
      highlight: revealedValue,
      effect: "可能解锁隐藏买家",
      tags: ["回应求助", "提供真实来源"],
      duration: "帖子仍可见"
    }
  ];
  const primary = templates[Math.floor(Math.random() * templates.length)];
  const secondaryPool = [
    {
      type: "buyer_demand",
      label: "买家需求",
      title: "一名买家正在寻找相关物品",
      body: `买家明确要求卖家提供${fact?.label ?? "准确信息"}。如果回复内容不能与档案中的“${revealedValue}”对应，交易可能被终止。`,
      highlight: revealedValue,
      effect: "准确回答可提高信任",
      tags: ["准确编号", "真实来源"],
      duration: "剩余 2 天"
    },
    {
      type: "help_post",
      label: "求助帖",
      title: "有人询问这件物品的具体记录",
      body: `求助帖中有人询问物品的历史信息，并特别提到“${revealedValue}”。发帖人愿意为准确回答提供小额线索费。`,
      highlight: revealedValue,
      effect: "可能解锁隐藏买家",
      tags: ["回应求助", "保留记录"],
      duration: "帖子仍可见"
    },
    {
      type: "archive_note",
      label: "同类物品",
      title: "旧档案中出现了一条关联记录",
      body: `一份同类物品记录显示，卖家在交易时主动说明了“${revealedValue}”，因此获得了更高报价。`,
      highlight: revealedValue,
      effect: "来源完整时价格提高",
      tags: ["来源完整", "记录一致"],
      duration: "长期有效"
    }
  ];
  const evidenceCount =
    item.baseValue < 260
      ? 1
      : item.baseValue < 700
        ? Math.random() < 0.5
          ? 1
          : 2
        : 2;
  if (evidenceCount === 1) return [primary];
  return [
    primary,
    secondaryPool[Math.floor(Math.random() * secondaryPool.length)]
  ];
}

function processPoliceDeadline() {
  const policeCase = state.policeCase;
  if (!policeCase || state.day < policeCase.deadlineDay) return "没有新的调查进展。";

  if (policeCase.stage === 1) {
    let fine = Math.min(state.cash, 1500);
    if (
      state.insuranceActive ||
      hasCollectionEffect("insurance_reduction")
    ) {
      fine = Math.round(fine * 0.5);
      state.insuranceActive = false;
    }
    state.cash -= fine;
    removeAllSpecialItems();
    recordActivity("警察查扣与罚款", -fine);
    recordTrouble(1, "未及时处理警察调查");
    state.policeCase = {
      stage: 2,
      deadlineDay: state.day + 1,
      open: true
    };
    return `警察完成查扣并罚款 ${formatCurrency(fine)}。`;
  }

  if (policeCase.stage === 2) {
    state.policeCase = {
      stage: 3,
      deadlineDay: state.day,
      open: true
    };
    state.arrested = true;
    return "账户已被冻结。";
  }

  return "案件已经进入冻结阶段。";
}

function removeAllSpecialItems() {
  const removedAuctionItemCount = state.auction?.items?.filter(
    (item) => item?.category === "special"
  ).length ?? 0;
  const specialIds = new Set(
    [...state.inventory, ...state.folder]
      .filter((item) => item?.category === "special")
      .map((item) => item.id)
  );
  const removedListingIds = new Set(
    state.listings
      .filter(
        (listing) =>
          listing?.itemSnapshot?.category === "special" ||
          specialIds.has(listing?.itemId)
      )
      .map((listing) => listing.id)
  );

  state.inventory = state.inventory.filter(
    (item) => item?.category !== "special"
  );
  state.folder = state.folder.filter(
    (item) => item?.category !== "special"
  );
  state.listings = state.listings.filter(
    (listing) => !removedListingIds.has(listing.id)
  );
  if (Array.isArray(state.auction?.items)) {
    state.auction.items = state.auction.items.filter(
      (item) => item?.category !== "special"
    );
    if (
      removedAuctionItemCount > 0 &&
      state.auction.status === "onsite-preview" &&
      state.auction.items.length === 0
    ) {
      state.auction.status = "resolved";
      state.auction.result = {
        type: "reported",
        title: "违禁物品已经回收",
        detail: "警方带走了现场开出的相关物品。"
      };
    }
  }
  state.buyerSchedule = (state.buyerSchedule ?? []).filter(
    (entry) => !removedListingIds.has(entry.listingId)
  );
  if (
    state.buyerChat &&
    removedListingIds.has(state.buyerChat.listingId)
  ) {
    state.buyerChat = null;
    state.activeListingId = null;
    state.buyerArrivalAt = null;
  }
  if (state.onsiteSearchItem?.category === "special") {
    state.onsiteSearchItem = null;
  }
}

function removeSpecialItemEverywhere(itemId) {
  const removedListingIds = new Set(
    state.listings
      .filter(
        (listing) =>
          listing.itemId === itemId ||
          listing.itemSnapshot?.id === itemId
      )
      .map((listing) => listing.id)
  );
  state.inventory = state.inventory.filter((item) => item.id !== itemId);
  state.folder = state.folder.filter((item) => item.id !== itemId);
  state.listings = state.listings.filter(
    (listing) => !removedListingIds.has(listing.id)
  );
  if (Array.isArray(state.auction?.items)) {
    state.auction.items = state.auction.items.filter(
      (item) => item.id !== itemId
    );
    if (
      state.auction.status === "onsite-preview" &&
      state.auction.items.length === 0
    ) {
      state.auction.status = "resolved";
      state.auction.result = {
        type: "reported",
        title: "违禁物品已经回收",
        detail: "警方带走了现场开出的相关物品。"
      };
    }
  }
  state.buyerSchedule = (state.buyerSchedule ?? []).filter(
    (entry) => !removedListingIds.has(entry.listingId)
  );
  if (
    state.buyerChat &&
    removedListingIds.has(state.buyerChat.listingId)
  ) {
    state.buyerChat = null;
    state.activeListingId = null;
    state.buyerArrivalAt = null;
  }
  if (state.selectedItemId === itemId) state.selectedItemId = null;
  if (state.onsiteSearchItem?.id === itemId) state.onsiteSearchItem = null;
}

function isLoanDue() {
  return Boolean(
    state.nextPayment &&
      state.day >= state.nextPayment.dueDay
  );
}

function completeLoanPayment() {
  const paidAmount = state.nextPayment.amount;
  state.cash -= paidAmount;
  recordActivity("偿还贷款", -paidAmount);
  state.nextPayment = {
    amount: paidAmount + 500,
    dueDay: state.nextPayment.dueDay + CONFIG.paymentIntervalDays,
    overdue: false
  };
  state.overdueCount = 0;
  state.paymentNoticeOpen = false;
  state.paymentNoticeDay = state.day;
}

function settleLoanAtDayEnd() {
  if (!isLoanDue()) return "尚未到还款日。";
  if (state.cash >= state.nextPayment.amount) {
    const paidAmount = state.nextPayment.amount;
    completeLoanPayment();
    return `已偿还 ${formatCurrency(paidAmount)}。`;
  }

  state.nextPayment.overdue = true;
  state.overdueCount += 1;
  recordTrouble(2, `贷款逾期第 ${state.overdueCount} 天`);
  if (state.overdueCount >= 3) {
    state.loanDefaulted = true;
    state.loanDefaultReason = "连续三次逾期未还，贷款账户已经终止。";
    state.paymentNoticeOpen = false;
    return "连续三次逾期未还，贷款机构终止了你的账户。";
  }
  return `本期贷款已逾期 ${state.overdueCount} 次。尽快在日历中完成还款。`;
}

function schedulePaymentNotice() {
  if (
    state.day >= state.nextPayment.dueDay &&
    !state.nextPayment.overdue &&
    state.paymentNoticeDay < state.day
  ) {
    state.paymentNoticeOpen = true;
    state.paymentNoticeDay = state.day;
  }
}

function prepareDailyNews() {
  const template =
    STAGE_TWO_DATA.newsTemplates[
      Math.floor(Math.random() * STAGE_TWO_DATA.newsTemplates.length)
    ];
  state.news = [
    {
      ...template,
      day: state.day,
      duration: template.duration ?? "今天有效"
    }
  ];
  state.nextNewsTime = DAY_START;
  state.marketEffect = {
    category: template.category,
    multiplier: template.multiplier,
    expiresDay: state.day
  };
}

function maybeCreateThreatEvent() {
  if (state.day < 3 || state.threatEvent || state.trouble < 3) return;
  if (Math.random() > 0.35) return;
  if (state.protectionCharges > 0) {
    state.protectionCharges -= 1;
    state.lastMessage = "保护服务提前处理了一次匿名威胁。";
    return;
  }
  const amounts = [400, 600, 800];
  state.threatEvent = {
    id: `threat_${Date.now().toString(36)}`,
    amount: amounts[Math.floor(Math.random() * amounts.length)],
    message: "有人要求你归还一件来路不明的高价值物品。"
  };
}

function prepareBuyerSchedule() {
  const activeListings = state.listings.filter(
    (listing) => listing.status === "active"
  );
  if (!activeListings.length) return;
  const quota =
    activeListings.length > 3
      ? Math.min(3, Math.ceil(activeListings.length / 2))
      : 1;
  const times = [DAY_START + 30, DAY_START + 150, DAY_START + 270];
  for (let index = 0; index < quota; index += 1) {
    const listing = activeListings[index % activeListings.length];
    state.buyerSchedule.push({
      id: `buyerschedule_${Date.now().toString(36)}_${index}`,
      time: times[index],
      listingId: listing.id
    });
  }
}

function restoreListingItem(listing) {
  if (!listing?.itemSnapshot) return;
  if (state.inventory.some((item) => item.id === listing.itemId)) return;
  const item = JSON.parse(JSON.stringify(listing.itemSnapshot));
  item.status = item.searched ? "researched" : "viewed";
  state.inventory.unshift(item);
}

function commit() {
  try {
    localStorage.setItem(CONFIG.workingStorageKey, JSON.stringify(state));
  } catch {
    // The stage remains playable when storage is unavailable.
  }
}

function saveCheckpoint() {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify({
        ...state,
        summaryOpen: false,
        lastTradeFeedback: null
      })
    );
  } catch {
    // The stage remains playable when storage is unavailable.
  }
}

export function formatCurrency(value) {
  return `¥${Math.max(0, Math.round(value)).toLocaleString("zh-CN")}`;
}
