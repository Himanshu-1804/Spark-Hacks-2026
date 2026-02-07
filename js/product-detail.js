/* ============================================
   GraingeSeek  Product Detail Page Logic
   ============================================ */

App.onReady(async () => {
  App.initNav();

  const params = App.getUrlParams();
  const productId = params.id;

  if (!productId) {
    showError("No product ID specified.");
    return;
  }

  const data = await App.loadData();
  const product = App.getProductById(productId);

  if (!product) {
    showError("Product not found.");
    return;
  }

  document.title = `${product.title}  GraingeSeek`;
  renderProduct(product);
  renderSpecs(product);
  renderSuggested(product, data.products);
  App.updateCompareBar();
});

function renderProduct(product) {
  const container = document.getElementById("product-detail");
  if (!container) return;

  const imgSrc = product.image_url || "https://via.placeholder.com/400x400?text=No+Image";
  const priceHTML =
    product.price != null
      ? `$${product.price.toFixed(2)}`
      : "Price unavailable";
  const priceClass = product.price != null ? "pdp__price" : "pdp__price" + " product-card__price--na";
  const inCompare = App.isInCompare(product.product_id);

  container.innerHTML = `
    <div class="pdp">
      <div class="pdp__image-wrap">
        <img class="pdp__image" src="${imgSrc}" alt="${product.title}"
             onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
      </div>
      <div class="pdp__info">
        <div class="pdp__brand">${product.brand || "N/A"}</div>
        <h1 class="pdp__title">${product.title}</h1>
        <div class="pdp__sku-row">
          <span>SKU: ${product.grainger_part_number || "N/A"}</span>
          <span>Model: ${product.manufacturer_model || "N/A"}</span>
        </div>

        <div class="${priceClass}">${priceHTML}</div>
        <div class="pdp__price-unit">${product.price_unit || "/ each"}</div>

        <div class="pdp__category-link">
          Category: <a href="products.html?category=${encodeURIComponent(product.category_top)}">${product.category}</a>
        </div>

        <div class="pdp__actions">
          <input type="number" class="pdp__qty" id="qty-input" value="1" min="1" aria-label="Quantity">
          <button class="btn btn--primary" id="add-to-cart-btn">
            &#128722; Add to Quote List
          </button>
          <button class="btn ${inCompare ? "btn--success" : "btn--outline"}" id="compare-btn">
            &#9878; ${inCompare ? "In Compare" : "Compare"}
          </button>
        </div>

        ${product.product_url && product.product_url !== "N/A"
          ? `<a href="${product.product_url}" target="_blank" rel="noopener" class="btn btn--secondary btn--sm" style="align-self: flex-start;">
               View on Grainger.com &rarr;
             </a>`
          : ""}
      </div>
    </div>`;

  // Update breadcrumb
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");
  if (breadcrumbCurrent) {
    const breadcrumb = document.getElementById("breadcrumb");
    // Insert category link before current
    const catLink = document.createElement("a");
    catLink.href = `products.html?category=${encodeURIComponent(product.category_top)}`;
    catLink.textContent = product.category_top;
    const sep = document.createElement("span");
    sep.className = "breadcrumb__sep";
    sep.textContent = "/";
    breadcrumb.insertBefore(sep, breadcrumbCurrent);
    breadcrumb.insertBefore(catLink, sep);
    breadcrumbCurrent.textContent = product.title.length > 50
      ? product.title.substring(0, 50) + "..."
      : product.title;
  }

  // Bind add to cart
  document.getElementById("add-to-cart-btn").addEventListener("click", () => {
    const qty = parseInt(document.getElementById("qty-input").value) || 1;
    App.addToCart(product.product_id, qty);
  });

  // Bind compare
  document.getElementById("compare-btn").addEventListener("click", () => {
    const btn = document.getElementById("compare-btn");
    if (App.isInCompare(product.product_id)) {
      App.removeFromCompare(product.product_id);
      btn.classList.remove("btn--success");
      btn.classList.add("btn--outline");
      btn.innerHTML = "&#9878; Compare";
    } else {
      App.addToCompare(product.product_id);
      btn.classList.add("btn--success");
      btn.classList.remove("btn--outline");
      btn.innerHTML = "&#9878; In Compare";
    }
  });
}

function renderSpecs(product) {
  const container = document.getElementById("specs-section");
  if (!container) return;

  const specs = product.specs;
  if (!specs || Object.keys(specs).length === 0) {
    container.innerHTML = "";
    return;
  }

  const rows = Object.entries(specs)
    .map(
      ([key, val]) => `
      <tr>
        <th>${key}</th>
        <td>${val}</td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <table class="specs-table">
      <caption>Specifications</caption>
      ${rows}
    </table>`;
}

function renderSuggested(product, allProducts) {
  const container = document.getElementById("suggested-section");
  if (!container) return;

  // Find products in same category, excluding current
  let similar = allProducts.filter(
    (p) =>
      p.product_id !== product.product_id &&
      p.category_top === product.category_top
  );

  // If not enough in same category, add random others
  if (similar.length < 4) {
    const others = allProducts.filter(
      (p) =>
        p.product_id !== product.product_id &&
        p.category_top !== product.category_top
    );
    similar = [...similar, ...others.sort(() => 0.5 - Math.random())];
  }

  const suggested = similar.slice(0, 4);

  if (suggested.length === 0) return;

  container.innerHTML = `
    <section class="suggested-section">
      <h2 class="suggested-section__title">Similar Products</h2>
      <div class="suggested-grid">
        ${suggested.map((p) => App.renderProductCard(p)).join("")}
      </div>
    </section>`;

  App.bindCardButtons(container);
}

function showError(message) {
  const container = document.getElementById("product-detail");
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">&#9888;&#65039;</div>
        <div class="empty-state__title">${message}</div>
        <div class="empty-state__text">The product you're looking for could not be found.</div>
        <a href="products.html" class="btn btn--primary">Browse All Products</a>
      </div>`;
  }
}
