// 小黑：黑匣信贷吉祥物，负责前 3 天的教学和贷款引导。
// 台词与流程来自《再拍最后一箱 2.0 新手引导策划案》。

export const MASCOT_ART = {
  default: "./美术/2.0/mascot/小黑_默认.png",
  happy: "./美术/2.0/mascot/小黑_默认.png",
  flat: "./美术/2.0/mascot/小黑_闭眼.png",
  surprised: "./美术/2.0/mascot/小黑_豆豆眼.png",
  point: "./美术/2.0/mascot/小黑_默认.png",
  shrug: "./美术/2.0/mascot/小黑_豆豆眼.png",
  stamp: "./美术/2.0/mascot/小黑_默认.png"
};

export const OPENING = {
  id: "opening",
  face: "default",
  text: "欢迎来到黑匣拍卖场！",
  options: [
    { id: "full", label: "你谁啊" },
    { id: "skip", label: "别废话", hint: "跳过新手引导" }
  ]
};

export const INTRO = {
  id: "intro",
  face: "happy",
  target: null,
  text:
    "我是小黑，黑匣信贷的吉祥物。机场里那些没人认领的行李箱，最后都会送到这里，由我们统一拍卖。" +
    "每只箱子都曾经属于某个人。里面有什么，我们不知道，您也不知道，这正是它值钱的原因。来都来了，出价吧，朋友，祝您竞拍愉快！",
  options: [{ id: "continue", label: "开始竞拍" }]
};

// 第 1 天的教学顺序。trigger 是推进条件，由 main.js 在对应操作后上报。
export const DAY1_STEPS = [
  {
    id: "look",
    trigger: null,
    target: "当前箱子",
    face: "default",
    text: "先看来源、重量、封条和寄存时间，再看右边的估值区间。"
  },
  { id: "bid", trigger: "bid", target: "加价", face: "point", text: "点这里出价。" },
  {
    id: "rival",
    trigger: "win",
    target: "竞争对手组",
    // 出价信息栏的三行出价跟着这一组一起亮，描边只画在整组上。
    targets: ["竞争对手组", "买家一出价", "买家二出价", "玩家出价", "加价"],
    face: "flat",
    text: "他们是今天的竞争对手，跟价很凶。继续出价把箱子拿下来。"
  },
  {
    id: "carry",
    trigger: "home",
    target: "带回家",
    face: "point",
    text: "第一只箱子先带回家，另外两条路线暂时锁着。带回家的箱子会放在货架下层。"
  },
  {
    id: "openBox",
    trigger: "openBox",
    target: "货架下层箱子区",
    face: "point",
    text: "点下层箱子，箱内的物品会自动进入上层物品格。"
  },
  {
    id: "inspect",
    trigger: "inspect",
    target: "货架上层物品格",
    targets: ["货架上层物品格", "桌面"],
    sheets: ["检视台弹层", "物品详情窗口"],
    face: "point",
    text: "把上层物品拖到桌面，检视台才会打开。"
  },
  {
    id: "inspectOps",
    trigger: "inspected",
    target: "物品视图",
    targets: ["物品视图", "工具带"],
    sheets: ["检视台弹层"],
    face: "point",
    text: "按物品性质完成全部检视操作，污渍要擦掉，真实信息要核对。"
  },
  {
    id: "sellEntry",
    trigger: "listingOpen",
    target: "货架上层物品格",
    sheets: ["物品详情窗口", "出售页面"],
    face: "happy",
    text: "检视完成，物品回到货架。点开物品详情，再点出售。"
  },
  {
    id: "calendar",
    trigger: "calendarClosed",
    target: "日历",
    sheets: ["日历展开", "物品详情窗口"],
    face: "flat",
    text: "先别急着定价，看完趋势再关掉日历。"
  },
  {
    id: "listing",
    trigger: "listing",
    target: "橱窗",
    targets: ["货架上层物品格", "橱窗"],
    sheets: ["物品详情窗口", "出售页面"],
    face: "point",
    text: "回到出售页面选两个标签，价格定在参考区间内。"
  },
  {
    id: "buyer",
    // 成交是成功分支，谈崩是失败分支，两条都要能继续教学。
    trigger: ["buyer", "buyerFailed"],
    target: "买家对话气泡",
    // 谈价时点开桌面物品的信息窗要能看清，不跟着压暗。
    sheets: ["物品信息窗口", "物品详情窗口"],
    face: "happy",
    text: "买家会关心不同的信息，回答会影响信任和成交。"
  },
  {
    id: "hammer",
    trigger: "hammer",
    target: "拍卖锤",
    face: "point",
    text: "点一下桌面上的拍卖锤，就能回到拍卖场。"
  },
  {
    id: "second",
    trigger: "secondWin",
    target: "加价",
    face: "stamp",
    text: "试着自己拍下一只箱子吧。你已经可以独立经营了！"
  }
];

// 买家步骤的失败分支：不同失败原因给不同安慰台词，玩家点继续就能往下走。
export const BUYER_FAIL_DIALOGUES = {
  detected: {
    id: "buyerFail",
    face: "flat",
    target: null,
    text: "被买家识破了？不要灰心。信誉可以慢慢攒回来，物品已经回到货架，重新上架就能再等一位买家。",
    options: [{ id: "ok", label: "继续" }]
  },
  left: {
    id: "buyerFail",
    face: "flat",
    target: null,
    text: "价格把买家吓走了。不要灰心，物品还在你手上，调低一点再上架就好。",
    options: [{ id: "ok", label: "继续" }]
  },
  failed: {
    id: "buyerFail",
    face: "flat",
    target: null,
    text: "谈崩了？不要灰心。第一次谈不成很正常，重新上架就能再等一位买家。",
    options: [{ id: "ok", label: "继续" }]
  },
  cancelled: {
    id: "buyerFail",
    face: "flat",
    target: null,
    text: "买家没等到回复就走了。不要灰心，物品已经回货架，重新上架还能再等买家。",
    options: [{ id: "ok", label: "继续" }]
  }
};

export function buyerFailDialogue(kind) {
  return BUYER_FAIL_DIALOGUES[kind] || BUYER_FAIL_DIALOGUES.failed;
}

export const DAY2_STEP = {
  id: "day2",
  trigger: "day2",
  face: "default",
  target: "日历",
  text: "今天市场变了。别急着卖，先看日历。"
};

export const DAY4_ASK = {
  id: "day4",
  face: "shrug",
  target: "加价",
  // 站在拍卖台前的空地上，别贴着右上角的加价按钮。
  spot: "stageFront",
  text: "真可惜......只差一点呢。需要我帮您补上吗？很划算的。",
  options: [
    { id: "need", label: "需要！" },
    { id: "refuse", label: "还是算了吧..." }
  ]
};

export const DAY4_YES = { id: "day4yes", face: "happy", text: "明智之举。" };
export const DAY4_NO = { id: "day4no", face: "flat", text: "当然，我们尊重您的选择。" };

export function ensureTutorial(state) {
  if (!state.tutorial) {
    state.tutorial = {
      mode: "unset",
      index: 0,
      completed: [],
      day4Shown: false,
      day4Asked: false,
      day2Shown: false
    };
  }
  return state.tutorial;
}

export function currentStep(state) {
  const tutorial = ensureTutorial(state);
  if (tutorial.mode === "skipped") {
    return null;
  }
  if (tutorial.mode === "unset") {
    return OPENING;
  }
  if (tutorial.mode === "intro") {
    return INTRO;
  }
  if (tutorial.mode === "full") {
    return DAY1_STEPS[tutorial.index] || null;
  }
  return null;
}

export function chooseOpening(state, optionId) {
  const tutorial = ensureTutorial(state);
  if (optionId === "skip") {
    tutorial.mode = "skipped";
    tutorial.completed = DAY1_STEPS.map((step) => step.id);
    return null;
  }
  tutorial.mode = "intro";
  return INTRO;
}

export function startTutorial(state) {
  const tutorial = ensureTutorial(state);
  tutorial.mode = "full";
  tutorial.index = 0;
  return DAY1_STEPS[0];
}

// 完成当前步骤并返回下一步。
export function nextStep(state) {
  const tutorial = ensureTutorial(state);
  if (tutorial.mode !== "full") {
    return null;
  }
  const step = DAY1_STEPS[tutorial.index];
  if (step) {
    tutorial.completed.push(step.id);
  }
  tutorial.index += 1;
  if (tutorial.index >= DAY1_STEPS.length) {
    tutorial.mode = "completed";
    return null;
  }
  return DAY1_STEPS[tutorial.index];
}

// 把游戏内的动作上报给教学流程，命中当前步骤就推进。
export function notify(state, event) {
  const tutorial = ensureTutorial(state);
  if (tutorial.mode !== "full") {
    return { changed: false, step: null };
  }
  // 严格按顺序推进：只有当前步骤的完成事件才会进入下一步。
  const step = DAY1_STEPS[tutorial.index];
  if (!step) {
    return { changed: false, step: currentStep(state) };
  }
  const accepted = Array.isArray(step.trigger) ? step.trigger : [step.trigger];
  if (!accepted.includes(event)) {
    return { changed: false, step: currentStep(state) };
  }
  return { changed: true, step: nextStep(state) };
}

export function shouldForceCarryHome(state) {
  const tutorial = ensureTutorial(state);
  return tutorial.mode === "full" && DAY1_STEPS[tutorial.index]?.id === "carry";
}

export function tutorialHint(state) {
  const tutorial = ensureTutorial(state);
  if (tutorial.mode === "full") {
    const step = DAY1_STEPS[tutorial.index];
    return step ? step.text : null;
  }
  if (tutorial.mode === "completed") {
    return null;
  }
  return null;
}
