# 检视小游戏占位素材

运行时代码优先读取 `tools/*.png` 和 `benches/*.png`，PNG 不存在时自动回退到同目录 SVG。

后续替换时保持文件名不变：

```text
美术/小游戏/tools/cloth.png
美术/小游戏/tools/brush.png
美术/小游戏/tools/polish.png
美术/小游戏/tools/screwdriver.png
美术/小游戏/tools/tweezers.png
美术/小游戏/tools/oil.png
美术/小游戏/tools/label.png
美术/小游戏/tools/magnifier.png
美术/小游戏/benches/fabric.png
美术/小游戏/benches/metal.png
美术/小游戏/benches/electronics.png
美术/小游戏/benches/document.png
美术/小游戏/benches/luxury.png
美术/小游戏/benches/generic.png
```

替换后更新 `js/data.js` 中的 `CONFIG.assetVersion`，即可刷新浏览器缓存。
