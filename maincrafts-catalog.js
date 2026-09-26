/* ==========================================================================
   MAINCRAFTS TECHNOLOGY — catalog.js (Task 5)
   Product Catalog: search + category filter + sorting + pagination +
   product detail modal + add-to-cart.
   Cart Page: quantity update, remove item, totals.

   Relies on getCart() / saveCart() / updateCartBadge() / escapeHtml(),
   which live in maincrafts-script.js and are loaded before this file on
   every page that includes both scripts.
   ========================================================================== */

var PRODUCTS_JSON_URL = 'maincrafts-products.json';
var PRODUCTS_PER_PAGE = 8;

/* Category -> icon + accent color, used for the placeholder product thumbnails
   (no real product photography for this assignment, so a colored icon tile
   stands in for the image, per category). */
var CATEGORY_META = {
  'Electronics':    { icon: 'fa-microchip',           color: 'var(--cat-electronics)' },
  'Fashion':        { icon: 'fa-shirt',                color: 'var(--cat-fashion)' },
  'Home & Kitchen': { icon: 'fa-kitchen-set',          color: 'var(--cat-home)' },
  'Grocery':        { icon: 'fa-basket-shopping',      color: 'var(--cat-grocery)' },
  'Books':          { icon: 'fa-book',                 color: 'var(--cat-books)' },
  'Beauty':         { icon: 'fa-spray-can-sparkles',   color: 'var(--cat-beauty)' }
};

var catalogState = {
  all: [],
  search: '',
  category: 'all',
  sort: 'default',
  page: 1,
  perPage: PRODUCTS_PER_PAGE
};

document.addEventListener('DOMContentLoaded', function () {
  initCatalogPage(); // no-op if this page has no product grid
  initCartPage();     // no-op if this page has no cart list
});

/* ==========================================================================
   CATALOG PAGE
   ========================================================================== */
function initCatalogPage() {
  var gridEl = document.getElementById('productGrid');
  if (!gridEl) return; // not the catalog page

  var searchBox = document.getElementById('catalogSearch');
  var sortSelect = document.getElementById('catalogSort');

  if (searchBox) {
    searchBox.addEventListener('keyup', function () {
      catalogState.search = searchBox.value.trim().toLowerCase();
      catalogState.page = 1;
      renderCatalog();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      catalogState.sort = sortSelect.value;
      renderCatalog();
    });
  }

  var closeBtn = document.getElementById('modalClose');
  var overlay = document.getElementById('productModal');
  if (closeBtn) closeBtn.addEventListener('click', closeProductModal);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeProductModal();
    });
  }

  fetch(PRODUCTS_JSON_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      catalogState.all = data;
      renderCategoryPills(data);
      renderCatalog();
    })
    .catch(function () {
      gridEl.innerHTML = '<p style="grid-column:1/-1;">Couldn\'t load products. ' +
        'Make sure you\'re running this through a local server (e.g. Live Server) ' +
        'rather than opening the file directly.</p>';
    });
}

/* ---- Category filter pills, built from whatever categories exist in the data ---- */
function renderCategoryPills(products) {
  var wrap = document.getElementById('categoryPills');
  if (!wrap) return;

  var categories = ['all'];
  products.forEach(function (p) {
    if (categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  wrap.innerHTML = '';
  categories.forEach(function (cat) {
    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'filter-pill' + (cat === catalogState.category ? ' is-active' : '');
    pill.textContent = cat === 'all' ? 'All Categories' : cat;
    pill.addEventListener('click', function () {
      catalogState.category = cat;
      catalogState.page = 1;
      wrap.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('is-active'); });
      pill.classList.add('is-active');
      renderCatalog();
    });
    wrap.appendChild(pill);
  });
}

/* ---- Search + Filter + Sort, then render the current page ---- */
function applyFilters() {
  var results = catalogState.all.slice();

  if (catalogState.search) {
    results = results.filter(function (p) {
      return p.title.toLowerCase().indexOf(catalogState.search) !== -1;
    });
  }

  if (catalogState.category !== 'all') {
    results = results.filter(function (p) { return p.category === catalogState.category; });
  }

  if (catalogState.sort === 'price-asc') {
    results.sort(function (a, b) { return a.price - b.price; });
  } else if (catalogState.sort === 'price-desc') {
    results.sort(function (a, b) { return b.price - a.price; });
  } else if (catalogState.sort === 'name-asc') {
    results.sort(function (a, b) { return a.title.localeCompare(b.title); });
  } else if (catalogState.sort === 'name-desc') {
    results.sort(function (a, b) { return b.title.localeCompare(a.title); });
  }

  return results;
}

function renderCatalog() {
  var gridEl = document.getElementById('productGrid');
  var emptyEl = document.getElementById('catalogEmpty');
  var metaEl = document.getElementById('catalogMeta');
  if (!gridEl) return;

  var results = applyFilters();
  var total = results.length;

  var totalPages = Math.max(1, Math.ceil(total / catalogState.perPage));
  if (catalogState.page > totalPages) catalogState.page = totalPages;

  var start = (catalogState.page - 1) * catalogState.perPage;
  var pageItems = results.slice(start, start + catalogState.perPage);

  gridEl.innerHTML = '';

  if (metaEl) {
    if (total === 0) {
      metaEl.textContent = 'No products match your search.';
    } else {
      metaEl.innerHTML = 'Showing <strong>' + (start + 1) + '&ndash;' +
        Math.min(start + catalogState.perPage, total) + '</strong> of <strong>' + total + '</strong> products';
    }
  }

  if (total === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    renderPagination(0);
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  pageItems.forEach(function (product) {
    gridEl.appendChild(buildProductCard(product));
  });

  renderPagination(total);
}

function buildProductCard(product) {
  var meta = CATEGORY_META[product.category] || { icon: 'fa-box', color: 'var(--ink)' };
  var card = document.createElement('article');
  card.className = 'product-card';

  var thumb = document.createElement('div');
  thumb.className = 'product-thumb';
  thumb.style.background = meta.color;
  thumb.innerHTML = '<i class="fa-solid ' + meta.icon + '"></i>';
  thumb.addEventListener('click', function () { openProductModal(product.id); });
  card.appendChild(thumb);

  var body = document.createElement('div');
  body.className = 'product-body';

  var tag = document.createElement('span');
  tag.className = 'product-cat-tag';
  tag.textContent = product.category;
  body.appendChild(tag);

  var title = document.createElement('h3');
  title.className = 'product-title';
  title.textContent = product.title;
  title.addEventListener('click', function () { openProductModal(product.id); });
  body.appendChild(title);

  var rating = document.createElement('div');
  rating.className = 'product-rating';
  rating.innerHTML = '<i class="fa-solid fa-star"></i>' + product.rating.toFixed(1);
  body.appendChild(rating);

  var footer = document.createElement('div');
  footer.className = 'product-footer';

  var price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = '\u20B9' + product.price.toLocaleString('en-IN');
  footer.appendChild(price);

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'product-add-btn';
  addBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add';
  addBtn.addEventListener('click', function () {
    addToCart(product, 1);
    addBtn.classList.add('is-added');
    addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
    window.setTimeout(function () {
      addBtn.classList.remove('is-added');
      addBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add';
    }, 1200);
  });
  footer.appendChild(addBtn);

  body.appendChild(footer);
  card.appendChild(body);

  return card;
}

/* ---- Pagination controls ---- */
function renderPagination(totalItems) {
  var pagEl = document.getElementById('pagination');
  if (!pagEl) return;

  var totalPages = Math.ceil(totalItems / catalogState.perPage);
  pagEl.innerHTML = '';
  if (totalPages <= 1) return;

  var prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  prevBtn.disabled = catalogState.page === 1;
  prevBtn.addEventListener('click', function () { goToPage(catalogState.page - 1); });
  pagEl.appendChild(prevBtn);

  for (var i = 1; i <= totalPages; i++) {
    (function (pageNum) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn' + (pageNum === catalogState.page ? ' is-active' : '');
      btn.textContent = pageNum;
      btn.addEventListener('click', function () { goToPage(pageNum); });
      pagEl.appendChild(btn);
    })(i);
  }

  var nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  nextBtn.disabled = catalogState.page === totalPages;
  nextBtn.addEventListener('click', function () { goToPage(catalogState.page + 1); });
  pagEl.appendChild(nextBtn);
}

function goToPage(pageNum) {
  catalogState.page = pageNum;
  renderCatalog();
  var gridEl = document.getElementById('productGrid');
  if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- Product detail modal ---- */
function openProductModal(id) {
  var product = catalogState.all.find(function (p) { return p.id === id; });
  if (!product) return;

  var overlay = document.getElementById('productModal');
  var body = document.getElementById('modalBody');
  if (!overlay || !body) return;

  var meta = CATEGORY_META[product.category] || { icon: 'fa-box', color: 'var(--ink)' };

  body.innerHTML =
    '<div class="modal-thumb" style="background:' + meta.color + ';"><i class="fa-solid ' + meta.icon + '"></i></div>' +
    '<div class="modal-body">' +
      '<span class="product-cat-tag">' + escapeHtml(product.category) + '</span>' +
      '<h3>' + escapeHtml(product.title) + '</h3>' +
      '<div class="product-rating"><i class="fa-solid fa-star"></i>' + product.rating.toFixed(1) + ' rating</div>' +
      '<p class="modal-desc">' + escapeHtml(product.description) + '</p>' +
      '<div class="modal-price-row">' +
        '<span class="product-price">\u20B9' + product.price.toLocaleString('en-IN') + '</span>' +
        '<button type="button" class="btn btn-primary" id="modalAddBtn"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>' +
      '</div>' +
    '</div>';

  document.getElementById('modalAddBtn').addEventListener('click', function () {
    addToCart(product, 1);
    closeProductModal();
  });

  overlay.classList.add('is-open');
}

function closeProductModal() {
  var overlay = document.getElementById('productModal');
  if (overlay) overlay.classList.remove('is-open');
}

/* ---- Add to cart (LocalStorage) ---- */
function addToCart(product, qty) {
  var cart = getCart();
  var idx = cart.findIndex(function (item) { return item.id === product.id; });

  if (idx !== -1) {
    cart[idx].qty += qty;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      category: product.category,
      qty: qty
    });
  }

  saveCart(cart);
  updateCartBadge();
  renderCart(); // safe no-op if the cart list isn't on this page
}

/* ==========================================================================
   CART PAGE
   ========================================================================== */
function initCartPage() {
  var listEl = document.getElementById('cartList');
  if (!listEl) return; // not the cart page
  renderCart();
}

function renderCart() {
  var listEl = document.getElementById('cartList');
  var emptyEl = document.getElementById('cartEmpty');
  var summaryEl = document.getElementById('cartSummary');
  if (!listEl) return; // not the cart page

  var cart = getCart();
  listEl.innerHTML = '';

  if (cart.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (summaryEl) summaryEl.style.display = 'block';

  var subtotal = 0;
  var totalQty = 0;

  cart.forEach(function (item) {
    var meta = CATEGORY_META[item.category] || { icon: 'fa-box', color: 'var(--ink)' };
    var lineTotal = item.price * item.qty;
    subtotal += lineTotal;
    totalQty += item.qty;

    var row = document.createElement('div');
    row.className = 'cart-row';

    row.innerHTML =
      '<div class="cart-thumb" style="background:' + meta.color + ';"><i class="fa-solid ' + meta.icon + '"></i></div>' +
      '<div class="cart-row-main">' +
        '<div class="cart-row-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="cart-row-cat">' + escapeHtml(item.category) + '</div>' +
        '<div class="cart-row-unit">\u20B9' + item.price.toLocaleString('en-IN') + ' each</div>' +
      '</div>' +
      '<div class="qty-stepper">' +
        '<button type="button" data-action="dec">&minus;</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" data-action="inc">+</button>' +
      '</div>' +
      '<div class="cart-row-total">\u20B9' + lineTotal.toLocaleString('en-IN') + '</div>' +
      '<button type="button" class="cart-row-remove" title="Remove"><i class="fa-solid fa-trash"></i></button>';

    row.querySelector('[data-action="dec"]').addEventListener('click', function () {
      changeCartQty(item.id, -1);
    });
    row.querySelector('[data-action="inc"]').addEventListener('click', function () {
      changeCartQty(item.id, 1);
    });
    row.querySelector('.cart-row-remove').addEventListener('click', function () {
      removeCartItem(item.id);
    });

    listEl.appendChild(row);
  });

  var subtotalEl = document.getElementById('cartSubtotal');
  var qtyEl = document.getElementById('cartItemCount');
  var totalEl = document.getElementById('cartTotal');
  if (subtotalEl) subtotalEl.textContent = '\u20B9' + subtotal.toLocaleString('en-IN');
  if (qtyEl) qtyEl.textContent = totalQty;
  if (totalEl) totalEl.textContent = '\u20B9' + subtotal.toLocaleString('en-IN');
}

function changeCartQty(id, delta) {
  var cart = getCart();
  var idx = cart.findIndex(function (item) { return item.id === id; });
  if (idx === -1) return;

  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) {
    cart.splice(idx, 1);
  }

  saveCart(cart);
  updateCartBadge();
  renderCart();
}

function removeCartItem(id) {
  var cart = getCart().filter(function (item) { return item.id !== id; });
  saveCart(cart);
  updateCartBadge();
  renderCart();
}

function clearCart() {
  saveCart([]);
  updateCartBadge();
  renderCart();
}
