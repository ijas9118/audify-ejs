// ─── Debounce helper ─────────────────────────────────────────────────────────
let _debounceTimer = null;
function debouncedSearch() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(applyFilters, 400); // 400 ms debounce
}

// ─── Read current filter state from sidebar controls ─────────────────────────
function getFilters() {
  return {
    q: (document.getElementById('search-input')?.value || '').trim(),
    category: document.getElementById('filter-category')?.value || '',
    minPrice: document.getElementById('filter-minPrice')?.value || '0',
    maxPrice: document.getElementById('filter-maxPrice')?.value || '10000',
    sortBy: document.getElementById('filter-sort')?.value || 'new',
  };
}

// ─── Main: fetch products from server and re-render ──────────────────────────
async function applyFilters() {
  const filters = getFilters();
  const params = new URLSearchParams(filters).toString();

  const spinner = document.getElementById('search-spinner');
  const countEl = document.getElementById('result-count');
  const noResults = document.getElementById('no-results');
  const grid = document.getElementById('search-results');

  if (spinner) spinner.classList.remove('d-none');

  try {
    const response = await fetch(`/shop/products?${params}`);
    if (!response.ok) throw new Error('Server error');

    const data = await response.json();
    const products = data.products || [];

    renderProductCards(products);

    // Result count
    if (countEl) {
      countEl.textContent =
        products.length === 0
          ? ''
          : `${products.length} product${products.length === 1 ? '' : 's'} found`;
    }

    // Toggle empty state
    if (noResults) {
      noResults.classList.toggle('d-none', products.length > 0);
    }
    if (grid) {
      grid.classList.toggle('d-none', products.length === 0);
    }
  } catch (err) {
    console.error('Filter error:', err);
    if (countEl) countEl.textContent = 'Error loading products.';
  } finally {
    if (spinner) spinner.classList.add('d-none');
  }
}

// ─── Render product cards into #search-results ───────────────────────────────
function renderProductCards(products) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Build all HTML first, then set once (avoids O(n²) innerHTML += pattern)
  const html = products
    .map((p) => {
      const isOos = p.isOutOfStock || p.stock === 0;
      const hasOffer = p.discountedPrice && p.discountedPrice < p.price;

      // Offer badge
      const offerEmoji = (() => {
        const offer = p.productOfferDetails || p.categoryOfferDetails;
        if (!offer || !hasOffer) return '';
        const label =
          offer.discountType === 'percentage'
            ? `-${offer.discountValue}%`
            : `-₹${Number(offer.discountValue).toFixed(2)}`;
        return `<span class="badge bg-danger position-absolute top-0 start-0 m-2">${label}</span>`;
      })();

      // Price display
      const priceHtml = hasOffer
        ? `<h6 class="card-price mb-0">₹${p.discountedPrice.toFixed(2)}</h6>
         <span class="text-muted small ms-1"><del>₹${p.price.toFixed(2)}</del></span>`
        : `<h6 class="card-price mb-0">₹${p.price.toFixed(2)}</h6>`;

      const stockHtml = isOos
        ? '<span class="text-danger small">Out of Stock</span>'
        : `<span class="text-success small">${p.stock} Available</span>`;

      const cardClass = isOos
        ? 'card h-100 shadow-sm border-1 out-of-stock'
        : 'card h-100 shadow-sm border-1';
      const btnDisabled = isOos ? 'disabled' : '';

      return `
      <div class="col">
        <div class="${cardClass}">
          <div class="position-relative">
            <a href="/shop/product/${p._id}" class="card-link">
              ${offerEmoji}
              <img
                src="${p.images?.main || ''}"
                class="card-img-top img-fluid"
                style="height: 200px; object-fit: contain"
                alt="${p.name}"
              />
            </a>
          </div>
          <div class="card-body">
            <h5 class="card-title text-truncate">${p.name}</h5>
            <div class="d-flex align-items-center gap-2">${priceHtml}</div>
            <div class="mt-1">${stockHtml}</div>
          </div>
          <div class="card-footer bg-white border-0">
            <div class="btn-group w-100" role="group">
              <button class="btn btn-dark-purple w-100 ${btnDisabled}" onclick="addToCart('${p._id}')">
                Add to Cart
              </button>
              <button class="btn btn-outline-dark-purple w-100" onclick="addToWishList('${p._id}')">
                <i class="fas fa-heart"></i> Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join('');

  container.innerHTML = html;
}

// ─── Reset all filters ───────────────────────────────────────────────────────
function clearFilters() {
  const searchInput = document.getElementById('search-input');
  const catSelect = document.getElementById('filter-category');
  const sortSelect = document.getElementById('filter-sort');

  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = '';
  if (sortSelect) sortSelect.value = 'new';

  // Reset price slider to full range
  const sliderConfig = document.getElementById('slider-config');
  if (sliderConfig) {
    const min = parseFloat(sliderConfig.dataset.minPrice) || 0;
    const max = parseFloat(sliderConfig.dataset.maxPrice) || 10000;
    const minEl = document.getElementById('filter-minPrice');
    const maxEl = document.getElementById('filter-maxPrice');
    const minLabel = document.getElementById('minPriceValue');
    const maxLabel = document.getElementById('maxPriceValue');
    if (minEl) minEl.value = min;
    if (maxEl) maxEl.value = max;
    if (minLabel) minLabel.textContent = `₹${min}`;
    if (maxLabel) maxLabel.textContent = `₹${max}`;

    // Reset noUiSlider if it is attached
    const slider = document.getElementById('price-slider');
    if (slider && slider.noUiSlider) {
      slider.noUiSlider.set([min, max]);
    }
  }

  applyFilters();
}

// ─── noUiSlider initialisation ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sliderEl = document.getElementById('price-slider');
  const sliderConfig = document.getElementById('slider-config');
  if (!sliderEl || !sliderConfig || typeof noUiSlider === 'undefined') return;

  const globalMin = parseFloat(sliderConfig.dataset.minPrice) || 0;
  const globalMax = parseFloat(sliderConfig.dataset.maxPrice) || 10000;
  const rangeMin = Math.min(globalMin, globalMax);
  const rangeMax = Math.max(globalMin, globalMax);

  // Avoid duplicate initialisation errors if another script touched this element.
  if (sliderEl.noUiSlider) {
    sliderEl.noUiSlider.destroy();
  }

  noUiSlider.create(sliderEl, {
    start: [rangeMin, rangeMax],
    connect: true,
    range: { min: rangeMin, max: rangeMax },
    step: 50,
    format: {
      to: (v) => Math.round(v),
      from: (v) => Number(v),
    },
  });

  sliderEl.noUiSlider.on('update', ([minVal, maxVal]) => {
    document.getElementById('minPriceValue').textContent = `₹${minVal}`;
    document.getElementById('maxPriceValue').textContent = `₹${maxVal}`;
    document.getElementById('filter-minPrice').value = minVal;
    document.getElementById('filter-maxPrice').value = maxVal;
  });

  // Only fire search when user finishes dragging (not on every pixel move)
  sliderEl.noUiSlider.on('change', () => applyFilters());
});
