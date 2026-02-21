const addCategoryForm = document.getElementById('addCategoryForm');

if (addCategoryForm) {
  const categoryNameField = document.getElementById('categoryName');
  const categoryDescriptionField = document.getElementById(
    'categoryDescription'
  );

  const updateFieldMessage = (field) => {
    const feedback = field.parentElement?.querySelector('.invalid-feedback');
    if (!feedback) {
      return;
    }

    if (field.validity.valueMissing) {
      feedback.textContent =
        field.dataset.msgRequired || 'This field is required.';
      return;
    }

    if (!field.validity.valid) {
      feedback.textContent =
        field.dataset.msgInvalid || 'Please enter a valid value.';
    }
  };

  [categoryNameField, categoryDescriptionField].forEach((field) => {
    if (!field) {
      return;
    }
    field.addEventListener('input', () => updateFieldMessage(field));
    field.addEventListener('change', () => updateFieldMessage(field));
  });

  addCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    [categoryNameField, categoryDescriptionField].forEach((field) => {
      if (field) {
        updateFieldMessage(field);
      }
    });

    if (!addCategoryForm.checkValidity()) {
      addCategoryForm.classList.add('was-validated');
      return;
    }

    const categoryName = categoryNameField.value;
    const categoryDescription = categoryDescriptionField.value;

    try {
      const response = await fetch('/admin/category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
        }),
      });

      const result = await response.json();

      // Handle validation errors (400 status)
      if (response.status === 400 && result.errors) {
        // Display validation errors
        const errorMessages = result.errors.map((err) => err.msg).join('<br>');
        await Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: errorMessages,
        });
        return;
      }

      if (response.ok) {
        await Toast.fire({
          icon: 'success',
          title: result.message,
        });

        const modal = bootstrap.Modal.getInstance(
          document.getElementById('addCategoryModal')
        );
        modal.hide();
        addCategoryForm.reset();
        addCategoryForm.classList.remove('was-validated');

        window.location.reload();
      } else {
        Toast.fire({
          icon: 'error',
          title: result.message || 'An error occurred',
        });
      }
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: 'Something went wrong, please try again.',
      });
    }
  });
}

async function handleCategoryDelete(categoryId) {
  const confirmDelete = await window.adminConfirm.open({
    title: 'Archive Category',
    message: 'This category will be hidden and archived.',
    confirmText: 'Archive',
    variant: 'danger',
  });

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch(`/admin/category/delete/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      Toast.fire({
        icon: 'success',
        title: result.message || 'Category deleted successfully!',
      });

      window.location.reload();
    } else {
      Toast.fire({
        icon: 'error',
        title: result.message || 'Error deleting category',
      });
    }
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
    Toast.fire({
      icon: 'error',
      title: 'An error occurred while deleting the category.',
    });
  }
}
