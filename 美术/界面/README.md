# 界面与图标素材

本目录存放界面参考图、桌面图标和当前桌面壁纸。

## 桌面图标

- `mail.png`
- `calendar.png`
- `auction.png`
- `shop.png`
- `folder.png`
- `universal.png`

图标采用高密度像素画风格，使用约 `3px` 像素块、32 色以内、硬边和抖动阴影。

## 界面参考

- `game_ui_reference.png`
  - 原游戏检视台截图，用于给 Miora 分析布局。

## 桌面壁纸

- `desktop_Windows.jpg`
  - 当前游戏正在使用的桌面壁纸。
  - 替换同名文件即可更新桌面背景。

桌面图标仍使用原来的代码 SVG，本目录中的 PNG 暂未接入游戏。

替换壁纸后，更新 `js/data.js` 中的 `CONFIG.assetVersion`；壁纸文件名保持 `desktop_Windows.jpg`。
