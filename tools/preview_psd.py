# -*- coding: utf-8 -*-
"""把 PSD 整体合成成一张 PNG，用来确认设计稿的最终效果。"""

import os
import sys

from psd_tools import PSDImage

SRC = r"C:\Users\33153\Documents\WeChat Files\wxid_661ij0esisxe32\FileStorage\File\2026-10"
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tools", "_preview"
)


def main():
    os.makedirs(OUT, exist_ok=True)
    for filename in sys.argv[1:]:
        path = os.path.join(SRC, filename)
        if not os.path.exists(path):
            print("missing", filename)
            continue
        psd = PSDImage.open(path)
        image = psd.composite()
        target = os.path.join(OUT, os.path.splitext(filename)[0] + ".png")
        image.convert("RGB").save(target)
        print("saved", target, image.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
