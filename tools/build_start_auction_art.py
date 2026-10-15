# -*- coding: utf-8 -*-
"""导出「游戏开始界面」和「拍卖界面」的正式美术。

只在配置表里列出的图层会被导出，输出文件名与游戏里的图层名一致。
导出后写到 tools/_artmap.txt，方便核对逻辑坐标。
"""

import os
import sys

from psd_tools import PSDImage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"C:\Users\33153\Documents\WeChat Files\wxid_661ij0esisxe32\FileStorage\File\2026-10"
ART = os.path.join(ROOT, "美术", "2.0")

# (PSD 图层名, 输出文件名, 输出目录, 是否取组合成)
START_LAYERS = [
    ("背景", "背景.png", "start", True),
    ("标题", "标题.png", "start", False),
    ("开始游戏按键", "开始游戏按键.png", "start", False),
    ("载入游戏按键", "载入游戏按键.png", "start", False),
]

AUCTION_LAYERS = [
    ("拍卖场", "拍卖场.png", "auction", False),
    ("拍卖台", "拍卖台.png", "auction", False),
    ("箱子信息面板", "箱子信息面板.png", "auction", False),
    ("当前箱子", "当前箱子.png", "auction", False),
    ("加价", "加价.png", "auction", False),
    ("放弃", "放弃.png", "auction", False),
    ("出价信息栏", "出价信息栏.png", "auction", True),
    ("日历", "日历.png", "common", False),
    ("余额", "余额.png", "common", False),
    ("麻烦值", "麻烦值.png", "common", False),
    ("信誉值", "信誉值.png", "common", False),
    ("黑匣广告", "黑匣广告海报.png", "auction", False),
    ("小黑（默认表情）", "小黑_默认.png", "mascot", False),
    ("小黑（豆豆眼表情）", "小黑_豆豆眼.png", "mascot", False),
    ("小黑（闭眼表情）", "小黑_闭眼.png", "mascot", False),
    ("通用UI按键", "通用UI按键.png", "common", False),
]

# 拍卖后处置界面：一个 PSD 同时包含「处置方式选择」和「选择现场开箱后」两个状态。
DISPOSAL_LAYERS = [
    ("背景", "背景.png", "disposal", False),
    ("背景", "处置台.png", "disposal", False),
    ("箱子", "箱子.png", "disposal", False),
    # 游戏里这张卡片的内部图层名是「原封转卖」，文件名按 PSD 叫整箱转卖，这里做映射。
    ("整箱转卖", "原封转卖.png", "disposal", False),
    ("现场开箱", "现场开箱.png", "disposal", False),
    ("带回家", "带回家.png", "disposal", False),
    ("选择现场开箱的箱子拆分", "箱子.png", "disposal_open", False),
    ("箱子信息板", "预览面板.png", "disposal_open", False),
    ("全部卖给现场", "全部卖给现场.png", "disposal_open", False),
    ("全部带回家", "全部带回家.png", "disposal_open", False),
]

# 店铺界面：基础场景 + 桌面物件 + 买家立绘 + 货架槽位。
SHOP_LAYERS = [
    ("场景层/已插入图像", "店铺背景.png", "shop", False),
    ("场景层/货架", "货架.png", "shop", False),
    ("场景层/橱窗", "橱窗.png", "shop", False),
    ("桌面", "桌面.png", "shop", False),
    ("桌面上可交互物品/电脑", "电脑.png", "shop", False),
    ("桌面上可交互物品/记事本", "记事本.png", "shop", False),
    ("桌面上可交互物品/收纳盒", "收纳盒.png", "shop", False),
    ("桌面上可交互物品/拍卖锤", "拍卖锤.png", "shop", False),
    ("营业牌", "营业牌.png", "shop", False),
    ("货架上放置的槽位/第一箱", "箱位一.png", "shop", False),
    ("货架上放置的槽位/第二箱", "箱位二.png", "shop", False),
    ("货架上放置的槽位/第三箱", "箱位三.png", "shop", False),
    ("货架上放置的槽位/第四箱", "箱位四.png", "shop", False),
    ("买家立绘/纸鹤收藏", "买家_纸鹤收藏.png", "shop", False),
    ("买家立绘/蓝账本", "买家_蓝账本.png", "shop", False),
    ("买家立绘/绒布经纪人", "买家_绒布经纪人.png", "shop", False),
    ("买家立绘/旧货狐狸", "买家_旧货狐狸.png", "shop", False),
    ("买家立绘/七号仓库", "买家_七号仓库.png", "shop", False),
    ("买家立绘/午夜电台", "买家_午夜电台.png", "shop", False),
    ("通用UI按键", "通用UI按键.png", "common", False),
]

# 店铺各个窗口。
SHOP_WINDOW_LAYERS = [
    # 检视窗口
    ("检视窗口/已插入图像", "检视台弹层.png", "shop", False),
    ("检视窗口/物品视窗", "物品视图.png", "shop", False),
    ("检视窗口/检视 物品名称", "检视_物品名称区.png", "shop", False),
    ("检视窗口/已经发现问题", "检视_问题区.png", "shop", False),
    ("检视窗口/万物通参考", "检视_参考区.png", "shop", False),
    ("检视窗口/新建组/清洁", "工具_清洁.png", "shop", False),
    ("检视窗口/新建组/电路", "工具_电路.png", "shop", False),
    ("检视窗口/新建组/放大镜", "工具_放大镜.png", "shop", False),
    ("检视窗口/新建组/伪造", "工具_伪造.png", "shop", False),
    ("检视窗口/新建组/完成检视", "工具_完成.png", "shop", False),
    ("检视窗口/新建组/选择工具时的高亮框", "工具高亮框.png", "shop", False),
    # 物品详情窗口
    ("物品详情窗口/窗口底图背景", "物品详情窗口.png", "shop", False),
    ("物品详情窗口/关闭", "关闭.png", "shop", False),
    ("物品详情窗口/出售", "详情_出售.png", "shop", False),
    ("物品详情窗口/检视", "详情_检视.png", "shop", False),
    ("物品详情窗口/物品名称", "详情_物品名称区.png", "shop", False),
    # 物品出售窗口
    ("物品出售窗口/窗口底图", "出售页面.png", "shop", False),
    ("物品出售窗口/物品名称", "出售_物品名称区.png", "shop", False),
    ("物品出售窗口/取消", "出售_取消.png", "shop", False),
    ("物品出售窗口/确认出售", "出售_确认.png", "shop", False),
    # 购买窗口
    ("购买窗口/购买界面底图", "商城页面.png", "shop", False),
    ("购买窗口/索引栏（点击跳转搜索界面）", "商城_索引栏.png", "shop", False),
    ("购买窗口/退出键", "商城_退出.png", "shop", False),
    ("购买窗口/滚动条", "商城_滚动条.png", "shop", False),
    ("购买窗口/滚动范围", "商城_滚动范围.png", "shop", False),
    (
        "购买窗口/单个物品信息条/单个物品信息栏（画面滚动时同组的ui一起滚动）",
        "商城_物品信息栏.png",
        "shop",
        False,
    ),
    # 搜索窗口
    ("搜索窗口/已插入图像", "万物通页面.png", "shop", False),
    ("搜索窗口/搜索框（可点击）", "搜索_搜索框.png", "shop", False),
    ("搜索窗口/索引栏（点击跳转购买界面）", "搜索_索引栏.png", "shop", False),
    # 记事本
    ("新建组/记事本背景底", "记事本页面.png", "shop", False),
    ("新建组/记事本左侧书页区域", "记事本_左页.png", "shop", False),
    ("新建组/记事本右侧书页区域", "记事本_右页.png", "shop", False),
    ("新建组/三角标（点击进入下一位买家线索页面）", "记事本_三角标.png", "shop", False),
    # 买家故事页的书签（记事本默认页）
    ("新建组/选择买家故事书签时的状态/买家故事书签", "书签_买家故事.png", "shop", False),
    ("新建组/选择买家故事书签时的状态/图鉴书签", "书签_图鉴.png", "shop", False),
    ("新建组/选择买家故事书签时的状态/店铺升级书签", "书签_店铺升级.png", "shop", False),
    # 图鉴页时买家故事书签收回去的样子
    ("新建组/选择图鉴书签时的状态/买家故事书签", "书签_买家故事未选.png", "shop", False),
    ("新建组/选择图鉴书签时的状态/图鉴书签", "书签_图鉴选中.png", "shop", False),
    ("新建组/选择店铺升级书签时的状态/店铺升级书签", "书签_升级选中.png", "shop", False),
    # 记事本左页上的买家相片
    ("新建组/买家相片/纸鹤收藏", "买家相片_纸鹤收藏.png", "shop", False),
    ("新建组/买家相片/蓝账本", "买家相片_蓝账本.png", "shop", False),
    ("新建组/买家相片/绒布经纪人", "买家相片_绒布经纪人.png", "shop", False),
    ("新建组/买家相片/旧货狐狸", "买家相片_旧货狐狸.png", "shop", False),
    ("新建组/买家相片/七号仓库", "买家相片_七号仓库.png", "shop", False),
    ("新建组/买家相片/午夜电台", "买家相片_午夜电台.png", "shop", False),
    # 收纳盒
    ("新建组/收纳盒底图", "收纳盒窗口.png", "shop", False),
    ("新建组/收纳盒名称标题", "收纳盒标题.png", "shop", False),
    ("新建组/初始空槽UI", "收纳盒空槽.png", "shop", False),
    ("新建组/装备藏品后的UI/第一个藏品槽", "藏品槽一.png", "shop", False),
    ("新建组/装备藏品后的UI/第二个藏品槽", "藏品槽二.png", "shop", False),
    ("新建组/装备藏品后的UI/第三个藏品槽", "藏品槽三.png", "shop", False),
    ("新建组/装备藏品后的UI/第四个藏品槽", "藏品槽四.png", "shop", False),
    ("新建组/返回", "收纳盒返回.png", "shop", False),
]

FILES = [
    ("游戏开始界面.psd", START_LAYERS),
    ("拍卖界面(2).psd", AUCTION_LAYERS),
    ("拍卖后处置界面.psd", DISPOSAL_LAYERS),
    ("店铺界面(2).psd", SHOP_LAYERS),
    ("店铺界面(2).psd", SHOP_WINDOW_LAYERS),
]


def find_path_layer(container, path):
    """按 A/B/C 形式逐级找图层，避免同名图层串位。"""
    parts = path.split("/")
    fallback = []

    def resolve(cont, index):
        for layer in cont:
            if layer.name != parts[index]:
                continue
            if index == len(parts) - 1:
                if layer.visible and layer.opacity > 0:
                    return layer
                fallback.append(layer)
                continue
            if layer.is_group():
                found = resolve(layer, index + 1)
                if found is not None:
                    return found
        return None

    found = resolve(container, 0)
    if found is not None:
        return found
    return fallback[0] if fallback else None


def find_layer(container, name, want_group):
    fallback = None
    for layer in container:
        if layer.name == name and layer.is_group() == want_group:
            # 同名图层优先取可见的那一层（PSD 里常有隐藏的旧版备份）。
            if layer.visible and layer.opacity > 0:
                return layer
            fallback = fallback or layer
            continue
        if layer.is_group():
            found = find_layer(layer, name, want_group)
            if found is not None:
                return found
    return fallback


def export(psd, name, out_name, folder, want_group, records):
    layer = find_path_layer(psd, name) if "/" in name else find_layer(psd, name, want_group)
    if layer is None:
        records.append((out_name, folder, "NOT FOUND", "-", "-"))
        return
    if not layer.visible or layer.opacity == 0:
        records.append((out_name, folder, "hidden/opacity0", "-", "-"))
        return
    image = (layer.composite() if want_group else layer.composite())
    if image is None:
        records.append((out_name, folder, "no pixels", "-", "-"))
        return
    image = image.convert("RGBA")
    box = image.getchannel("A").getbbox()
    if box is None:
        records.append((out_name, folder, "empty", "-", "-"))
        return
    cropped = image.crop(box)
    out_dir = os.path.join(ART, folder)
    os.makedirs(out_dir, exist_ok=True)
    cropped.save(os.path.join(out_dir, out_name))
    records.append(
        (
            out_name,
            folder,
            "%dx%d" % (cropped.size[0], cropped.size[1]),
            "%d,%d" % (box[0], box[1]),
            "x %d..%d, y %d..%d" % (box[0] // 2, box[2] // 2, box[1] // 2, box[3] // 2),
        )
    )


def main():
    lines = []
    for filename, config in FILES:
        path = os.path.join(SRC, filename)
        lines.append("=" * 30 + " " + filename)
        if not os.path.exists(path):
            lines.append("missing psd")
            continue
        psd = PSDImage.open(path)
        records = []
        for name, out_name, folder, want_group in config:
            export(psd, name, out_name, folder, want_group, records)
        for out_name, folder, size, origin, logical in records:
            lines.append("%-22s | %-8s | %-12s | %s | %s" % (out_name, folder, size, origin, logical))
    output = os.path.join(ROOT, "tools", "_artmap.txt")
    with open(output, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print("wrote", output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
