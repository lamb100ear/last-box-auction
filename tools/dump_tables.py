# -*- coding: utf-8 -*-
"""把 docx 里的表格导出成 UTF-8 文本，方便终端查看。"""

import os
import sys

import docx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    lines = []
    for name in sys.argv[1:]:
        document = docx.Document(os.path.join(ROOT, name))
        lines.append("=" * 30 + " " + name)
        for index, table in enumerate(document.tables):
            lines.append("--- table %d (%dx%d)" % (index, len(table.rows), len(table.columns)))
            for row in table.rows:
                lines.append(" | ".join(cell.text.strip().replace("\n", " ") for cell in row.cells))
    output = os.path.join(ROOT, "tools", "_tables.txt")
    with open(output, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    print("wrote", output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
