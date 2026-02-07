/* ============================================
   GraingeSeek  Compare Page Logic
   Side-by-side product comparison table
   ============================================ */

App.onReady(async () => {
  App.initNav();

  const data = await App.loadData();

  // Check URL for shared compare IDs
  const params = App.getUrlParams();
  if (params.ids) {
    const sharedIds = params.ids.split(",");
    // Load these into compare
    sharedIds.forEach((id) => {
      if (!App.isInCompare(id) && App.getProductById(id)) {
        App.addToCompare(id);
      }
    });
  }

  renderCompare();

  // Bind events
  document.getElementById("clear-compare").addEventListener("click", () => {
    App.clearCompare();
    renderCompare();
  });

  document.getElementById("share-compare").addEventListener("click", () => {
    const ids = App.getCompareIds();
    if (ids.length === 0) {
      App.showToast("No products to share", "warning");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?ids=${ids.join(",")}`;
    navigator.clipboard.writeText(url).then(() => {
      App.showToast("Compare link copied to clipboard!");
    }).catch(() => {
      // Fallback
      prompt("Copy this link:", url);
    });
  });

  // Listen for compare updates
  window.addEventListener("compare-updated", () => renderCompare());
});

function renderCompare() {
  const container = document.getElementById("compare-content");
  if (!container) return;

  const ids = App.getCompareIds();

  if (ids.length === 0) {
    container.innerHTML = `
      <div class="compare-empty">
        <div class="compare-empty__icon">&#9878;</div>
        <p>No products added to compare yet.</p>
        <p>Browse products and click the compare button to add items.</p>
        <a href="products.html" class="btn btn--primary">Browse Products</a>
      </div>`;
    return;
  }

  const products = ids.map((id) => App.getProductById(id)).filter(Boolean);

  if (products.length === 0) {
    container.innerHTML = `
      <div class="compare-empty">
        <div class="compare-empty__icon">&#9888;&#65039;</div>
        <p>Could not find the compared products.</p>
        <a href="products.html" class="btn btn--primary">Browse Products</a>
      </div>`;
    return;
  }

  // Collect all spec keys across compared products
  const allSpecKeys = new Set();
  products.forEach((p) => {
    if (p.specs) {
      Object.keys(p.specs).forEach((k) => allSpecKeys.add(k));
    }
  });

  // Build comparison table
  let html = '<div class="compare-table-wrap"><table class="compare-table">';

  // Header row with product images & names
  html += "<thead><tr><th></th>";
  products.forEach((p) => {
    const imgSrc = p.image_url || "https://via.placeholder.com/120x120?text=No+Image";
    html += `<td class="compare-table__product-header">
      <img class="compare-table__product-img" src="${imgSrc}" alt="${p.title}"
           onerror="this.src='https://via.placeholder.com/120x120?text=No+Image'">
      <div class="compare-table__product-title">
        <a href="product.html?id=${p.product_id}">${p.title}</a>
      </div>
      <button class="btn btn--sm btn--secondary" onclick="App.removeFromCompare('${p.product_id}')">Remove</button>
    </td>`;
  });
  html += "</tr></thead>";

  // Body rows
  html += "<tbody>";

  // Standard fields
  const standardRows = [
    { label: "Brand", key: "brand" },
    { label: "Price", key: "price", format: (p) => p.price != null ? `$${p.price.toFixed(2)} ${p.price_unit || "/ each"}` : "Price unavailable" },
    { label: "Category", key: "category" },
    { label: "SKU", key: "grainger_part_number" },
    { label: "Model", key: "manufacturer_model" },
  ];

  standardRows.forEach((row) => {
    const values = products.map((p) => row.format ? row.format(p) : (p[row.key] || "N/A"));
    const allSame = values.every((v) => v === values[0]);
    html += `<tr>
      <th>${row.label}</th>
      ${values.map((v) => `<td class="${allSame ? "" : "compare-table__diff"}">${v}</td>`).join("")}
    </tr>`;
  });

  // Spec rows
  allSpecKeys.forEach((key) => {
    const values = products.map((p) => (p.specs && p.specs[key]) || "");
    const allSame = values.every((v) => v === values[0]);
    html += `<tr>
      <th>${key}</th>
      ${values.map((v) => `<td class="${allSame ? "" : "compare-table__diff"}">${v}</td>`).join("")}
    </tr>`;
  });

  // Action row
  html += `<tr><th>Actions</th>`;
  products.forEach((p) => {
    html += `<td>
      <button class="btn btn--primary btn--sm btn--full add-cart-cmp" data-id="${p.product_id}">&#128722; Add to Quote</button>
    </td>`;
  });
  html += "</tr>";

  html += "</tbody></table></div>";

  container.innerHTML = html;

  // Bind add-to-cart buttons
  container.querySelectorAll(".add-cart-cmp").forEach((btn) => {
    btn.addEventListener("click", () => {
      App.addToCart(btn.dataset.id);
    });
  });
}
