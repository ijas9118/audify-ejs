(() => {
  const modalEl = document.getElementById('adminConfirmModal');
  if (!modalEl || !window.bootstrap) return;

  const titleEl = document.getElementById('adminConfirmModalTitle');
  const messageEl = document.getElementById('adminConfirmModalMessage');
  const confirmBtn = document.getElementById('adminConfirmModalSubmit');
  const modal = new bootstrap.Modal(modalEl);

  const setVariantClass = (variant) => {
    confirmBtn.classList.remove(
      'admin-action-btn-danger',
      'admin-action-btn-success',
      'admin-action-btn-secondary'
    );
    if (variant === 'success') {
      confirmBtn.classList.add('admin-action-btn-success');
      return;
    }
    if (variant === 'secondary') {
      confirmBtn.classList.add('admin-action-btn-secondary');
      return;
    }
    confirmBtn.classList.add('admin-action-btn-danger');
  };

  const open = ({
    title = 'Confirm Action',
    message = 'Are you sure you want to continue?',
    confirmText = 'Confirm',
    variant = 'danger',
  } = {}) =>
    new Promise((resolve) => {
      let handled = false;

      titleEl.textContent = title;
      messageEl.textContent = message;
      confirmBtn.textContent = confirmText;
      setVariantClass(variant);

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        modalEl.removeEventListener('hidden.bs.modal', handleHidden);
      };

      const handleConfirm = () => {
        handled = true;
        cleanup();
        modal.hide();
        resolve(true);
      };

      const handleHidden = () => {
        cleanup();
        if (!handled) resolve(false);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      modalEl.addEventListener('hidden.bs.modal', handleHidden);
      modal.show();
    });

  window.adminConfirm = { open };

  document.addEventListener(
    'submit',
    async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.dataset.confirm !== 'true') return;

      event.preventDefault();

      const confirmed = await open({
        title: form.dataset.confirmTitle || 'Confirm Action',
        message:
          form.dataset.confirmMessage || 'Are you sure you want to continue?',
        confirmText: form.dataset.confirmText || 'Confirm',
        variant: form.dataset.confirmVariant || 'danger',
      });

      if (confirmed) {
        form.submit();
      }
    },
    true
  );
})();
