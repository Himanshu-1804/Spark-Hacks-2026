#!/usr/bin/env python3
"""
Convert Grainger CSV dataset to clean JSON for GraingeSeek frontend.

Usage:
    python3 scripts/convert_csv.py

Reads:  grainger_data_2022_01.csv
Writes: data/products.json
"""

import csv
import json
import re
import os
import sys
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "grainger_data_2022_01.csv"
OUT_PATH = ROOT / "data" / "products.json"

MAX_PRODUCTS = 5000  # Keep subset for performance


def clean_price(raw: str) -> float | None:
    """Extract numeric price from string like '$9.37'."""
    if not raw or raw.strip() in ("", "None", "Unnamed: 9"):
        return None
    match = re.search(r"[\d,]+\.?\d*", raw.replace(",", ""))
    if match:
        try:
            return round(float(match.group()), 2)
        except ValueError:
            return None
    return None


def clean_str(val: str) -> str:
    """Trim whitespace; return 'N/A' for empty/None."""
    if not val or val.strip() in ("", "None", "none", "Unnamed: 6", "Unnamed: 9"):
        return "N/A"
    return val.strip()


def clean_image_url(url: str) -> str:
    """Ensure image URL is fully qualified."""
    url = clean_str(url)
    if url == "N/A":
        return ""
    if not url.startswith("http"):
        url = "https://" + url
    return url


def extract_category_parts(cat_path: str) -> dict:
    """Parse 'Product Categories/Fasteners/...' into parts."""
    parts = [p.strip() for p in cat_path.split("/") if p.strip()]
    # Remove 'Product Categories' prefix if present
    if parts and parts[0].lower() == "product categories":
        parts = parts[1:]
    # Validate: top-level category should be at least 3 chars
    # Single letters like "N" indicate a CSV parsing issue
    if not parts or len(parts[0]) < 3:
        return {
            "full_path": "Uncategorized",
            "top_level": "Uncategorized",
            "sub_level": "Uncategorized",
            "leaf": "Uncategorized",
        }
    return {
        "full_path": " > ".join(parts) if parts else "N/A",
        "top_level": parts[0] if len(parts) > 0 else "N/A",
        "sub_level": parts[1] if len(parts) > 1 else "N/A",
        "leaf": parts[-1] if parts else "N/A",
    }


def parse_description(desc: str) -> dict:
    """Parse pipe-separated spec string into key-value pairs."""
    specs = {}
    if not desc or desc.strip() in ("", "None"):
        return specs
    pairs = desc.split("|")
    for pair in pairs:
        pair = pair.strip()
        if ":" in pair:
            key, _, val = pair.partition(":")
            key = key.strip()
            val = val.strip()
            if key and val:
                specs[key] = val
    return specs


def process_row(row: list, idx: int) -> dict | None:
    """Convert a CSV row to a clean product dict."""
    # CSV columns (based on dataset analysis):
    # 0: index
    # 1: product_url
    # 2: title (short description)
    # 3: brand
    # 4: UNSPSC code
    # 5: grainger_part_number
    # 6: manufacturer_model
    # 7: unnamed (often empty or UPC-like)
    # 8: price
    # 9: price_unit
    # 10: list_price (often unnamed/empty)
    # 11: description (pipe-separated specs)
    # 12: image_url
    # 13: category
    # 14: compliance_html
    # 15: uuid
    # 16: date_added

    if len(row) < 14:
        return None

    title = clean_str(row[2])
    brand = clean_str(row[3])
    price = clean_price(row[8])
    price_unit = clean_str(row[9])
    image_url = clean_image_url(row[12])
    category_raw = clean_str(row[13])
    category = extract_category_parts(category_raw)
    description_raw = clean_str(row[11])
    specs = parse_description(row[11])

    # Build short description from title
    short_desc = title
    if len(title) > 120:
        short_desc = title[:117] + "..."

    product = {
        "product_id": str(idx),
        "title": title,
        "short_description": short_desc,
        "brand": brand,
        "price": price,
        "price_unit": price_unit if price_unit != "N/A" else "/ each",
        "image_url": image_url,
        "category": category["full_path"],
        "category_top": category["top_level"],
        "category_sub": category["sub_level"],
        "description": description_raw,
        "specs": specs,
        "grainger_part_number": clean_str(row[5]) if len(row) > 5 else "N/A",
        "manufacturer_model": clean_str(row[6]) if len(row) > 6 else "N/A",
        "product_url": clean_str(row[1]) if len(row) > 1 else "",
        "date_added": clean_str(row[16]) if len(row) > 16 else "N/A",
    }

    # Skip products with no meaningful title
    if product["title"] == "N/A":
        return None

    return product


def main():
    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found at {CSV_PATH}")
        sys.exit(1)

    products = []
    seen_ids = set()
    skipped = 0

    print(f"Reading {CSV_PATH} ...")

    with open(CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        header = next(reader, None)  # Skip header row

        for i, row in enumerate(reader, start=1):
            if len(products) >= MAX_PRODUCTS:
                break

            product = process_row(row, i)
            if product is None:
                skipped += 1
                continue

            # Deduplicate
            key = product["grainger_part_number"]
            if key != "N/A" and key in seen_ids:
                skipped += 1
                continue
            if key != "N/A":
                seen_ids.add(key)

            products.append(product)

    # Build category/brand indexes for filters
    categories = {}
    brands = set()
    for p in products:
        cat = p["category_top"]
        if cat != "N/A":
            categories[cat] = categories.get(cat, 0) + 1
        b = p["brand"]
        if b != "N/A":
            brands.add(b)

    output = {
        "meta": {
            "total_products": len(products),
            "generated": "2026-02-07",
            "source": "Kaggle Grainger Products Database",
        },
        "categories": [
            {"name": k, "count": v}
            for k, v in sorted(categories.items(), key=lambda x: -x[1])
        ],
        "brands": sorted(brands),
        "products": products,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Done! Wrote {len(products)} products to {OUT_PATH}")
    print(f"Skipped {skipped} rows (incomplete/duplicate)")
    print(f"Categories: {len(categories)}")
    print(f"Brands: {len(brands)}")


if __name__ == "__main__":
    main()
