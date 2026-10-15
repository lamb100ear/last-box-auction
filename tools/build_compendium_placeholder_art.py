# -*- coding: utf-8 -*-
"""生成图鉴占位美术，让图鉴每一项都有确定文件名。

- 物品：美术/物品/by-id/<模板 ID>.png，缺哪个补哪个（复用现有最接近的图）。
- 箱子：美术/2.0/compendium/箱子_<来源 ID>.png，统一先复用 2.0 箱子图。

美术出正式图后覆盖同名文件即可，不需要改代码。
"""

import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS = os.path.join(ROOT, "美术", "物品")
BY_ID = os.path.join(ITEMS, "by-id")
BOX_DIR = os.path.join(ROOT, "美术", "2.0", "compendium")

# 物品模板 -> 先用哪张现有图占位
ITEM_PLACEHOLDERS = {
    "instant_camera": "starter_camera.png",
    "wedding_rings": "stage2_silver_ring.png",
    "love_letter": "paper.png",
    "postcards": "paper.png",
    "bridal_jewelry": "painting.png",
    "ring_light": "starter_lamp.png",
    "portable_camera": "compact_camera.png",
    "designer_bag": "bag.png",
    "endorsement_contract": "paper.png",
    "backup_phone": "phone.png",
    "old_stethoscope": "phone_strap.png",
    "anonymous_records": "paper.png",
    "medicine_case": "bottle.png",
    "old_scissors": "starter_box.png",
    "clinic_sign": "paper.png",
    "gold_watch": "starter_watch.png",
    "antique_tea_set": "painting.png",
    "stock_documents": "paper.png",
    "old_will": "paper.png",
    "small_painting": "painting.png"
}

BOX_ORIGINS = [
    "airport_long_storage",
    "airport_lost_found",
    "station_warehouse",
    "hotel_left",
    "private_consignment",
    "old_house_clearance",
    "bankruptcy_liquidation",
    "auction_return",
    "anonymous_consignment"
]


def main():
    os.makedirs(BOX_DIR, exist_ok=True)
    made = []
    missing = []
    for template, source in ITEM_PLACEHOLDERS.items():
        target = os.path.join(BY_ID, f"{template}.png")
        if os.path.exists(target):
            continue
        source_path = os.path.join(ITEMS, source)
        if not os.path.exists(source_path):
            source_path = os.path.join(BY_ID, source)
        if not os.path.exists(source_path):
            missing.append(source)
            continue
        shutil.copyfile(source_path, target)
        made.append(target)
    box_source = os.path.join(ROOT, "美术", "2.0", "auction", "当前箱子.png")
    for origin in BOX_ORIGINS:
        target = os.path.join(BOX_DIR, f"箱子_{origin}.png")
        if os.path.exists(target):
            continue
        shutil.copyfile(box_source, target)
        made.append(target)
    # 收纳盒两个新弹层的占位图
    shop_dir = os.path.join(ROOT, "美术", "2.0", "shop")
    sheet_source = os.path.join(shop_dir, "物品详情窗口.png")
    if os.path.exists(sheet_source):
        for name in ["收纳盒窗口", "收纳盒确认"]:
            target = os.path.join(shop_dir, f"{name}.png")
            if os.path.exists(target):
                continue
            shutil.copyfile(sheet_source, target)
            made.append(target)
    print(f"created {len(made)} placeholder files")
    if missing:
        print("missing source art:", ", ".join(sorted(set(missing))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
