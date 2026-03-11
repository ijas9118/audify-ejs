// ─── List state ───────────────────────────────────────────────────────────────
let _debounceTimer = null;
let currentPage = 1;
let pageSize = 12;
let totalProducts = 0;
let hasMorePages = false;
let isLoading = false;
let requestVersion = 0;
let sliderResetInProgress = false;
let infiniteObserver = null;

function debouncedSearch() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(applyFilters, 400);
}

function getFilters() {
  return {
    q: (document.getElementById('search-input')?.value || '').trim(),
    category: document.getElementById('filter-category')?.value || '',
    minPrice: document.getElementById('filter-minPrice')?.value || '0',
    maxPrice: document.getElementById('filter-maxPrice')?.value || '10000',
    sortBy: document.getElementById('filter-sort')?.value || 'new',
  };
}

function toggleMainSpinner(show) {
  const spinner = document.getElementById('search-spinner');
  if (spinner) spinner.classList.toggle('d-none', !show);
}

function toggleInfiniteLoader(show) {
  const loader = document.getElementById('infinite-scroll-loader');
  if (loader) loader.classList.toggle('d-none', !show);
}

function updateResultCount(total) {
  const countEl = document.getElementById('result-count');
  if (!countEl) return;

  countEl.textContent =
    total > 0 ? `${total} product${total === 1 ? '' : 's'} found` : '';
}

function toggleResultsState(total) {
  const noResults = document.getElementById('no-results');
  const grid = document.getElementById('search-results');
  const sentinel = document.getElementById('infinite-scroll-sentinel');

  if (noResults) noResults.classList.toggle('d-none', total > 0);
  if (grid) grid.classList.toggle('d-none', total === 0);
  if (sentinel)
    sentinel.classList.toggle('d-none', total === 0 || !hasMorePages);
}

function buildParams(page) {
  return new URLSearchParams({
    ...getFilters(),
    page: String(page),
    limit: String(pageSize),
  }).toString();
}

async function fetchProductsPage(page, { append }) {
  if (append && isLoading) return;

  const currentRequest = ++requestVersion;
  isLoading = true;

  if (append) {
    toggleInfiniteLoader(true);
  } else {
    toggleMainSpinner(true);
  }

  try {
    const response = await fetch(`/shop/products?${buildParams(page)}`);
    if (!response.ok) throw new Error('Server error');

    const data = await response.json();

    // Ignore stale responses from older filter requests.
    if (currentRequest !== requestVersion) return;

    const products = data.products || [];
    currentPage = Number(data.currentPage) || page;
    totalProducts = Number(data.total) || 0;
    hasMorePages = Boolean(data.hasMore);

    renderProductCards(products, { append });
    updateResultCount(totalProducts);
    toggleResultsState(totalProducts);
  } catch (err) {
    console.error('Filter error:', err);
    const countEl = document.getElementById('result-count');
    if (countEl) countEl.textContent = 'Error loading products.';
  } finally {
    if (currentRequest === requestVersion) {
      isLoading = false;
      toggleMainSpinner(false);
      toggleInfiniteLoader(false);
    }
  }
}

async function applyFilters() {
  currentPage = 1;
  hasMorePages = false;
  await fetchProductsPage(1, { append: false });
}

async function loadNextPage() {
  if (!hasMorePages || isLoading) return;
  await fetchProductsPage(currentPage + 1, { append: true });
}

function renderProductCards(products, { append = false } = {}) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (!append && products.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = products
    .map((p) => {
      const isOos = p.isOutOfStock || p.stock === 0;
      const hasOffer = p.discountedPrice && p.discountedPrice < p.price;

      const offerBadge = (() => {
        const offer = p.productOfferDetails || p.categoryOfferDetails;
        if (!offer || !hasOffer) return '';
        const label =
          offer.discountType === 'percentage'
            ? `-${offer.discountValue}%`
            : `-₹${Number(offer.discountValue).toFixed(2)}`;
        return `<span class="product-badge">${label}</span>`;
      })();

      const priceHtml = hasOffer
        ? `<span class="product-price">₹${p.discountedPrice.toFixed(2)}</span>
           <span class="product-price-original">₹${p.price.toFixed(2)}</span>`
        : `<span class="product-price">₹${p.price.toFixed(2)}</span>`;

      const stockClass = isOos ? 'out-of-stock' : 'in-stock';
      const stockText = isOos ? 'Out of Stock' : `${p.stock} Available`;

      const cardClass = isOos
        ? 'product-card h-100 is-out-of-stock'
        : 'product-card h-100';
      const btnDisabled = isOos ? 'disabled' : '';

      return `
      <div class="col">
        <div class="${cardClass}">
          <a href="/shop/product/${p._id}" class="text-decoration-none">
            <div class="product-img-wrap">
              ${offerBadge}
              <img src="${p.images?.main || ''}" alt="${p.name}" />
            </div>
          </a>
          <div class="product-info">
            <div class="product-name">
              <a href="/shop/product/${p._id}">${p.name}</a>
            </div>
            <div class="d-flex align-items-baseline">${priceHtml}</div>
            <div class="mt-auto pt-2">
              <span class="product-stock ${stockClass}">${stockText}</span>
            </div>
          </div>
          <div class="product-actions">
            <button class="btn-add-cart ${btnDisabled}" onclick="addToCart('${p._id}')">
              <i class="fas fa-shopping-bag"></i> Add to Cart
            </button>
            <button class="btn-wishlist" onclick="addToWishList('${p._id}')" title="Add to wishlist">
              <i class="far fa-heart"></i>
            </button>
          </div>
        </div>
      </div>`;
    })
    .join('');

  if (append) {
    container.insertAdjacentHTML('beforeend', html);
  } else {
    container.innerHTML = html;
  }
}

function clearFilters() {
  const searchInput = document.getElementById('search-input');
  const catSelect = document.getElementById('filter-category');
  const sortSelect = document.getElementById('filter-sort');

  if (searchInput) searchInput.value = '';
  if (catSelect) catSelect.value = '';
  if (sortSelect) sortSelect.value = 'new';

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

    const slider = document.getElementById('price-slider');
    if (slider && slider.noUiSlider) {
      sliderResetInProgress = true;
      slider.noUiSlider.set([min, max]);
      setTimeout(() => {
        sliderResetInProgress = false;
      }, 0);
    }
  }

  applyFilters();
  if (window.innerWidth < 992) {
    closeFilterDrawer();
  }
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('infinite-scroll-sentinel');
  if (!sentinel) return;

  if (infiniteObserver) {
    infiniteObserver.disconnect();
  }

  infiniteObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadNextPage();
        }
      });
    },
    {
      root: null,
      rootMargin: '220px 0px',
      threshold: 0,
    }
  );

  infiniteObserver.observe(sentinel);
}

function initFromServerState() {
  const config = document.getElementById('shop-pagination-config');
  if (!config) return;

  totalProducts = Number(config.dataset.totalProducts) || 0;
  currentPage = Number(config.dataset.currentPage) || 1;
  pageSize = Number(config.dataset.pageSize) || 12;
  hasMorePages = config.dataset.hasMore === 'true';

  updateResultCount(totalProducts);
  toggleResultsState(totalProducts);
}

document.addEventListener('DOMContentLoaded', () => {
  initFromServerState();
  setupInfiniteScroll();

  const sliderEl = document.getElementById('price-slider');
  const sliderConfig = document.getElementById('slider-config');
  if (!sliderEl || !sliderConfig || typeof noUiSlider === 'undefined') return;

  const globalMin = parseFloat(sliderConfig.dataset.minPrice) || 0;
  const globalMax = parseFloat(sliderConfig.dataset.maxPrice) || 10000;
  const rangeMin = Math.min(globalMin, globalMax);
  const rangeMax = Math.max(globalMin, globalMax);

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
    const minPriceValue = document.getElementById('minPriceValue');
    const maxPriceValue = document.getElementById('maxPriceValue');
    const minPriceInput = document.getElementById('filter-minPrice');
    const maxPriceInput = document.getElementById('filter-maxPrice');

    if (minPriceValue) minPriceValue.textContent = `₹${minVal}`;
    if (maxPriceValue) maxPriceValue.textContent = `₹${maxVal}`;
    if (minPriceInput) minPriceInput.value = minVal;
    if (maxPriceInput) maxPriceInput.value = maxVal;
  });

  sliderEl.noUiSlider.on('change', () => {
    if (!sliderResetInProgress) {
      applyFilters();
    }
  });
});

// ─── Mobile filter drawer ────────────────────────────────────────────────────
function openFilterDrawer() {
  const col = document.getElementById('filterCol');
  const backdrop = document.getElementById('filterBackdrop');
  if (col) col.classList.add('is-open');
  if (backdrop) backdrop.classList.add('is-visible');
  document.body.classList.add('filter-drawer-open');
}

function closeFilterDrawer() {
  const col = document.getElementById('filterCol');
  const backdrop = document.getElementById('filterBackdrop');
  if (col) col.classList.remove('is-open');
  if (backdrop) backdrop.classList.remove('is-visible');
  document.body.classList.remove('filter-drawer-open');
}
