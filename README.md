# Shop Savvy — Industrial Product Catalog

A simplified, Grainger-like industrial product catalog built for **SparkHacks 2026**. Search, compare, and build quote lists from 100+ industrial products — all in the browser with vanilla HTML, CSS, and JavaScript.

## Features

- **Product Catalog** — Browse 169 products across 24 categories
- **Keyword Search** — Search across titles, brands, descriptions, and categories
- **Filters & Sorting** — Filter by category, brand, and price range; sort by price or name
- **Product Details** — Full specification tables with organized key-value data
- **Compare (2–4 products)** — Side-by-side comparison table with highlighted differences
- **Quote Builder** — Add items, adjust quantities, see totals, and export as CSV
- **Responsive Design** — Works on desktop and mobile
- **Accessibility** — Keyboard navigation, ARIA labels, focus states, skip navigation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Data | Static JSON (preprocessed from Kaggle CSV) |
| Search & Filters | Client-side JavaScript |
| State | localStorage (cart & compare) |

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Himanshu-1804/Spark-Hacks-2026.git
cd Spark-Hacks-2026
```

### 2. Serve locally

Since this is a static site that loads JSON via `fetch()`, you need a local server:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .

# VS Code: use the "Live Server" extension
```

Then open [http://localhost:8000](http://localhost:8000).

### 3. (Optional) Regenerate product data

If you update the CSV dataset, re-run the conversion script:

```bash
python3 scripts/convert_csv.py
```

This reads `grainger_data_2022_01.csv` and writes `data/products.json`.

## Project Structure

```
├── index.html              # Home page
├── products.html           # Product listing (search, filter, sort)
├── product.html            # Product detail page
├── compare.html            # Compare products side-by-side
├── cart.html               # Quote list / cart
├── about.html              # About & help
├── css/
│   └── styles.css          # Global stylesheet
├── js/
│   ├── app.js              # Shared: data, cart, compare, search, UI
│   ├── home.js             # Home page logic
│   ├── products.js         # Product listing logic
│   ├── product-detail.js   # Product detail logic
│   ├── compare.js          # Compare page logic
│   └── cart.js             # Cart/quote builder logic
├── data/
│   └── products.json       # Preprocessed product dataset
├── scripts/
│   └── convert_csv.py      # CSV → JSON conversion script
└── grainger_data_2022_01.csv  # Raw Kaggle dataset
```

## Data Source

Product data from the [Kaggle Grainger Products Database (140k records)](https://www.kaggle.com/datasets/thedevastator/grainger-products-database-140k-records/data). This is a static snapshot — not real-time inventory.

> **Disclaimer:** Always verify specs and pricing before purchasing. This is a demo application.

## Team

- **Himanshu Panchal**
- **Anthony Valenzo**
- **Mario Tabares**

## License

SparkHacks 2026 — University of Illinois at Chicago
