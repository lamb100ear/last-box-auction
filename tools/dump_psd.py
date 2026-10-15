# -*- coding: utf-8 -*-
"""打印 PSD 图层结构（名称、位置、尺寸、透明度）到 tools/_psd.txt。"""

import os
import sys

from psd_tools import PSDImage

SRC = r"C:\Users\33153\Documents\WeChat Files\wxid_661ij0esisxe32\FileStorage\File\2026-10"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    lines = []
    for filename in sys.argv[1:]:
        path = os.path.join(SRC, filename)
        lines.append("=" * 30 + " " + filename)
        if not os.path.exists(path):
            lines.append("missing")
            continue
        psd = PSDImage.open(path)
        lines.append(f"canvas: {psd.width} x {psd.height}")

        def walk(layer, depth):
            box = layer.bbox
            lines.append(
                "  " * depth
                + "- {}{} bbox={} size={}x{} opacity={}{}{}".format(
                    "[组] " if layer.is_group() else "",
                    layer.name,
                    box,
                    box[2] - box[0],
                    box[3] - box[1],
                    layer.opacity,
                    "" if layer.visible else " hidden",
                    "" if layer.blend_mode == 1 else f" blend={layer.blend_mode}",
                )
            )
            if layer.is_group():
                for child in layer:
                    walk(child, depth + 1)

        for layer in psd:
            walk(layer, 0)

    output = os.path.join(ROOT, "tools", "_psd.txt")
    with open(output, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print("wrote", output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
