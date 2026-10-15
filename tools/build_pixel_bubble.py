# -*- coding: utf-8 -*-
"""生成小黑的像素气泡：九宫格边框 + 左右两个尾巴。

一套是 PSD 里的深蓝底板，一套是新手引导要用的复古暖色（米白底 + 木棕边框）。
全部硬边像素块。
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "美术", "2.0", "mascot")

OUTLINE = (23, 17, 11, 255)
FRAME_LIGHT = (217, 168, 106, 255)
FRAME = (176, 124, 60, 255)
FRAME_DARK = (122, 79, 34, 255)
INNER = (138, 90, 18, 255)
FILL = (27, 42, 56, 255)

SIZE = 16

# 暖色版：深棕描边、木框、米白底。九宫格按 2 倍像素放大后仍是硬边。
WARM_OUTLINE = (58, 36, 18, 255)
WARM_FRAME = (184, 134, 60, 255)
WARM_FRAME_DARK = (122, 79, 34, 255)
WARM_INNER = (232, 217, 180, 255)
WARM_FILL = (246, 237, 214, 255)

WARM_SIZE = 10


def build_warm_frame():
    """10x10 九宫格边框，切片 4、边框宽度 8px，正好 2 倍像素放大。"""
    image = Image.new("RGBA", (WARM_SIZE, WARM_SIZE), WARM_FILL)
    pixels = image.load()
    for y in range(WARM_SIZE):
        for x in range(WARM_SIZE):
            edge = min(x, WARM_SIZE - 1 - x, y, WARM_SIZE - 1 - y)
            if edge == 0:
                pixels[x, y] = WARM_OUTLINE
            elif edge == 1:
                pixels[x, y] = WARM_FRAME
            elif edge == 2:
                pixels[x, y] = WARM_FRAME_DARK
            elif edge == 3:
                pixels[x, y] = WARM_INNER
            else:
                pixels[x, y] = WARM_FILL
    return image


def build_warm_tail(direction):
    """18x18 阶梯三角尾巴（9x9 形状放大一倍），配色和暖色气泡一致。"""
    size = 18
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = image.load()
    for row in range(size):
        length = size - row
        for step in range(length):
            x = step if direction < 0 else size - 1 - step
            if step == 0 or step == length - 1 or row == 0:
                pixels[x, row] = WARM_OUTLINE
            elif step == 1 or step == length - 2:
                pixels[x, row] = WARM_FRAME
            else:
                pixels[x, row] = WARM_FILL
    return image


def build_frame():
    """16x16 九宫格边框，切片 5：外描边 2、木框 2、内描边 1。"""
    image = Image.new("RGBA", (SIZE, SIZE), FILL)
    pixels = image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            edge = min(x, SIZE - 1 - x, y, SIZE - 1 - y)
            if edge <= 1:
                pixels[x, y] = OUTLINE
            elif edge == 2:
                pixels[x, y] = FRAME
            elif edge == 3:
                pixels[x, y] = FRAME
            elif edge == 4:
                pixels[x, y] = INNER
            else:
                pixels[x, y] = FILL
    # 左上亮边、右下暗边，做出木框厚度。
    for x in range(2, SIZE - 2):
        pixels[x, 2] = FRAME_LIGHT
        pixels[x, SIZE - 3] = FRAME_DARK
    for y in range(2, SIZE - 2):
        pixels[2, y] = FRAME_LIGHT
        pixels[SIZE - 3, y] = FRAME_DARK
    for corner, color in (
        ((2, 2), FRAME_LIGHT),
        ((SIZE - 3, 2), FRAME_DARK),
        ((2, SIZE - 3), FRAME_DARK),
        ((SIZE - 3, SIZE - 3), FRAME_DARK),
    ):
        pixels[corner] = color
    return image


def build_tail(direction):
    """9x9 阶梯三角尾巴：direction=-1 指向左，1 指向右。"""
    size = 9
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = image.load()
    for row in range(size):
        length = size - row
        for step in range(length):
            x = step if direction < 0 else size - 1 - step
            if step == 0 or step == length - 1 or row == 0:
                pixels[x, row] = OUTLINE
            elif step == 1 or step == length - 2:
                pixels[x, row] = FRAME
            else:
                pixels[x, row] = FILL
    return image


def main():
    os.makedirs(OUT, exist_ok=True)
    build_frame().save(os.path.join(OUT, "气泡.png"))
    build_tail(-1).save(os.path.join(OUT, "气泡尾巴左.png"))
    build_tail(1).save(os.path.join(OUT, "气泡尾巴右.png"))
    # 新手引导用的复古暖色气泡。
    build_warm_frame().save(os.path.join(OUT, "气泡_暖.png"))
    build_warm_tail(-1).save(os.path.join(OUT, "气泡尾巴左_暖.png"))
    build_warm_tail(1).save(os.path.join(OUT, "气泡尾巴右_暖.png"))
    print("wrote bubble assets to", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
