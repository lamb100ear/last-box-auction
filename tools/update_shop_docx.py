# -*- coding: utf-8 -*-
"""把检视玩法的改动同步进《再拍最后一箱 2.0 店铺界面策划案》。

只改动检视台相关的段落和两张表格，其余内容保持原样。
"""

import copy
import io
import os
import shutil
import sys

import docx
from docx.oxml.ns import qn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(ROOT, "再拍最后一箱 2.0 店铺界面策划案.docx")
DEFAULT_OUT = os.path.join(ROOT, "再拍最后一箱 2.0 店铺界面策划案（检视玩法改版）.docx")


def style_like(paragraph, text):
    """写入文字，并沿用该段落原有 run 的字体格式。"""
    runs = paragraph.runs
    if not runs:
        paragraph.add_run(text)
        return
    runs[0].text = text
    for run in runs[1:]:
        run.text = ""


def find(paragraphs, keyword, start=0):
    for index in range(start, len(paragraphs)):
        if keyword in paragraphs[index].text:
            return index
    raise SystemExit("找不到段落：%s" % keyword)


def insert_after(anchor, text):
    """在 anchor 之后插入一个新段落，并复制 anchor 的字体。"""
    new = anchor.insert_paragraph_before("", style=anchor.style)
    source = anchor._element
    anchor._element.addnext(new._element)
    run = new.add_run(text)
    rpr = source.find(qn("w:rPr"))
    if rpr is not None:
        run._element.insert(0, copy.deepcopy(rpr))
    return new


def rebuild_table(table, rows):
    """按给定内容重写表格，行列数必须一致或更少。"""
    while len(table.rows) > len(rows):
        table._tbl.remove(table.rows[-1]._tr)
    for row_index, values in enumerate(rows):
        if row_index >= len(table.rows):
            table.add_row()
        for col_index, value in enumerate(values):
            cell = table.rows[row_index].cells[col_index]
            paragraph = cell.paragraphs[0]
            style_like(paragraph, value)
            for extra in cell.paragraphs[1:]:
                extra._element.getparent().remove(extra._element)


def main():
    if not os.path.exists(DOCX):
        raise SystemExit("找不到策划案文档")
    backup = os.path.join(
        os.environ.get("TEMP", "."), "店铺界面策划案.bak.docx"
    )
    if not os.path.exists(backup):
        shutil.copy2(DOCX, backup)

    document = docx.Document(DOCX)

    # ---------- 1. 检视台操作列表 ----------
    intro = find(document.paragraphs, "检视台支持以下操作")
    paragraphs = document.paragraphs
    style_like(
        paragraphs[intro],
        "检视台支持以下三项常规操作。每件物品按模板、状态、来源、外观和隐藏信息"
        "随机配对 2 到 3 项，物品生成时确定并写入存档：",
    )
    style_like(paragraphs[intro + 1], "• 清洁。")
    style_like(paragraphs[intro + 2], "• 电路修复。")
    style_like(paragraphs[intro + 3], "• 放大镜检查。")
    for index in range(intro + 7, intro + 3, -1):
        element = paragraphs[index]._element
        element.getparent().remove(element)

    # ---------- 2. 玩法说明 ----------
    anchor = document.paragraphs[find(document.paragraphs, "普通物品的操作结果")]
    details = [
        "清洁：点击清洁刷后，光标变为清洁刷，在物品表面按住并拖动，污渍遮罩沿拖动"
        "轨迹消失，被遮住的刻印、编号或姓名随之露出。擦拭距离超出需求过多会留下划痕。",
        "电路修复：四颗螺丝分别卸下并落入零件托盘；螺丝未拆完时外壳卡住。外壳打开后"
        "把主板和接口排线拖进托盘，检查烧黑节点和断线，再把零件拖回幽灵槽位吸附，"
        "最后重新装好盖板和螺丝并通电测试。装错位置会留下缝隙，评价随之下降。",
        "放大镜检查：物品基础图和放大图同时存在，放大镜使用圆形裁剪蒙版显示 1.8 到"
        "2.5 倍的放大区域并跟随鼠标移动，可以发现真实年代、真实状态、真实来源、"
        "维修历史和来源完整性五项真实信息。",
        "真实信息与伪造层分开保存：放大镜负责发现真实信息，伪造材料负责覆盖对买家"
        "不利的信息，被覆盖的字段买家无法核验。",
    ]
    current = anchor
    for text in details:
        current = insert_after(current, text)

    style_like(
        document.paragraphs[find(document.paragraphs, "普通物品的操作结果")],
        "常规物品的操作结果包括物品状态、风险标记和已发现的问题。",
    )
    style_like(
        document.paragraphs[find(document.paragraphs, "操作完成后，物品回到检视台")],
        "操作完成后物品回到检视台或货架，结果按完美、合格、粗糙三级保存并写入物品实例，"
        "读档后污渍、零件、标签和伪造层状态不会重置。",
    )
    insert_after(
        document.paragraphs[find(document.paragraphs, "操作完成后物品回到检视台或货架")],
        "补充标签不再单独出现在检视台，统一并入伪造页面；伪造页面不创建新窗口。",
    )

    # ---------- 3. 逻辑层的操作结果表 ----------
    style_like(
        document.paragraphs[find(document.paragraphs, "普通物品只写入物品事实和风险标记")],
        "操作结果按完美、合格、粗糙三级保存，同时写入物品状态、损伤标记和真实信息覆盖状态。",
    )
    rebuild_table(
        document.tables[15],
        [
            ["操作", "完成方式", "评价依据", "价值修正"],
            ["清洁", "拖动清洁刷擦掉全部污渍", "擦拭距离超出需求越少越好", "完美 +4%，粗糙 -4%"],
            ["电路修复", "卸螺丝、取外壳、零件归位、通电", "装卸失误次数", "完美 +4%，粗糙 -4%"],
            ["放大镜检查", "移动放大镜找齐全部隐藏信息", "镜头对准每个位置的平均精度", "完美 +4%，粗糙 -4%"],
        ],
    )

    # ---------- 4. 界面层的检视台交互 ----------
    style_like(
        document.paragraphs[find(document.paragraphs, "检视台中央放大显示物品")],
        "检视台左侧是物品视图，工具图标固定在物品视图右上角，右侧信息栏依次是操作列表、"
        "已发现的问题、处理结果和万物通参考。",
    )
    rebuild_table(
        document.tables[20],
        [
            ["工具", "交互", "完成反馈"],
            ["清洁刷", "按住左键在物品表面拖动", "污渍沿轨迹消失，刻印和姓名露出"],
            ["电路修复", "点击螺丝和盖板，拖动零件", "零件吸附到幽灵槽位，线路通电"],
            ["放大镜", "镜头跟随鼠标移动", "局部放大 1.8 到 2.5 倍，读出真实信息"],
            ["伪造处理", "选择材料后拖到虚线区域", "伪造层覆盖真实信息，预览显示矛盾"],
        ],
    )
    style_like(
        document.paragraphs[find(document.paragraphs, "成功、合格、粗糙使用不同颜色和标记")],
        "成功、合格、粗糙使用不同颜色和标记，不使用大段说明。",
    )

    # ---------- 5. 存档字段补充 ----------
    archive = document.tables[11]
    for row in archive.rows:
        key = row.cells[0].text.strip()
        if key == "`item.facts`":
            rebuild_table(
                archive,
                [[cell.text for cell in row_item.cells] for row_item in archive.rows]
                + [["`item.operations`", "该物品分配到的 2 到 3 项常规操作"]]
                + [["`item.truth`", "五项真实信息及其发现和覆盖状态"]],
            )
            break

    # ---------- 6. 出售定价：价格过高提示 ----------
    price_line = find(document.paragraphs, "价格越高，买家放弃概率越高")
    style_like(
        document.paragraphs[price_line],
        "价格由玩家自行决定，默认停在参考售价中值。价格越高，买家放弃概率越高；"
        "标签越不可信，买家核验越严格。",
    )
    current = document.paragraphs[price_line]
    for text in [
        "当售价高于参考售价上限时，出售页面显示提示框："
        "“当前售价高于建议上限，成交后仍按你设定的价格结算，但买家放弃交易的概率会明显提高。”",
        "价格高于建议上限时，按超出比例下调买家的初始信任值，最多下调 20 点；"
        "成交概率同步下降，售价超出上限 50% 以上时成交概率减半。",
        "价格低于建议下限时，买家初始信任值上调，成交更快，但单次利润更低。",
    ]:
        current = insert_after(current, text)

    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    document.save(out)
    print("updated: %s" % out)
    print("backup : %s" % backup)


if __name__ == "__main__":
    sys.exit(main())
