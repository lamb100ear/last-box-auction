# -*- coding: utf-8 -*-
"""生成《再拍最后一箱 2.0 物品清单》并同步检视规则到店铺策划案。"""

import copy
import io
import os
import re
import sys

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "js", "data.js")
SHOP = os.path.join(ROOT, "再拍最后一箱 2.0 店铺界面策划案.docx")
OUT = os.path.join(ROOT, "再拍最后一箱 2.0 物品清单.docx")

CATEGORY_LABEL = {
    "junk": "垃圾",
    "common": "普通物品",
    "luxury": "奢侈品"
}
THEME_LABEL = {
    "honeymoon": "蜜月旅客",
    "influencer": "网红博主",
    "doctor": "医生",
    "retired_rich": "退休富人",
    "student": "学生",
    "business": "商务旅客"
}
# 可以按违禁品生成的模板。
CONTRABAND = {"medicine_case", "anonymous_records"}

RULE_OLD = "操作按物品性质配对"
RULE_NEW = (
    "操作与物品性质对应：所有物品都需要清洁和放大镜检查；只有用电的物品"
    "（相机、拍立得、收音机、手机、台灯等）和内部结构复杂的机械物品（表、钟、罗盘）才有电路修复，"
    "其余物品不出现拆装操作，像档案、票据、织物和手术剪这类简单物品不会有通电测试。"
)

# 线索物品：不属于 20 件可拍物品，只在对应买家的故事线里出现。
# 字段：物品名称、所属买家、类型、发现方式、关键词。
CLUE_ITEMS = [
    ("手织毛衣", "纸鹤收藏", "核心", "清洁和整理", "领口布标、1986"),
    ("未寄出的邮寄单", "纸鹤收藏", "线索一", "标签检查", "永和路 17 号、福利院"),
    ("毛线记账本", "纸鹤收藏", "线索二", "纸张修复", "四十件毛衣、每年一件"),
    ("旧账本", "蓝账本", "核心", "拆开夹页", "夹页手写、感谢信"),
    ("手写转账单", "蓝账本", "线索一", "标签检查", "1996 年 7 月、宏源纺织厂"),
    ("无名感谢信", "蓝账本", "线索二", "纸张修复", "何小满、二十封"),
    ("旧行李箱", "旧货狐狸", "核心", "放大镜检查", "箱内衬、指纹"),
    ("未寄出的报警回执", "旧货狐狸", "线索一", "标签检查", "失踪案、十年前"),
    ("当票存根", "旧货狐狸", "线索二", "纸张修复", "老狐狸、三次赎回"),
    ("超期寄存箱", "七号仓库", "核心", "标签检查", "入库日期、签名"),
    ("旧值班表", "七号仓库", "线索一", "放大镜", "X-09、停业第二天"),
    ("手写入库单", "七号仓库", "线索二", "纸张修复", "B-3 批、补录"),
    ("十二件套银餐具", "绒布经纪人", "核心", "清洁和校对", "十二件、少一件"),
    ("拍卖行成交单", "绒布经纪人", "线索一", "标签检查", "同样少一件、连续三年"),
    ("修复店工单", "绒布经纪人", "线索二", "放大镜", "缺口人为、同一手法"),
    ("旧录音带", "午夜电台", "核心", "检查标签", "最后一次试录"),
    ("手写节目单", "午夜电台", "线索一", "标签检查", "1994 年 3 月"),
    ("电台工牌", "午夜电台", "线索二", "放大镜", "周岚"),
]


def read_templates():
    text = io.open(DATA, encoding="utf-8").read()
    start = text.index("export const ITEM_TEMPLATES")
    block = text[start:]
    pattern = re.compile(
        r'id:\s*"([a-z0-9_]+)",\s*'
        r'name:\s*"([^"]+)",\s*'
        r'category:\s*"([a-z]+)",\s*'
        r'baseValue:\s*(\d+),\s*'
        r'ownerTheme:\s*"([a-z_]+)",\s*'
        r'description:\s*"([^"]+)"'
    )
    rows = []
    for match in pattern.finditer(block):
        rows.append(
            {
                "id": match.group(1),
                "name": match.group(2),
                "category": match.group(3),
                "value": int(match.group(4)),
                "theme": match.group(5),
                "description": match.group(6)
            }
        )
    return rows


def style_like(paragraph, text):
    runs = paragraph.runs
    if not runs:
        paragraph.add_run(text)
        return
    runs[0].text = text
    for run in runs[1:]:
        run.text = ""


def main():
    items = read_templates()
    print("items:", len(items))

    document = docx.Document()
    heading = document.add_paragraph()
    run = heading.add_run("《再拍最后一箱！》2.0 物品清单")
    run.bold = True
    run.font.size = Pt(16)
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    note = document.add_paragraph()
    note_run = note.add_run(
        "共 %d 件物品。价值类型分垃圾、普通物品、奢侈品、违禁品四类；"
        "无标签药盒和匿名病历在生成时有概率成为违禁品。" % len(items)
    )
    note_run.font.size = Pt(10)

    table = document.add_table(rows=1, cols=5)
    table.style = "Table Grid"
    headers = ["物品名称", "价值类型", "基础价值", "所属主题", "简述"]
    for index, text in enumerate(headers):
        style_like(table.rows[0].cells[index].paragraphs[0], text)

    for item in items:
        row = table.add_row()
        category = (
            "违禁品" if item["id"] in CONTRABAND else CATEGORY_LABEL.get(item["category"], "普通物品")
        )
        values = [
            item["name"],
            category,
            "¥%d" % item["value"],
            THEME_LABEL.get(item["theme"], item["theme"]),
            item["description"]
        ]
        for index, text in enumerate(values):
            style_like(row.cells[index].paragraphs[0], text)

    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                for item_run in paragraph.runs:
                    item_run.font.size = Pt(10)

    clue_heading = document.add_paragraph()
    clue_run = clue_heading.add_run("线索物品")
    clue_run.bold = True
    clue_run.font.size = Pt(14)
    clue_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    clue_note = document.add_paragraph()
    clue_note_run = clue_note.add_run(
        "共 %d 件线索物品。线索物品从拍卖箱里随机开出，每件只会出现一次；"
        "开出后即解锁对应买家的故事线。线索物品在检视台处理后，"
        "关键词会以重点色标出并自动记入记事本，随后可在万物通中查询。"
        % len(CLUE_ITEMS)
    )
    clue_note_run.font.size = Pt(10)

    clue_table = document.add_table(rows=1, cols=5)
    clue_table.style = "Table Grid"
    clue_headers = ["物品名称", "所属买家", "类型", "发现方式", "关键词"]
    for index, text in enumerate(clue_headers):
        style_like(clue_table.rows[0].cells[index].paragraphs[0], text)

    for name, buyer, kind, find_way, keywords in CLUE_ITEMS:
        row = clue_table.add_row()
        for index, text in enumerate([name, buyer, kind, find_way, keywords]):
            style_like(row.cells[index].paragraphs[0], text)

    for row in clue_table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                for item_run in paragraph.runs:
                    item_run.font.size = Pt(10)

    document.save(OUT)
    print("wrote:", os.path.basename(OUT))

    shop = docx.Document(SHOP)
    shop_changed = False
    for paragraph in shop.paragraphs:
        if RULE_OLD in paragraph.text:
            style_like(paragraph, RULE_NEW)
            shop_changed = True
            break
    for paragraph in shop.paragraphs:
        if paragraph.text.startswith("检视台支持以下三项常规操作"):
            style_like(
                paragraph,
                "检视台支持清洁、放大镜检查、电路修复三项操作。"
                "每件物品固定拥有清洁和放大镜检查，只有用电或内部结构复杂的物品才有电路修复。",
            )
            shop_changed = True
            break
    if shop_changed:
        shop.save(SHOP)
        print("updated: 店铺界面策划案")
    else:
        print("skip: 店铺界面策划案无需改动")


if __name__ == "__main__":
    sys.exit(main())
