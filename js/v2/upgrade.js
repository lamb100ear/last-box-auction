// 店铺升级：三级，装修日或余额门槛解锁，解锁后仍需付现金。

export const LEVELS = [
  {
    level: 1,
    name: "临时摊位",
    price: 0,
    change: "简易货架、普通桌面和旧橱窗",
    effect: "无"
  },
  {
    level: 2,
    name: "正式店铺",
    price: 1800,
    change: "新招牌、双层货架、完整桌面和明亮橱窗",
    effect: "保管费 -20%，买家到达略快"
  },
  {
    level: 3,
    name: "专业旧货铺",
    price: 4200,
    change: "专业工具、档案化记事本、带灯橱窗和完整买家窗口",
    effect: "保管费再 -20%，高级场次稳定开放"
  }
];

export const DECOR_DAYS = [7, 14, 21, 28];
export const BALANCE_GATES = [5000, 12000, 25000];

export function nextLevel(state) {
  return LEVELS.find((entry) => entry.level === state.shopLevel + 1) || null;
}

// 装修商在固定日出现，余额到门槛也会自动解锁购买资格。
export function unlockedFor(state) {
  const next = nextLevel(state);
  if (!next) {
    return { unlocked: false, reason: "已经是最高等级" };
  }
  const decorDay = DECOR_DAYS.some(
    (day) => state.day === day || (state.day > 28 && (state.day - 28) % 7 === 0)
  );
  const gate = state.shopLevel === 1 ? BALANCE_GATES[0] : state.shopLevel === 2 ? BALANCE_GATES[1] : Infinity;
  if (decorDay) {
    return { unlocked: true, reason: `装修商今天到场，可以升级到${next.name}` };
  }
  if (state.cash >= gate) {
    return { unlocked: true, reason: `余额达到 ¥${gate}，${next.name}已解锁` };
  }
  return {
    unlocked: false,
    reason: state.shopLevel === 1
      ? `装修商在第 7 天到场，或余额达到 ¥${BALANCE_GATES[0]} 解锁`
      : `装修商每 7 天到场一次，或余额达到 ¥${BALANCE_GATES[1]} 解锁`
  };
}

export function buyUpgrade(state) {
  const next = nextLevel(state);
  if (!next) {
    return { ok: false, text: "店铺已经是最高等级。" };
  }
  const gate = unlockedFor(state);
  if (!gate.unlocked) {
    return { ok: false, text: gate.reason };
  }
  if (state.cash < next.price) {
    return { ok: false, text: `升级需要 ¥${next.price}，当前余额不足。` };
  }
  state.cash -= next.price;
  state.shopLevel = next.level;
  state.ledger.upgrade = (state.ledger.upgrade || 0) + next.price;
  return { ok: true, text: `店铺升级到「${next.name}」。${next.effect}` };
}
