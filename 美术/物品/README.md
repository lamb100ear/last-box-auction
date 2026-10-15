# 物品像素素材

本目录存放高密度像素物品素材。

风格要求：

- 先按真实商品照片质感生成，再转换为 `2px` 到 `3px` 像素块。
- 32 色以内。
- 使用细密抖动表现明暗。
- 保持硬边，避免平滑矢量感。
- 浅灰纯色背景，无文字、品牌、水印和 UI。

已生成素材：

- `bottle.png`
- `camera.png`
- `watch.png`
- `paper.png`
- `key.png`
- `radio.png`
- `lamp.png`
- `bag.png`
- `phone.png`
- `ring.png`
- `flask.png`
- `painting.png`
- `compass.png`
- `_miora_sheet_05_labels_portraits.webp`

`_miora_*.png` 和 `_miora_*.webp` 为 Miora 原始生成文件，用于保留生成来源和后续重新裁切。

当前只有检视台中央的物品大图接入 `by-id` 图片；库存、上架页和买家私聊仍使用原有 SVG 美术。

## 按物品 ID 归档

`by-id` 子目录为当前游戏物品池中的全部 45 个物品 ID 建立了对应的 PNG 映射。

- 已单独生成的物品优先使用独立图片。
- 重复名称或近似类型的藏品复用同一张同风格图片。
- 标签、包装、伪造文件、旧案照片、像素肖像、便条、收据、车票和钥匙已完成独立素材替换。
- 替换同名图片后，检视台会按 `templateId` 自动加载；其他页面不受影响。
- 替换同名图片后，更新 `js/data.js` 中的 `CONFIG.assetVersion` 即可刷新缓存。

## 透明背景处理

新素材如果仍带纯色背景，可以运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/remove_item_background.ps1 -Paths "美术/物品/by-id"
```

脚本会从图片四周向内清除连通的背景区域，不会直接删除物品内部的相近颜色。
