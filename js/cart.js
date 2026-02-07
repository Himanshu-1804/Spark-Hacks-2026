/* ============================================
   Shop Savvy — Cart / Quote Builder Page Logic
   ============================================ */

App.onReady(async () => {
  App.initNav();
  await App.loadData();
  renderCart();

  // Listen for cart updates
  window.addEventListener("cart-updated", () => renderCart());
});

function renderCart() {
  const container = document.getElementById("cart-content");
  if (!container) return;

  const cartItems = App.getCart();

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">&#128722;</div>
        <h2>Your quote list is empty</h2>
        <p style="margin: 12px 0 24px; color: var(--color-text-light);">Browse products and add items to build your quote.</p>
        <a href="products.html" class="btn btn--primary">Browse Products</a>
      </div>`;
    return;
  }

  // Resolve products
  const items = cartItems
    .map((item) => {
      const product = App.getProductById(item.id);
      if (!product) return null;
      return { ...product, qty: item.qty };
    })
    .filter(Boolean);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">&#9888;&#65039;</div>
        <h2>Could not load cart items</h2>
        <a href="products.html" class="btn btn--primary">Browse Products</a>
      </div>`;
    return;
  }

  // Calculate totals
  let subtotal = 0;
  let itemsWithPrice = 0;
  items.forEach((item) => {
    if (item.price != null) {
      subtotal += item.price * item.qty;
      itemsWithPrice++;
    }
  });

  // Build cart HTML
  let cartHTML = `<div class="cart-layout">`;

  // Items list
  cartHTML += `<div class="cart-items">
    <div class="cart-items__header">Items (${items.length})</div>`;

  items.forEach((item) => {
    const imgSrc = item.image_url || "https://via.placeholder.com/80x80?text=No+Image";
    const itemPrice = item.price != null ? `$${item.price.toFixed(2)}` : "N/A";
    const lineTotal = item.price != null ? `$${(item.price * item.qty).toFixed(2)}` : "N/A";

    cartHTML += `
      <div class="cart-item">
        <img class="cart-item__image" src="${imgSrc}" alt="${item.title}"
             onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
        <div class="cart-item__info">
          <div class="cart-item__title">
            <a href="product.html?id=${item.product_id}">${item.title}</a>
          </div>
          <div class="cart-item__sku">SKU: ${item.grainger_part_number || "N/A"} &middot; ${itemPrice} ${item.price_unit || "/ each"}</div>
        </div>
        <div class="cart-item__qty">
          <label for="qty-${item.product_id}" class="sr-only">Quantity</label>
          <input type="number" id="qty-${item.product_id}" value="${item.qty}" min="1"
                 class="qty-input" data-id="${item.product_id}" aria-label="Quantity for ${item.title}">
        </div>
        <div class="cart-item__price">${lineTotal}</div>
        <button class="cart-item__remove remove-btn" data-id="${item.product_id}"
                aria-label="Remove ${item.title}" title="Remove">&times;</button>
      </div>`;
  });

  cartHTML += `</div>`;

  // Summary
  cartHTML += `
    <div class="cart-summary">
      <div class="cart-summary__title">Quote Summary</div>
      <div class="cart-summary__row">
        <span>Items</span>
        <span>${items.length}</span>
      </div>
      <div class="cart-summary__row">
        <span>Total Quantity</span>
        <span>${items.reduce((sum, i) => sum + i.qty, 0)}</span>
      </div>
      ${itemsWithPrice < items.length
        ? `<div class="cart-summary__row" style="color: var(--color-warning); font-size: 0.8rem;">
             <span>${items.length - itemsWithPrice} item(s) without pricing</span>
           </div>`
        : ""}
      <div class="cart-summary__total">
        <span>Estimated Total</span>
        <span>$${subtotal.toFixed(2)}</span>
      </div>
      <div class="cart-summary__actions">
        <button class="btn btn--primary btn--full" id="export-csv-btn">&#128196; Export as CSV</button>
        <button class="btn btn--secondary btn--full" id="clear-cart-btn">Clear List</button>
      </div>
      <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 12px; text-align: center;">
        This is a quote builder only. No real checkout.
      </p>
    </div>`;

  cartHTML += `</div>`;

  container.innerHTML = cartHTML;

  // Bind events
  bindCartEvents(items);
}

function bindCartEvents(items) {
  // Quantity changes
  document.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.id;
      const qty = parseInt(input.value) || 1;
      App.updateCartQty(id, qty);
      renderCart();
    });
  });

  // Remove buttons
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      App.removeFromCart(btn.dataset.id);
      App.showToast("Item removed from list");
      renderCart();
    });
  });

  // Clear cart
  const clearBtn = document.getElementById("clear-cart-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Clear all items from your quote list?")) {
        App.clearCart();
        renderCart();
      }
    });
  }

  // Export CSV
  const exportBtn = document.getElementById("export-csv-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => exportCartCSV(items));
  }
}

function exportCartCSV(items) {
  const headers = ["SKU", "Title", "Brand", "Category", "Price", "Price Unit", "Quantity", "Line Total"];
  const rows = items.map((item) => [
    item.grainger_part_number || "N/A",
    `"${item.title.replace(/"/g, '""')}"`,
    item.brand || "N/A",
    `"${item.category.replace(/"/g, '""')}"`,
    item.price != null ? item.price.toFixed(2) : "N/A",
    item.price_unit || "/ each",
    item.qty,
    item.price != null ? (item.price * item.qty).toFixed(2) : "N/A",
  ]);

  // Add total row
  const total = items.reduce((sum, i) => sum + (i.price != null ? i.price * i.qty : 0), 0);
  rows.push(["", "", "", "", "", "", "TOTAL", total.toFixed(2)]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `shop-savvy-quote-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  App.showToast("CSV exported successfully!");
}
