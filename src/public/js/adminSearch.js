(() => {
  const debounce = (fn, wait) => {
    let timeoutId;

    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), wait);
    };
  };

  const initAdminSearch = () => {
    const forms = document.querySelectorAll('[data-admin-search-form]');

    forms.forEach((form) => {
      const input = form.querySelector('[data-admin-search-input]');

      if (!input) {
        return;
      }

      const pageInput = form.querySelector('[data-admin-search-page]');
      const debounceMs = Number.parseInt(form.dataset.debounce || '400', 10);
      const wait = Number.isNaN(debounceMs) ? 400 : debounceMs;

      const submitSearch = () => {
        if (pageInput) {
          pageInput.value = '1';
        }

        form.submit();
      };

      const debouncedSubmit = debounce(submitSearch, wait);

      input.addEventListener('input', () => {
        debouncedSubmit();
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminSearch);
  } else {
    initAdminSearch();
  }
})();
