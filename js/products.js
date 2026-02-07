/* ============================================
   Shop Savvy — Products List Page Logic
   Search, Filter, Sort, Pagination
   ============================================ */

(() => {
  const PRODUCTS_PER_PAGE = 12;
  let allProducts = [];
  let filteredProducts = [];
  let currentPage = 1;
  let currentSort = "relevance";
  let currentFilters = { category: null, brand: null, priceMin: null, priceMax: null };

  App.onReady(async () => {
    App.initNav();

    const data = await App.loadData();
    allProducts = data.products;

    // Read URL params
    const params = App.getUrlParams();
    if (params.q) {
      const searchInput = document.querySelector(".header__search-input");
      if (searchInput) searchInput.value = params.q;
    }
    if (params.category) currentFilters.category = params.category;
    if (params.brand) currentFilters.brand = params.brand;
    if (params.sort) currentSort = params.sort;
    if (params.page) currentPage = parseInt(params.page) || 1;

    // Build filter UI
    buildCategoryFilters(data.categories);
    buildBrandFilters(data.brands);

    // Restore sort select
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) sortSelect.value = currentSort;

    // Bind events
    bindEvents();

    // Initial render
    applyFiltersAndRender();

    // Update breadcrumb
    updateBreadcrumb(params.q, currentFilters.category);

    // Compare bar
    App.updateCompareBar();
  });

  function buildCategoryFilters(categories) {
    const container = document.getElementById("filter-categories");
    if (!container) return;

    const cats = categories.filter((c) => c.name !== "Uncategorized");
    container.innerHTML = cats
      .map(
        (cat) => `
        <label class="filter-option">
          <input type="radio" name="category" value="${cat.name}"
                 ${currentFilters.category === cat.name ? "checked" : ""}>
          ${cat.name}
          <span class="filter-option__count">(${cat.count})</span>
        </label>`
      )
      .join("");
  }

  function buildBrandFilters(brands) {
    const container = document.getElementById("filter-brands");
    if (!container) return;

    // Show top 20 brands by frequency
    const data = App.getData();
    const brandCounts = {};
    data.products.forEach((p) => {
      if (p.brand && p.brand !== "N/A") {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }
    });

    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    container.innerHTML = topBrands
      .map(
        ([brand, count]) => `
        <label class="filter-option">
          <input type="radio" name="brand" value="${brand}"
                 ${currentFilters.brand === brand ? "checked" : ""}>
          ${brand}
          <span class="filter-option__count">(${count})</span>
        </label>`
      )
      .join("");
  }

  function bindEvents() {
    // Category filter change
    document.querySelectorAll('input[name="category"]').forEach((input) => {
      input.addEventListener("change", () => {
        currentFilters.category = input.value;
        currentPage = 1;
        applyFiltersAndRender();
      });
    });

    // Brand filter change
    document.querySelectorAll('input[name="brand"]').forEach((input) => {
      input.addEventListener("change", () => {
        currentFilters.brand = input.value;
        currentPage = 1;
        applyFiltersAndRender();
      });
    });

    // Price filter
    const applyPriceBtn = document.getElementById("apply-price");
    if (applyPriceBtn) {
      applyPriceBtn.addEventListener("click", () => {
        const minEl = document.getElementById("price-min");
        const maxEl = document.getElementById("price-max");
        currentFilters.priceMin = minEl.value ? parseFloat(minEl.value) : null;
        currentFilters.priceMax = maxEl.value ? parseFloat(maxEl.value) : null;
        currentPage = 1;
        applyFiltersAndRender();
      });
    }

    // Sort
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        currentSort = sortSelect.value;
        currentPage = 1;
        applyFiltersAndRender();
      });
    }

    // Clear filters
    const clearBtn = document.getElementById("clear-filters");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        currentFilters = { category: null, brand: null, priceMin: null, priceMax: null };
        currentPage = 1;
        document.querySelectorAll('input[name="category"]').forEach((i) => (i.checked = false));
        document.querySelectorAll('input[name="brand"]').forEach((i) => (i.checked = false));
        const minEl = document.getElementById("price-min");
        const maxEl = document.getElementById("price-max");
        if (minEl) minEl.value = "";
        if (maxEl) maxEl.value = "";
        // Clear search
        const searchInput = document.querySelector(".header__search-input");
        if (searchInput) searchInput.value = "";
        window.history.replaceState({}, "", "products.html");
        applyFiltersAndRender();
        updateBreadcrumb(null, null);
      });
    }

    // Mobile filter toggle
    const filterToggle = document.getElementById("filters-toggle");
    const sidebar = document.getElementById("filters-sidebar");
    if (filterToggle && sidebar) {
      filterToggle.addEventListener("click", () => {
        sidebar.classList.toggle("filters--open");
        filterToggle.textContent = sidebar.classList.contains("filters--open")
          ? "\u2715 Hide Filters"
          : "\u2630 Show Filters";
      });
    }
  }

  function applyFiltersAndRender() {
    const params = App.getUrlParams();
    const query = params.q || "";

    // Search
    let results = App.searchProducts(query, allProducts);

    // Filter
    results = App.filterProducts(results, currentFilters);

    // Sort
    results = App.sortProducts(results, currentSort);

    filteredProducts = results;

    // Update URL
    App.setUrlParams({
      q: query || null,
      category: currentFilters.category,
      brand: currentFilters.brand,
      sort: currentSort !== "relevance" ? currentSort : null,
      page: currentPage > 1 ? currentPage : null,
    });

    // Paginate
    const pageInfo = App.paginate(filteredProducts, currentPage, PRODUCTS_PER_PAGE);

    // Render products
    renderProducts(pageInfo);

    // Render pagination
    renderPagination(pageInfo);

    // Update count
    const countEl = document.getElementById("results-count");
    if (countEl) {
      countEl.innerHTML = `Showing <strong>${pageInfo.items.length}</strong> of <strong>${pageInfo.total}</strong> products`;
    }
  }

  function renderProducts(pageInfo) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    if (pageInfo.items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state__icon">&#128270;</div>
          <div class="empty-state__title">No products found</div>
          <div class="empty-state__text">Try adjusting your search or filters.</div>
          <button class="btn btn--primary" onclick="document.getElementById('clear-filters').click()">Clear Filters</button>
        </div>`;
      return;
    }

    grid.innerHTML = pageInfo.items.map((p) => App.renderProductCard(p)).join("");
    App.bindCardButtons(grid);
  }

  function renderPagination(pageInfo) {
    const container = document.getElementById("pagination-container");
    if (!container) return;

    container.innerHTML = App.renderPagination(pageInfo);
    App.bindPagination(container, (page) => {
      currentPage = page;
      applyFiltersAndRender();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function updateBreadcrumb(query, category) {
    const el = document.getElementById("breadcrumb-current");
    if (!el) return;
    if (query) {
      el.textContent = `Search: "${query}"`;
    } else if (category) {
      el.textContent = category;
    } else {
      el.textContent = "All Products";
    }
  }
})();
