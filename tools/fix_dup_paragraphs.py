# -*- coding: utf-8 -*-
"""删除文档里连续重复的段落（同一句话被插入两次时用于清理）。"""

import os
import sys

import docx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    for name in sys.argv[1:]:
        path = os.path.join(ROOT, name)
        document = docx.Document(path)
        removed = 0
        previous = None
        for paragraph in list(document.paragraphs):
            text = paragraph.text.strip()
            if text and previous is not None and text == previous:
                paragraph._element.getparent().remove(paragraph._element)
                removed += 1
                continue
            previous = text if text else previous
        if removed:
            document.save(path)
        print(f"{name}: removed {removed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
