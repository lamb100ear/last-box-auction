// 通用随机与数值工具，供箱子、检视、上架等模块共用。

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function round10(value) {
  return Math.round(value / 10) * 10;
}

export function hash(text) {
  let value = 0;
  for (const character of String(text)) {
    value = (value * 31 + character.charCodeAt(0)) >>> 0;
  }
  return value;
}

// 打散哈希结果。直接取模会让相邻编号落到相邻位置，污渍和放大镜点位会挤在一起。
export function mix(value) {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export function pick(list, seed) {
  return list[seed % list.length];
}
