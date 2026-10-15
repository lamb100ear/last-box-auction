// 电脑商城：伪造材料和服务。

import { STAGE_TWO_DATA } from "../data.js";
import { keepsakeModifiers } from "./keepsake.js";

const AVAILABLE = new Set([
  "fake_blank_label",
  "fake_packaging",
  "fake_material",
  "fake_source",
  "service_lawyer",
  "service_cleanup"
]);

export function mallStock() {
  return STAGE_TWO_DATA.mallProducts.filter(
    (product) => product.type === "fake" || product.type === "service"
  );
}

export function fakeMaterials() {
  return STAGE_TWO_DATA.mallProducts.filter((product) => product.type === "fake");
}

export function materialById(id) {
  return STAGE_TWO_DATA.mallProducts.find((product) => product.id === id) || null;
}

export function buyProduct(state, productId) {
  const product = STAGE_TWO_DATA.mallProducts.find((entry) => entry.id === productId);
  if (!product) {
    return { ok: false, text: "没有找到这件商品。" };
  }
  if (!AVAILABLE.has(productId)) {
    return { ok: false, text: `${product.name}在第三部分开放。` };
  }
  // 法律人脉类藏品让麻烦处理类服务更便宜。
  const discount = product.type === "service" ? keepsakeModifiers(state).serviceDiscount : 0;
  const price = Math.max(0, product.price - discount);
  if (state.cash < price) {
    return { ok: false, text: `余额不足，${product.name}需要 ¥${price}。` };
  }
  state.cash -= price;
  if (product.type === "fake") {
    state.fakeStock[productId] = (state.fakeStock[productId] || 0) + 1;
    state.ledger.cost += price;
    return { ok: true, text: `${product.name}已入库，可以在检视台使用。` };
  }
  if (productId === "service_lawyer") {
    state.trouble = Math.max(0, state.trouble - 2);
    return {
      ok: true,
      text: `律师处理完毕，麻烦值 -2。${discount ? `（藏品优惠 -¥${discount}）` : ""}`
    };
  }
  state.trouble = Math.max(0, state.trouble - 1);
  state.cleanupShield += 1;
  return {
    ok: true,
    text: `数据清理完成，麻烦值 -1，并获得一次伪造护航。${
      discount ? `（藏品优惠 -¥${discount}）` : ""
    }`
  };
}
