/* ============================================
   Shop Savvy — Home Page Logic
   ============================================ */

App.onReady(async () => {
  App.initNav();

  // Hero search
  const heroInput = document.getElementById("hero-search");
  const heroBtn = document.getElementById("hero-search-btn");
  if (heroInput && heroBtn) {
    const doSearch = () => {
      const q = heroInput.value.trim();
      if (q) {
        window.location.href = `products.html?q=${encodeURIComponent(q)}`;
      }
    };
    heroBtn.addEventListener("click", doSearch);
    heroInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }

  // Load data
  const data = await App.loadData();

  // Render categories
  renderCategories(data.categories);

  // Render featured products (random selection)
  renderFeatured(data.products);

  // Update compare bar
  App.updateCompareBar();
});

function renderCategories(categories) {
  const grid = document.getElementById("categories-grid");
  if (!grid) return;

  // Filter out 'Uncategorized' and show top categories
  const cats = categories.filter((c) => c.name !== "Uncategorized").slice(0, 12);

  grid.innerHTML = cats
    .map(
      (cat) => `
      <a href="products.html?category=${encodeURIComponent(cat.name)}" class="category-card" aria-label="Browse ${cat.name}">
        <div class="category-card__icon">${App.getCategoryIcon(cat.name)}</div>
        <div class="category-card__name">${cat.name}</div>
        <div class="category-card__count">${cat.count} product${cat.count !== 1 ? "s" : ""}</div>
      </a>
    `
    )
    .join("");
}

function renderFeatured(products) {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;

  // Pick 8 random products that have prices and images
  const withPrice = products.filter((p) => p.price != null && p.image_url);
  const shuffled = withPrice.sort(() => 0.5 - Math.random());
  const featured = shuffled.slice(0, 8);

  grid.innerHTML = featured.map((p) => App.renderProductCard(p)).join("");
  App.bindCardButtons(grid);
}
