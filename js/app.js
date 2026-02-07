/* ============================================
   Shop Savvy — Shared Application Module
   Data loading, cart, compare, search, toast, nav
   ============================================ */

const App = (() => {
  // ─── State ──────────────────────────────
  let _data = null; // { meta, categories, brands, products }
  let _dataPromise = null;

  // ─── Data Loading ───────────────────────
  async function loadData() {
    if (_data) return _data;
    if (_dataPromise) return _dataPromise;
    _dataPromise = fetch("data/products.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load products data");
        return r.json();
      })
      .then((json) => {
        _data = json;
        return _data;
      });
    return _dataPromise;
  }

  function getData() {
    return _data;
  }

  function getProductById(id) {
    if (!_data) return null;
    return _data.products.find((p) => p.product_id === String(id)) || null;
  }

  // ─── Search & Filter ───────────────────
  function searchProducts(query, products) {
    if (!query || !query.trim()) return products;
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    return products.filter((p) => {
      const text = [p.title, p.brand, p.description, p.category]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }

  function filterProducts(products, filters) {
    let result = [...products];

    if (filters.category) {
      result = result.filter((p) => p.category_top === filters.category);
    }

    if (filters.brand) {
      result = result.filter((p) => p.brand === filters.brand);
    }

    if (filters.priceMin != null) {
      result = result.filter(
        (p) => p.price != null && p.price >= filters.priceMin
      );
    }

    if (filters.priceMax != null) {
      result = result.filter(
        (p) => p.price != null && p.price <= filters.priceMax
      );
    }

    return result;
  }

  function sortProducts(products, sortBy) {
    const sorted = [...products];
    switch (sortBy) {
      case "price-asc":
        sorted.sort((a, b) => (a.price || 99999) - (b.price || 99999));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "name-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        // relevance: no sort change
        break;
    }
    return sorted;
  }

  function paginate(products, page, perPage = 12) {
    const totalPages = Math.ceil(products.length / perPage);
    const start = (page - 1) * perPage;
    return {
      items: products.slice(start, start + perPage),
      totalPages,
      currentPage: page,
      total: products.length,
    };
  }

  // ─── Cart (localStorage) ───────────────
  const CART_KEY = "shopsavvy_cart";

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent("cart-updated"));
  }

  function addToCart(productId, qty = 1) {
    const cart = getCart();
    const existing = cart.find((item) => item.id === String(productId));
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: String(productId), qty });
    }
    saveCart(cart);
    showToast("Added to quote list");
  }

  function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter((item) => item.id !== String(productId));
    saveCart(cart);
  }

  function updateCartQty(productId, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.id === String(productId));
    if (item) {
      item.qty = Math.max(1, qty);
      saveCart(cart);
    }
  }

  function clearCart() {
    saveCart([]);
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function updateCartBadge() {
    const badges = document.querySelectorAll(".cart-badge");
    const count = getCartCount();
    badges.forEach((badge) => {
      badge.textContent = count > 0 ? count : "";
    });
  }

  // ─── Compare (localStorage) ────────────
  const COMPARE_KEY = "shopsavvy_compare";
  const MAX_COMPARE = 4;

  function getCompareIds() {
    try {
      return JSON.parse(localStorage.getItem(COMPARE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCompareIds(ids) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
    updateCompareBadge();
    updateCompareBar();
    window.dispatchEvent(new CustomEvent("compare-updated"));
  }

  function addToCompare(productId) {
    const ids = getCompareIds();
    const pid = String(productId);
    if (ids.includes(pid)) {
      showToast("Already in compare list", "warning");
      return;
    }
    if (ids.length >= MAX_COMPARE) {
      showToast(`Compare up to ${MAX_COMPARE} products`, "warning");
      return;
    }
    ids.push(pid);
    saveCompareIds(ids);
    showToast("Added to compare");
  }

  function removeFromCompare(productId) {
    let ids = getCompareIds();
    ids = ids.filter((id) => id !== String(productId));
    saveCompareIds(ids);
  }

  function clearCompare() {
    saveCompareIds([]);
  }

  function isInCompare(productId) {
    return getCompareIds().includes(String(productId));
  }

  function updateCompareBadge() {
    const badges = document.querySelectorAll(".compare-badge");
    const count = getCompareIds().length;
    badges.forEach((badge) => {
      badge.textContent = count > 0 ? count : "";
    });
  }

  function updateCompareBar() {
    const bar = document.querySelector(".compare-bar");
    if (!bar) return;
    const ids = getCompareIds();
    if (ids.length === 0) {
      bar.classList.remove("compare-bar--visible");
      return;
    }
    bar.classList.add("compare-bar--visible");
    const container = bar.querySelector(".compare-bar__items");
    if (container && _data) {
      container.innerHTML = ids
        .map((id) => {
          const p = getProductById(id);
          if (!p) return "";
          const name =
            p.title.length > 30 ? p.title.substring(0, 30) + "..." : p.title;
          return `<span class="compare-bar__item">
            ${name}
            <span class="compare-bar__item-remove" data-id="${id}" title="Remove">&times;</span>
          </span>`;
        })
        .join("");
      container.querySelectorAll(".compare-bar__item-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          removeFromCompare(btn.dataset.id);
        });
      });
    }
  }

  // ─── Toast Notifications ───────────────
  function showToast(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "alert");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ─── URL Helpers ────────────────────────
  function getUrlParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }

  function setUrlParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") {
        url.searchParams.set(k, v);
      } else {
        url.searchParams.delete(k);
      }
    });
    window.history.replaceState({}, "", url);
  }

  // ─── Price Formatter ───────────────────
  function formatPrice(price, unit) {
    if (price == null) return '<span class="product-card__price--na">Price unavailable</span>';
    return `$${price.toFixed(2)} <span class="product-card__price-unit">${unit || "/ each"}</span>`;
  }

  // ─── Product Card HTML ─────────────────
  function renderProductCard(product) {
    const imgSrc = product.image_url || "https://via.placeholder.com/300x200?text=No+Image";
    const priceHTML =
      product.price != null
        ? `$${product.price.toFixed(2)} <span class="product-card__price-unit">${product.price_unit || "/ each"}</span>`
        : '<span class="product-card__price--na">Price unavailable</span>';
    const inCompare = isInCompare(product.product_id);

    return `<article class="product-card">
      <img class="product-card__image" src="${imgSrc}" alt="${product.title}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <div class="product-card__body">
        <div class="product-card__category">${product.category_top || "Uncategorized"}</div>
        <h3 class="product-card__title">
          <a href="product.html?id=${product.product_id}">${product.title}</a>
        </h3>
        <div class="product-card__sku">SKU: ${product.grainger_part_number || "N/A"}</div>
        <div class="product-card__brand">${product.brand || "N/A"}</div>
        <div class="product-card__footer">
          <div class="product-card__price">${priceHTML}</div>
          <div class="product-card__actions">
            <button class="btn btn--sm btn--primary add-to-cart-btn" data-id="${product.product_id}"
                    title="Add to Quote List" aria-label="Add ${product.title} to quote list">
              &#128722;
            </button>
            <button class="btn btn--sm ${inCompare ? "btn--success" : "btn--secondary"} compare-toggle-btn"
                    data-id="${product.product_id}"
                    title="${inCompare ? "In compare" : "Add to compare"}"
                    aria-label="${inCompare ? "Remove from compare" : "Add to compare"}">
              &#9878;
            </button>
          </div>
        </div>
      </div>
    </article>`;
  }

  // ─── Bind Card Buttons ─────────────────
  function bindCardButtons(container) {
    container.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        addToCart(btn.dataset.id);
      });
    });
    container.querySelectorAll(".compare-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        if (isInCompare(id)) {
          removeFromCompare(id);
          btn.classList.remove("btn--success");
          btn.classList.add("btn--secondary");
        } else {
          addToCompare(id);
          btn.classList.add("btn--success");
          btn.classList.remove("btn--secondary");
        }
      });
    });
  }

  // ─── Pagination HTML ───────────────────
  function renderPagination(pageInfo, onPageChange) {
    const { totalPages, currentPage } = pageInfo;
    if (totalPages <= 1) return "";

    let html = '<nav class="pagination" aria-label="Pagination">';
    html += `<button class="pagination__btn" ${currentPage <= 1 ? "disabled" : ""} data-page="${currentPage - 1}">&laquo; Prev</button>`;

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    if (start > 1) {
      html += `<button class="pagination__btn" data-page="1">1</button>`;
      if (start > 2) html += `<span class="pagination__btn" style="border:none;">&hellip;</span>`;
    }

    for (let i = start; i <= end; i++) {
      html += `<button class="pagination__btn ${i === currentPage ? "pagination__btn--active" : ""}" data-page="${i}">${i}</button>`;
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += `<span class="pagination__btn" style="border:none;">&hellip;</span>`;
      html += `<button class="pagination__btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="pagination__btn" ${currentPage >= totalPages ? "disabled" : ""} data-page="${currentPage + 1}">Next &raquo;</button>`;
    html += "</nav>";
    return html;
  }

  function bindPagination(container, callback) {
    container.querySelectorAll(".pagination__btn[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page)) callback(page);
      });
    });
  }

  // ─── Category Icons (emoji map) ────────
  const CATEGORY_ICONS = {
    Fasteners: "\u{1F529}",
    Plumbing: "\u{1F6BF}",
    Safety: "\u{1F6E1}\uFE0F",
    Tools: "\u{1F527}",
    "HVAC and Refrigeration": "\u{2744}\uFE0F",
    Machining: "\u{2699}\uFE0F",
    "Material Handling": "\u{1F4E6}",
    "Pipe, Hose, Tube & Fittings": "\u{1F6B0}",
    Security: "\u{1F512}",
    Pneumatics: "\u{1F4A8}",
    Electrical: "\u{26A1}",
    "Fleet & Vehicle Maintenance": "\u{1F69A}",
    "Furniture, Hospitality and Food Service": "\u{1FA91}",
    Lighting: "\u{1F4A1}",
    "Lab Supplies": "\u{1F52C}",
    "Outdoor Equipment": "\u{1F333}",
    "Cleaning and Janitorial": "\u{1F9F9}",
    "Test Instruments": "\u{1F4CF}",
    "Welding and Soldering": "\u{1F525}",
    Uncategorized: "\u{1F4CB}",
  };

  function getCategoryIcon(cat) {
    return CATEGORY_ICONS[cat] || "\u{1F4E6}";
  }

  // ─── Navigation Init ──────────────────
  function initNav() {
    // Mobile menu toggle
    const toggle = document.querySelector(".header__menu-toggle");
    const nav = document.querySelector(".header__nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        nav.classList.toggle("header__nav--open");
        const expanded = nav.classList.contains("header__nav--open");
        toggle.setAttribute("aria-expanded", expanded);
      });
    }

    // Search form in header
    const searchForm = document.querySelector(".header__search");
    if (searchForm) {
      const input = searchForm.querySelector(".header__search-input");
      const btn = searchForm.querySelector(".header__search-btn");
      const doSearch = () => {
        const q = input.value.trim();
        if (q) {
          window.location.href = `products.html?q=${encodeURIComponent(q)}`;
        }
      };
      if (btn) btn.addEventListener("click", doSearch);
      if (input) {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") doSearch();
        });
      }
    }

    // Update badges
    updateCartBadge();
    updateCompareBadge();
  }

  // ─── Init on DOM Ready ─────────────────
  function onReady(callback) {
    if (document.readyState !== "loading") {
      callback();
    } else {
      document.addEventListener("DOMContentLoaded", callback);
    }
  }

  // ─── Public API ────────────────────────
  return {
    loadData,
    getData,
    getProductById,
    searchProducts,
    filterProducts,
    sortProducts,
    paginate,
    getCart,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    getCartCount,
    updateCartBadge,
    getCompareIds,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    updateCompareBadge,
    updateCompareBar,
    showToast,
    getUrlParams,
    setUrlParams,
    formatPrice,
    renderProductCard,
    bindCardButtons,
    renderPagination,
    bindPagination,
    getCategoryIcon,
    initNav,
    onReady,
  };
})();
