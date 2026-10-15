# -*- coding: utf-8 -*-
"""导出 2.0 三个界面的占位美术。

1. 从四个 PSD 里逐层导出 PNG，文件名与 PSD 图层名一致。
2. 为 PSD 中缺失的 2.0 元素生成纯色块 PNG。

美术出图后覆盖同名文件即可，不需要改代码。
"""

import os
import sys

from PIL import Image, ImageDraw
from psd_tools import PSDImage

SRC = r"C:\Users\33153\Documents\WeChat Files\wxid_661ij0esisxe32\FileStorage\File\2026-10"
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "美术", "2.0")

SCENES = [
    ("auction", "拍卖界面.psd"),
    ("disposal", "拍卖处置界面.psd"),
    ("disposal_open", "拍卖处置界面（选择当场开箱后）.psd"),
    ("shop", "店铺界面.psd"),
]

SHARED = {"余额", "麻烦值", "信誉值", "日历"}

PSD_SCALE = 2

EXTRA = [
    ("auction", "拍卖师", 990, 520, 180, 330, "#7A5A3C"),
    ("auction", "竞争对手组", 40, 236, 424, 150, "#3E5C78"),
    ("auction", "成交印章", 740, 560, 320, 200, "#C8A24A"),
    ("auction", "今日结束牌", 700, 400, 400, 240, "#2F4C63"),
    ("auction", "黑匣广告海报", 1420, 180, 760, 600, "#16202C"),
    ("auction", "小黑", 60, 620, 192, 192, "#141414"),
    ("disposal", "小黑", 60, 620, 192, 192, "#141414"),
    ("disposal", "货架容量不足", 900, 480, 600, 160, "#7A2E2E"),
    ("disposal_open", "小黑", 60, 620, 192, 192, "#141414"),
    ("common", "物品槽位", None, None, 96, 96, "#5A4130"),
    ("common", "风险标记", None, None, 32, 32, "#7A2E2E"),
    ("common", "高亮轮廓", None, None, 96, 96, "#E0A93C"),
    # 店铺子视图
    ("shop", "物品详情窗口", 780, 180, 840, 900, "#16232E"),
    ("shop", "物品信息窗口", 760, 150, 880, 1050, "#16232E"),
    ("shop", "出售页面", 700, 160, 1400, 1040, "#16232E"),
    ("shop", "商城页面", 700, 160, 1400, 1040, "#16232E"),
    ("shop", "记事本页面", 1440, 150, 880, 1050, "#16232E"),
    ("shop", "万物通页面", 200, 150, 1120, 1050, "#16232E"),
    ("shop", "日历展开", 280, 110, 1840, 1120, "#16232E"),
    ("shop", "检视台弹层", 620, 130, 1540, 1100, "#101820"),
    ("shop", "物品视图", 660, 190, 660, 900, "#1B2A38"),
    ("shop", "操作区", 1520, 190, 580, 900, "#16232E"),
    ("shop", "工具带", 1340, 190, 150, 900, "#1B2A38"),
    ("shop", "工具_清洁", 1340, 200, 150, 150, "#4A5D6E"),
    ("shop", "工具_电路", 1340, 370, 150, 150, "#4A5D6E"),
    ("shop", "工具_放大镜", 1340, 540, 150, 150, "#4A5D6E"),
    ("shop", "工具_伪造", 1340, 710, 150, 150, "#6E4A5D"),
    ("shop", "工具_完成", 1340, 880, 150, 150, "#4A6E5D"),
]


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def walk(layer, out_dir, written):
    if layer.is_group():
        for child in layer:
            walk(child, out_dir, written)
        return

    image = layer.composite()
    if image is None:
        return

    image = image.convert("RGBA")
    box = image.getchannel("A").getbbox()
    if box is None:
        return

    cropped = image.crop(box)
    target_dir = os.path.join(ROOT, "common") if layer.name in SHARED else out_dir
    os.makedirs(target_dir, exist_ok=True)
    path = os.path.join(target_dir, "%s.png" % layer.name)
    cropped.save(path)
    written.append((os.path.relpath(target_dir, ROOT), "%s.png" % layer.name,
                    cropped.size[0], cropped.size[1], "PSD", box))


def make_block(name, w, h, color, scene):
    image = Image.new("RGBA", (w, h), hex_to_rgb(color) + (255,))
    draw = ImageDraw.Draw(image)
    border = PSD_SCALE * 2
    shade = tuple(max(0, c - 40) for c in hex_to_rgb(color))
    lighter = tuple(min(255, c + 36) for c in hex_to_rgb(color))
    draw.rectangle([0, 0, w - 1, h - 1], outline=shade + (255,), width=border)
    draw.line([(border, border), (w - 1 - border, border)], fill=lighter + (255,), width=border)
    draw.line([(border, border), (border, h - 1 - border)], fill=lighter + (255,), width=border)

    out_dir = os.path.join(ROOT, "common" if scene == "common" else scene)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "%s.png" % name)
    image.save(path)
    return os.path.relpath(out_dir, ROOT)


def draw_mascot(name, eyes, gesture):
    """按小黑的设定画占位图：黑匣主体、显示屏脸、两只悬浮白手套。"""
    size = 192
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    body = (24, 34, 168, 176)
    draw.rectangle(body, fill=(18, 18, 20, 255), outline=(70, 74, 80, 255), width=6)
    screen = (40, 52, 152, 122)
    draw.rectangle(screen, fill=(22, 44, 56, 255), outline=(96, 148, 168, 255), width=4)

    def eye(x, y, kind):
        if kind == "caret":
            draw.line([(x - 12, y + 6), (x, y - 8)], fill=(180, 240, 255, 255), width=6)
            draw.line([(x, y - 8), (x + 12, y + 6)], fill=(180, 240, 255, 255), width=6)
        elif kind == "flat":
            draw.line([(x - 12, y), (x + 12, y)], fill=(180, 240, 255, 255), width=6)
        else:
            draw.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(180, 240, 255, 255))

    kind = {"^^": "caret", "--": "flat", "..": "dot"}.get(eyes, "caret")
    eye(68, 86, kind)
    eye(124, 86, kind)

    slot = (56, 132, 136, 152)
    draw.rectangle(slot, outline=(96, 148, 168, 255), width=4)

    glove = (240, 244, 248, 255)
    for side in (0, 1):
        cx = 22 if side == 0 else 170
        cy = 96
        if gesture == "point" and side == 0:
            draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=glove)
            draw.line([(cx + 10, cy - 6), (cx + 26, cy - 14)], fill=glove, width=8)
        elif gesture == "shrug":
            draw.ellipse([cx - 14, cy - 18, cx + 14, cy + 10], fill=glove)
        else:
            draw.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=glove)

    out_dir = os.path.join(ROOT, "mascot")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "%s.png" % name)
    image.save(path)
    return os.path.relpath(out_dir, ROOT)


MASCOT_STATES = [
    ("小黑_默认", "^^", "idle"),
    ("小黑_开心", "^^", "idle"),
    ("小黑_无语", "--", "idle"),
    ("小黑_惊讶", "..", "idle"),
    ("小黑_指向", "^^", "point"),
    ("小黑_摊手", "..", "shrug"),
    ("小黑_印章", "^^", "idle")
]


def main():
    if not os.path.isdir(ROOT):
        os.makedirs(ROOT)
    records = []

    for scene, filename in SCENES:
        psd_path = os.path.join(SRC, filename)
        if not os.path.exists(psd_path):
            print("skip missing psd: %s" % filename)
            continue
        out_dir = os.path.join(ROOT, scene)
        os.makedirs(out_dir, exist_ok=True)
        psd = PSDImage.open(psd_path)
        for layer in psd:
            walk(layer, out_dir, records)

    for scene, name, x, y, w, h, color in EXTRA:
        rel = make_block(name, w, h, color, scene)
        records.append((rel, name + ".png", w, h, "占位色块", None))

    for name, eyes, gesture in MASCOT_STATES:
        rel = draw_mascot(name, eyes, gesture)
        records.append((rel, name + ".png", 192, 192, "占位色块", None))

    records.sort()
    lines = [
        "# 2.0 界面资源清单",
        "",
        "本表由 tools/build_v2_art.py 生成。",
        "逻辑坐标 = PSD 坐标 / 2，画布 1200 x 675。",
        "替换美术时保持文件名不变，覆盖同名 PNG 即可。",
        "",
        "| 目录 | 文件 | PSD 宽 x 高 | PSD 位置 | 来源 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for rel, name, w, h, source, box in records:
        where = "%d,%d" % (box[0], box[1]) if box else "-"
        lines.append("| %s | %s | %d x %d | %s | %s |" % (rel, name, w, h, where, source))
    manifest = os.path.join(ROOT, "资源清单.md")
    with open(manifest, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")

    print("wrote %d assets" % len(records))
    print("manifest: %s" % manifest)


if __name__ == "__main__":
    main()
