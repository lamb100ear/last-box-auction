# -*- coding: utf-8 -*-
"""把检视台左侧的操作视台改成复古暖色像素画。

原图是深蓝青的工作台背景。这里把偏蓝的像素按亮度映射到暖棕色阶，
保留台灯、金框和木台这些本来就偏暖的像素。第一次运行会把原图备份成
物品视图_原色.png，之后每次都以备份为输入，脚本可以重复执行。
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = os.path.join(ROOT, "美术", "2.0", "shop")
TARGET = os.path.join(SHOP, "物品视图.png")
SOURCE = os.path.join(SHOP, "物品视图_原色.png")

# 暖棕色阶：亮度从暗到亮。
RAMP = [
    (0.0, (26, 16, 8)),
    (0.28, (58, 36, 20)),
    (0.5, (96, 62, 30)),
    (0.72, (152, 104, 52)),
    (1.0, (236, 208, 162)),
]


def warm_of(luma):
    value = max(0.0, min(1.0, luma / 255.0))
    for index in range(1, len(RAMP)):
        stop, color = RAMP[index]
        if value <= stop:
            prev_stop, prev_color = RAMP[index - 1]
            span = stop - prev_stop or 1.0
            ratio = (value - prev_stop) / span
            return tuple(
                round(prev_color[channel] + (color[channel] - prev_color[channel]) * ratio)
                for channel in range(3)
            )
    return RAMP[-1][1]


def recolor(image):
    pixels = image.load()
    width, height = image.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # 只有明显偏暖的像素（木台、金框、灯罩）保留原色，
            # 青绿墙面和灯光里的中性灰都按亮度压成暖色。
            if a == 0 or (r > g + 12 and r > b + 12):
                continue
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            warm = warm_of(luma)
            pixels[x, y] = (warm[0], warm[1], warm[2], a)
    return image


def main():
    if not os.path.exists(SOURCE):
        if not os.path.exists(TARGET):
            print("missing source art:", TARGET)
            return 1
        Image.open(TARGET).save(SOURCE)
        print("backed up original to", SOURCE)
    image = Image.open(SOURCE).convert("RGBA")
    recolor(image).save(TARGET)
    print("wrote", TARGET)
    return 0


if __name__ == "__main__":
    sys.exit(main())
